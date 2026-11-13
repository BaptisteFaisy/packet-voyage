import type { Detour, Location, Position, Summary } from '@packet-voyage/schema';
import type { Segment } from '@packet-voyage/schema';
import { haversineKm } from '../geo/index.ts';
import { lightFloorMs } from '../envelope/index.ts';
import type { LocatedHop } from '../segments/segments.ts';
import type { Settings } from '../settings.ts';

/** Tolerance for "same position" comparisons, km. */
const EPSILON_KM = 1e-9;

export function inflationOf(rttMs: number, lightFloorMsValue: number): number {
  if (lightFloorMsValue <= EPSILON_KM) {
    return rttMs > EPSILON_KM ? Infinity : 1;
  }
  return rttMs / lightFloorMsValue;
}

/** Envelope of the furthest hop that carries a measured envelope (§7.11: "delay at the destination"). */
function destinationEnvelopeMs(hops: LocatedHop[]): number | null {
  for (let i = hops.length - 1; i >= 0; i -= 1) {
    const entry = hops[i];
    if (entry && entry.hop.envelope_ms != null) {
      return entry.hop.envelope_ms;
    }
  }
  return null;
}

function locatedIndexes(hops: LocatedHop[]): number[] {
  const list: number[] = [];
  for (let i = 0; i < hops.length; i += 1) {
    const entry = hops[i];
    if (entry && entry.location !== null) list.push(i);
  }
  return list;
}

/**
 * Countries in hop order, located hops with a known country only, each once:
 * §7.14 counts "3 countries" for a route whose six located hops sit in three.
 */
function countriesOf(hops: LocatedHop[]): string[] {
  const list: string[] = [];
  for (const entry of hops) {
    const country = entry?.location?.country ?? null;
    if (country && !list.includes(country)) list.push(country);
  }
  return list;
}

/** Distinct AS numbers seen on located or answered hops, in hop order. */
function countNetworks(hops: LocatedHop[]): number {
  const seen = new Set<number>();
  for (const entry of hops) {
    const asn = entry?.hop.asn ?? null;
    if (asn != null) seen.add(asn);
  }
  return seen.size;
}

/** Hops explicitly marked as an IXP crossing, distinct by name when available. */
function countIxps(hops: LocatedHop[]): number {
  const seen = new Set<string | number>();
  for (const entry of hops) {
    const hop = entry?.hop;
    if (hop?.ixp) {
      seen.add(hop.ixp);
    }
  }
  return seen.size;
}

/** Exact count of light rejections kept on every located hop's record (VOY-P-15). */
function countLightRejections(hops: LocatedHop[]): number {
  let total = 0;
  for (const entry of hops) {
    const rejected = entry?.location?.rejected ?? [];
    for (const rejection of rejected) {
      if (rejection.reason === 'light') total += 1;
    }
  }
  return total;
}

/** Classes that are not holes: the user's own box and the access network (§7.14). */
const NOT_A_GAP = new Set(['private', 'cgnat', 'link-local', 'loopback', 'multicast', 'reserved']);

/** Silent or unlocated hops — the visible gaps of the trace (§7.11). */
function countGaps(hops: LocatedHop[]): number {
  let total = 0;
  for (const entry of hops) {
    if (!entry) continue;
    if (entry.location === null && !NOT_A_GAP.has(entry.hop.class)) total += 1;
  }
  return total;
}

/**
 * Country-return detours: the path leaves a country and later comes back to it.
 * Only located hops with a known country take part (VOY-F-28, §7.11).
 */
function countryReturnDetours(hops: LocatedHop[]): Detour[] {
  const detours: Detour[] = [];
  const located = hops
    .map((entry, index) => ({ entry, index }))
    .filter((x): x is { entry: LocatedHop; index: number } =>
      Boolean(x.entry?.location?.country));

  for (let i = 0; i < located.length; i += 1) {
    for (let j = i + 2; j < located.length; j += 1) {
      const first = located[i];
      const second = located[j];
      if (!first || !second) continue;
      const country = first.entry.location?.country;
      const middle = located
        .slice(i + 1, j)
        .map((x) => x.entry.location?.country)
        .filter((c): c is string => Boolean(c));
      if (
        country &&
        middle.length > 0 &&
        middle.every((c) => c !== country) &&
        second.entry.location?.country === country
      ) {
        detours.push({
          kind: 'country-return',
          ttls: [first.entry.hop.ttl, second.entry.hop.ttl],
          detail: `The path leaves ${country} at hop ${first.entry.hop.ttl} and returns at hop ${second.entry.hop.ttl}.`,
        });
        break;
      }
    }
  }
  return detours;
}

