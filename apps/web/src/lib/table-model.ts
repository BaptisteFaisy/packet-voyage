/**
 * Row model of the roadmap table (VOY-F-33): everything the map shows, in
 * hop order, screen-reader friendly. Pure logic, no React.
 */
import type { Certainty, Hop, Journey, Segment } from '@packet-voyage/schema';
import { localTimeAt } from '@packet-voyage/core';

export type RowKind = 'hop' | 'segment';

export interface RoadmapRow {
  key: string;
  kind: RowKind;
  order: number;
  ttl: number;
  toTtl: number | null;
  label: string;
  certainty: Certainty;
  confidence: string;
  delayMs: number | null;
  distanceKm: number | null;
  distanceIsMinimum: boolean;
  details: string;
  sources: string;
  /** Local hour deduced from the longitude, at the instant of the trace: inferred. */
  localTime: string | null;
}

/** The local hour at a longitude, or null when the hop has no position. */
export function localTimeOf(hop: Hop, tracedAt: string | undefined): string | null {
  const lon = hop.location?.lon;
  if (lon === undefined || !tracedAt) return null;
  return localTimeAt(lon, tracedAt);
}

/** A hop row carries measured data (address, delays); the location level is separate. */
export function hopCertainty(_hop: Hop): Certainty {
  return 'measured';
}

export function hopLabel(hop: Hop): string {
  const reply = hop.replies[0];
  const ip = reply?.ip && reply.ip !== '' ? reply.ip : '*';
  const name = reply?.name ? ` (${reply.name})` : '';
  return `${ip}${name}`;
}

export function hopDetails(hop: Hop): string {
  const parts: string[] = [`class: ${hop.class}`];
  if (hop.asn) parts.push(`AS${hop.asn}${hop.as_name ? ` ${hop.as_name}` : ''}`);
  if (hop.ixp) parts.push(`IXP: ${hop.ixp}`);
  if (hop.anycast) parts.push('anycast');
  if (hop.mpls && hop.mpls.length > 0) parts.push(`MPLS: ${hop.mpls.join(', ')}`);
  if (!hop.location) parts.push('not located');
  return parts.join(' · ');
}

export function hopRow(hop: Hop, tracedAt?: string): RoadmapRow {
  const location = hop.location;
  const rtts = hop.replies.flatMap((reply) => reply.rtt_ms);
  return {
    key: `hop-${hop.ttl}`,
    kind: 'hop',
    order: hop.ttl,
    ttl: hop.ttl,
    toTtl: null,
    label: hopLabel(hop),
    certainty: hopCertainty(hop),
    confidence: location ? location.level : 'unlocated',
    delayMs: rtts.length > 0 ? Math.min(...rtts) : null,
    distanceKm: null,
    distanceIsMinimum: false,
    details: location
      ? `${location.city}${location.country ? `, ${location.country}` : ''} · ${hopDetails(hop)}`
      : hopDetails(hop),
    sources: location ? location.sources.join(', ') : '—',
    localTime: localTimeOf(hop, tracedAt),
  };
}

export function segmentLabel(segment: Segment, journey: Journey): string {
  const from = journey.hops.find((hop) => hop.ttl === segment.from_ttl);
  const to = journey.hops.find((hop) => hop.ttl === segment.to_ttl);
  const fromCity = from?.location?.city ?? `hop ${segment.from_ttl}`;
  const toCity = to?.location?.city ?? `hop ${segment.to_ttl}`;
  return `${fromCity} → ${toCity}`;
}

export function segmentRow(segment: Segment, journey: Journey): RoadmapRow {
  return {
    key: `seg-${segment.from_ttl}-${segment.to_ttl}`,
    kind: 'segment',
    order: segment.to_ttl,
    ttl: segment.from_ttl,
    toTtl: segment.to_ttl,
    label: segmentLabel(segment, journey),
    certainty: 'assumed',
    confidence: segment.kind,
    delayMs: segment.delta_ms ?? null,
    distanceKm: segment.geodesic_km,
    distanceIsMinimum: true,
    localTime: null,
    details:
      segment.cables.length > 0
        ? `${segment.kind} · compatible cables: ${segment.cables.length}${segment.other_cables > 0 ? ` (+${segment.other_cables})` : ''}`
        : `${segment.kind}${segment.skipped_hops > 0 ? ` · spans ${segment.skipped_hops} unlocated hop(s)` : ''}`,
    sources: segment.cables.map((cable) => cable.source).join(', ') || '—',
  };
}

/** Hops and segments interleaved in hop order (a segment precedes its end hop). */
export function interleaveRows(hopRows: RoadmapRow[], segmentRows: RoadmapRow[]): RoadmapRow[] {
  const byTo = new Map(segmentRows.map((row) => [row.toTtl ?? -1, row]));
  const merged: RoadmapRow[] = [];
  for (const row of hopRows) {
    const segment = byTo.get(row.ttl);
    if (segment) merged.push(segment);
    merged.push(row);
  }
  const placed = new Set(merged.map((row) => row.key));
  for (const row of segmentRows) {
    if (!placed.has(row.key)) merged.push(row);
  }
  return merged;
}

/** Every row of the roadmap table for a journey. */
export function roadmapRows(journey: Journey): RoadmapRow[] {
  return interleaveRows(
    journey.hops.map((hop) => hopRow(hop, journey.traced_at)),
    journey.segments.map((segment) => segmentRow(segment, journey)),
  );
}
