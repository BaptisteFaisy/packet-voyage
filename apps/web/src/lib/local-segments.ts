import type { Hop, Position, Segment, Summary } from '@packet-voyage/schema';
import type { Settings } from './journey-source.ts';
import { haversineKm, lightFloorMs } from './journey-source.ts';

function hopLocationPos(hop: Hop): Position | null {
  if (!hop.location) return null;
  return { lat: hop.location.lat, lon: hop.location.lon };
}

function segmentKindLocal(km: number, settings: Settings): Segment['kind'] {
  if (km <= settings.localKm) return 'local';
  return 'undetermined';
}

function envelopeDelta(fromHop: Hop, toHop: Hop): number | null {
  const a = fromHop.envelope_ms;
  const b = toHop.envelope_ms;
  if (a === null || a === undefined || b === null || b === undefined) return null;
  return Math.round(Math.max(0, b - a) * 10) / 10;
}

function makeSegment(
  fromHop: Hop,
  toHop: Hop,
  km: number,
  skipped: number,
  settings: Settings,
): Segment {
  return {
    from_ttl: fromHop.ttl,
    to_ttl: toHop.ttl,
    kind: segmentKindLocal(km, settings),
    geodesic_km: Math.round(km),
    delta_ms: envelopeDelta(fromHop, toHop),
    skipped_hops: skipped,
    cables: [],
    other_cables: 0,
    fixed_link: null,
  };
}

/**
 * Segments between consecutive located hops (§7.9). Without the landmass
 * dataset a long segment stays `undetermined` — honesty first: the site
 * never claims a sea crossing it cannot prove.
 */
export function buildSegmentsLocal(hops: Hop[], settings: Settings): Segment[] {
  const segments: Segment[] = [];
  let previous: Hop | null = null;
  let skipped = 0;
  for (const hop of hops) {
    const pos = hopLocationPos(hop);
    if (!pos) {
      if (previous) skipped += 1;
      continue;
    }
    if (!previous) {
      previous = hop;
      skipped = 0;
      continue;
    }
    const prevPos = hopLocationPos(previous);
    if (prevPos) {
      segments.push(makeSegment(previous, hop, haversineKm(prevPos, pos), skipped, settings));
    }
    previous = hop;
    skipped = 0;
  }
  return segments;
}

function distinctCountries(hops: Hop[]): string[] {
  const countries: string[] = [];
  for (const hop of hops) {
    const country = hop.location?.country;
    if (country && countries[countries.length - 1] !== country) countries.push(country);
  }
  return countries;
}

function countFeatures(hops: Hop[]): { networks: number; ixps: number; rejected: number; gaps: number } {
  const asns = new Set<number>();
  let ixps = 0;
  let rejected = 0;
  let gaps = 0;
  for (const hop of hops) {
    if (hop.asn) asns.add(hop.asn);
    if (hop.ixp) ixps += 1;
    rejected += hop.location?.rejected.filter((r) => r.reason === 'light').length ?? 0;
    const silent = hop.replies.every((reply) => reply.rtt_ms.length === 0);
    if (silent || !hop.location) gaps += 1;
  }
  return { networks: asns.size, ixps, rejected, gaps };
}

/** Summary of a locally computed journey (VOY-P-15 shape). */
export function summarizeLocal(
  hops: Hop[],
  segments: Segment[],
  settings: Settings,
  source: Position | null,
  target: Position | null,
): Summary {
  const distance = segments.reduce((total, seg) => total + seg.geodesic_km, 0);
  const last = [...hops].reverse().find((hop) => hop.envelope_ms !== null && hop.envelope_ms !== undefined);
  const rtt = last?.envelope_ms ?? null;
  const floor = source && target ? lightFloorMs(haversineKm(source, target), settings) : null;
  const features = countFeatures(hops);
  return {
    distance_km_min: distance,
    rtt_ms: rtt,
    light_floor_ms: floor === null ? null : Math.round(floor * 10) / 10,
    inflation:
      rtt !== null && floor !== null && floor > 0 ? Math.round((rtt / floor) * 100) / 100 : null,
    countries: distinctCountries(hops),
    networks: features.networks,
    ixps: features.ixps,
    detours: [],
    rejected_by_light: features.rejected,
    gaps: features.gaps,
  };
}