/**
 * Zigzag detours: for three consecutive located positions A, B, C,
 * `d(A,B) + d(B,C) > detourRatio * d(A,C)`, or a round trip whose overshoot
 * exceeds `zigzagKm` (VOY-F-28, §7.11).
 */
function zigzagDetours(hops: LocatedHop[], settings: Settings): Detour[] {
  const detours: Detour[] = [];
  const points = hops
    .map((entry) => (entry?.location ? { ttl: entry.hop.ttl, pos: entry.location } : null))
    .filter((x): x is { ttl: number; pos: Location } => x !== null);

  for (let i = 0; i + 2 < points.length; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const c = points[i + 2];
    if (!a || !b || !c) continue;
    const ab = haversineKm(a.pos, b.pos);
    const bc = haversineKm(b.pos, c.pos);
    const ac = haversineKm(a.pos, c.pos);
    const overshootKm = ab + bc - ac;
    const ratioDetour = overshootKm > EPSILON_KM && ab + bc > settings.detourRatio * ac;
    const roundTripDetour = ac <= EPSILON_KM && overshootKm > settings.zigzagKm;
    if (ratioDetour || roundTripDetour) {
      detours.push({
        kind: 'zigzag',
        ttls: [a.ttl, b.ttl, c.ttl],
        detail: `Hop ${b.ttl} adds at least ${Math.round(overshootKm)} km to the straight path ${a.ttl} → ${c.ttl}.`,
      });
    }
  }
  return detours;
}

/** All detours of §7.11, country returns first then zigzags, in hop order. */
export function detectDetours(hops: LocatedHop[], settings: Settings): Detour[] {
  return [...countryReturnDetours(hops), ...zigzagDetours(hops, settings)];
}

/**
 * Builds the journey summary (§7.11, VOY-F-26, VOY-F-27, VOY-P-15).
 *
 * `distance_km_min` is the sum of the segment geodesic distances — always
 * displayed as "at least". `rtt_ms` is the envelope at the destination;
 * the light floor is `2 × d(source, destination) / c_fibre` and the inflation
 * their ratio in the vacuum semantics of §7.11.
 */
export function summarize(
  hops: LocatedHop[],
  segments: Segment[],
  settings: Settings,
  source: Position | null = null,
): Summary {
  const distanceKmMin = segments.reduce((sum, seg) => sum + Math.max(0, seg.geodesic_km), 0);

  const locatedIdx = locatedIndexes(hops);
  const firstIdx = locatedIdx[0];
  const lastIdx = locatedIdx.length > 0 ? locatedIdx[locatedIdx.length - 1] : undefined;
  const first = firstIdx !== undefined ? hops[firstIdx] : undefined;
  const last = lastIdx !== undefined ? hops[lastIdx] : undefined;
  const rttMs = destinationEnvelopeMs(hops);

  // §7.11: the light floor is 2 × d(S, D) / c, from the DEPARTURE (declared or
  // deduced) to the destination — not from the first located hop, which would
  // silently shorten the route and flatter the inflation.
  const origin: Position | null = source ?? first?.location ?? null;

  let floorMs: number | null = null;
  let inflation: number | null = null;
  if (origin && last?.location) {
    const dKm = haversineKm(origin, last.location);
    floorMs = lightFloorMs(dKm, settings);
    // A zero floor (departure and destination in the same place) makes the
    // ratio meaningless: `null` is honest, `Infinity` would not survive a
    // journey file (JSON has no infinity) and would break VOY-P-17.
    if (rttMs != null && floorMs > EPSILON_KM) {
      const ratio = inflationOf(rttMs, floorMs);
      inflation = Number.isFinite(ratio) ? ratio : null;
    }
  }

  return {
    distance_km_min: distanceKmMin,
    rtt_ms: rttMs,
    light_floor_ms: floorMs,
    inflation,
    countries: countriesOf(hops),
    networks: countNetworks(hops),
    ixps: countIxps(hops),
    detours: detectDetours(hops, settings),
    rejected_by_light: countLightRejections(hops),
    gaps: countGaps(hops),
  };
}
