import type { FixedLink, Hop, Landmass, Location, Position, Segment, SegmentKind } from '@packet-voyage/schema';
import { crossesWater, haversineKm, landmassAt } from '../geo/index.ts';
import type { SegmentContext, SegmentWithContext } from '../cables/index.ts';
import type { Settings } from '../settings.ts';

/**
 * Minimal hop shape compatible with both `LocateResult.hops` (`{ hop, location }`)
 * and direct `Hop` records when callers pass located hops.
 */
export interface LocatedHop {
  hop: Hop;
  location: Location | null;
}

const FIXED_LINK_TOLERANCE_KM = 150;

/**
 * Classifies the physical nature of a crossing between two positions (§7.9).
 *
 * - Same coordinates or distance `< settings.localKm` => `'local'`
 * - Same landmass and geodesic stays on land => `'undetermined'`
 * - Different landmasses or crosses water => `'sea'`
 *
 * Note: fixed-link promotion to `'sea-or-fixed'` requires the `links` table
 * and is applied by `buildSegments` (or `classifySegment`).
 */
export function segmentKind(
  a: Position,
  b: Position,
  masses: Landmass[],
  settings: Settings,
): SegmentKind {
  const distKm = haversineKm(a, b);
  if (distKm < settings.localKm) {
    return 'local';
  }
  if (masses.length === 0) {
    return 'undetermined';
  }
  const massA = landmassAt(a, masses);
  const massB = landmassAt(b, masses);
  if (massA !== null && massB !== null && massA.id === massB.id) {
    return crossesWater(a, b, masses) ? 'sea' : 'undetermined';
  }
  return 'sea';
}

function endpointMatchesEndpoint(p: Position, q: Position): boolean {
  return haversineKm(p, q) <= FIXED_LINK_TOLERANCE_KM;
}

/**
 * Finds the first deterministic fixed link joining `a` and `b` across distinct landmasses.
 */
export function findFixedLink(
  a: Position,
  b: Position,
  links: FixedLink[],
): FixedLink | null {
  const sorted = [...links].sort((x, y) => x.id.localeCompare(y.id));
  for (const link of sorted) {
    const forward = endpointMatchesEndpoint(a, link.a) && endpointMatchesEndpoint(b, link.b);
    const reverse = endpointMatchesEndpoint(a, link.b) && endpointMatchesEndpoint(b, link.a);
    if (forward || reverse) {
      return link;
    }
  }
  return null;
}

/**
 * Resolves segment nature and optional fixed link name for two endpoints (§7.9, VOY-F-22, VOY-F-25).
 */
/**
 * An endpoint of a crossing: a located hop, or the declared departure (which
 * has coordinates and maybe a name, but no confidence level of its own).
 */
export interface CrossingEndpoint extends Position {
  city?: string;
  country?: string | null;
}

function sameCityName(a: CrossingEndpoint, b: CrossingEndpoint): boolean {
  if (!a.city || !b.city) return false;
  return a.city.trim().toLowerCase() === b.city.trim().toLowerCase() &&
    (a.country ?? null) === (b.country ?? null);
}

export function classifyCrossing(
  a: CrossingEndpoint,
  b: CrossingEndpoint,
  masses: Landmass[],
  links: FixedLink[],
  settings: Settings,
): { kind: SegmentKind; fixed_link: string | null } {
  const distKm = haversineKm(a, b);
  const sameCity = sameCityName(a, b);
  if (sameCity || distKm < settings.localKm) {
    return { kind: 'local', fixed_link: null };
  }

  const baseKind = segmentKind(a, b, masses, settings);
  if (baseKind === 'sea') {
    const link = findFixedLink(a, b, links);
    if (link !== null) {
      return { kind: 'sea-or-fixed', fixed_link: link.name };
    }
  }
  return { kind: baseKind, fixed_link: null };
}

function envelopeDelta(a: Hop, b: Hop): number | null {
  if (a.envelope_ms == null || b.envelope_ms == null) {
    return null;
  }
  return Math.max(0, b.envelope_ms - a.envelope_ms);
}

/**
 * Builds ordered segments connecting consecutive located hops and counting
 * skipped (silent or unlocated) hops in between (VOY-F-21, VOY-P-11).
 *
 * Each returned segment carries an extra `context` property (endpoint
 * positions and network names) consumed by `compatibleCables` (§7.10):
 * the `Segment` contract does not hold positions, so they travel alongside.
 * The property is stripped when a journey is re-parsed through the schema.
 */
export function buildSegments(
  hops: LocatedHop[],
  masses: Landmass[],
  links: FixedLink[],
  settings: Settings,
  source: Position | null = null,
): Segment[] {
  const segments: SegmentWithContext[] = [];
  let prevIndex: number | null = null;

  const firstLocated = hops.findIndex((entry) => entry?.location !== null && entry !== undefined);
  if (source && firstLocated >= 0) {
    const entry = hops[firstLocated];
    if (entry?.location) {
      // The leg from the departure to the first located hop is part of the
      // journey (§7.14 counts Lyon -> Paris in the 6,655 km). `from_ttl: 0`
      // means "the departure", which is not a hop.
      const located = { hop: entry.hop, location: entry.location };
      segments.push(departureSegment(source, located, firstLocated, masses, links, settings));
    }
  }

  for (let i = 0; i < hops.length; i += 1) {
    const entry = hops[i];
    if (!entry || entry.location === null) {
      continue;
    }
    if (prevIndex !== null) {
      const prev = hops[prevIndex];
      if (prev && prev.location !== null) {
        segments.push(
          makeSegment(
            { hop: prev.hop, location: prev.location },
            { hop: entry.hop, location: entry.location },
            i - prevIndex - 1,
            masses,
            links,
            settings,
          ),
        );
      }
    }
    prevIndex = i;
  }

  return segments;
}

/** Segment from the declared departure to the first located hop (§7.14). */
function departureSegment(
  source: Position,
  entry: { hop: Hop; location: Location },
  skipped: number,
  masses: Landmass[],
  links: FixedLink[],
  settings: Settings,
): SegmentWithContext {
  const { kind, fixed_link } = classifyCrossing(source, entry.location, masses, links, settings);
  return {
    from_ttl: 0,
    to_ttl: entry.hop.ttl,
    kind,
    geodesic_km: haversineKm(source, entry.location),
    delta_ms: entry.hop.envelope_ms ?? null,
    skipped_hops: skipped,
    cables: [],
    other_cables: 0,
    fixed_link,
    context: {
      from: { lat: source.lat, lon: source.lon },
      to: { lat: entry.location.lat, lon: entry.location.lon },
      fromAsName: null,
      toAsName: entry.hop.as_name ?? null,
    },
  };
}

function makeSegment(
  prev: { hop: Hop; location: Location },
  entry: { hop: Hop; location: Location },
  skipped: number,
  masses: Landmass[],
  links: FixedLink[],
  settings: Settings,
): SegmentWithContext {
  const { kind, fixed_link } = classifyCrossing(
    prev.location,
    entry.location,
    masses,
    links,
    settings,
  );
  const context: SegmentContext = {
    from: { lat: prev.location.lat, lon: prev.location.lon },
    to: { lat: entry.location.lat, lon: entry.location.lon },
    fromAsName: prev.hop.as_name ?? null,
    toAsName: entry.hop.as_name ?? null,
  };
  return {
    from_ttl: prev.hop.ttl,
    to_ttl: entry.hop.ttl,
    kind,
    geodesic_km: haversineKm(prev.location, entry.location),
    delta_ms: envelopeDelta(prev.hop, entry.hop),
    skipped_hops: skipped,
    cables: [],
    other_cables: 0,
    fixed_link,
    context,
  };
}
