/**
 * The journey as GeoJSON: the half of the chimera that belongs to geographic
 * information systems. One Point per located hop, one LineString per segment
 * sampled along the great circle, and properties that keep the certainty level
 * of every value (§5.3).
 *
 * No dependency: the GeoJSON types are declared here. Nothing in the output may
 * claim a cable was used — the property is `compatible_cables` (§5.4).
 */
import type { Journey, Position, Segment } from '@packet-voyage/schema';
import { greatCirclePoints } from '../geo/index.ts';

export interface GeoGeometry {
  type: 'Point' | 'LineString';
  coordinates: number[] | number[][];
}

export interface GeoFeature {
  type: 'Feature';
  geometry: GeoGeometry;
  properties: Record<string, unknown>;
}

export interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
  properties: Record<string, unknown>;
}

const ARC_STEPS = 48;

function coordinatesOf(position: Position): number[] {
  return [position.lon, position.lat];
}

/** Longitudes stay in [-180, 180]; a jump above 180° means the antimeridian. */
function normaliseLon(lon: number): number {
  let value = lon;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function arcCoordinates(from: Position, to: Position): number[][] {
  return greatCirclePoints(from, to, ARC_STEPS).map((point) => [
    normaliseLon(point.lon),
    point.lat,
  ]);
}

function splitAtAntimeridian(line: number[][]): number[][][] {
  const parts: number[][][] = [[]];
  for (const [index, point] of line.entries()) {
    const current = parts[parts.length - 1] ?? [];
    const previous = index > 0 ? line[index - 1] : undefined;
    const jump = Math.abs((point[0] ?? 0) - (previous?.[0] ?? 0));
    if (previous !== undefined && current.length > 0 && jump > 180) parts.push([]);
    parts[parts.length - 1]?.push(point);
  }
  return parts.filter((part) => part.length > 1);
}

function hopFeature(hop: Journey['hops'][number]): GeoFeature | null {
  const location = hop.location;
  if (!location) return null;
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coordinatesOf(location) },
    properties: {
      kind: 'hop',
      ttl: hop.ttl,
      city: location.city,
      country: location.country ?? null,
      level: location.level,
      confidence: location.confidence,
      sources: location.sources,
      envelope_ms: hop.envelope_ms ?? null,
      asn: hop.asn ?? null,
      as_name: hop.as_name ?? null,
      ixp: hop.ixp ?? null,
      anycast: hop.anycast === true,
      certainty: 'inferred',
      rejected: location.rejected.map((entry) => ({
        source: entry.source,
        city: entry.city,
        country: entry.country ?? null,
        reason: entry.reason,
        allowed_km: entry.allowed_km,
        needed_km: entry.needed_km,
      })),
    },
  };
}

function segmentProperties(segment: Segment): Record<string, unknown> {
  return {
    kind: 'segment',
    from_ttl: segment.from_ttl,
    to_ttl: segment.to_ttl,
    crossing: segment.kind,
    geodesic_km: segment.geodesic_km,
    delta_ms: segment.delta_ms ?? null,
    skipped_hops: segment.skipped_hops,
    compatible_cables: segment.cables.map((cable) => ({
      id: cable.id,
      name: cable.name,
      band: cable.band,
      compatibility: cable.compatibility,
    })),
    other_compatible_cables: segment.other_cables,
    fixed_link: segment.fixed_link ?? null,
    certainty: 'assumed',
  };
}

function positionAt(journey: Journey, ttl: number): Position | null {
  if (ttl === 0) {
    const source = journey.source;
    return source && source.lat != null && source.lon != null ? { lat: source.lat, lon: source.lon } : null;
  }
  return journey.hops.find((hop) => hop.ttl === ttl)?.location ?? null;
}

/** Segments that cannot be drawn, and why: nothing disappears silently. */
export interface UndrawnSegment {
  from_ttl: number;
  to_ttl: number;
  reason: 'endpoint not located' | 'departure hidden by redaction';
}

function segmentFeatures(
  journey: Journey,
  segment: Segment,
  undrawn: UndrawnSegment[],
): GeoFeature[] {
  const from = positionAt(journey, segment.from_ttl);
  const to = positionAt(journey, segment.to_ttl);
  if (!from || !to) {
    undrawn.push({
      from_ttl: segment.from_ttl,
      to_ttl: segment.to_ttl,
      reason: segment.from_ttl === 0 ? 'departure hidden by redaction' : 'endpoint not located',
    });
    return [];
  }
  const parts = splitAtAntimeridian(arcCoordinates(from, to));
  return parts.map((line, index) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: line },
    properties: parts.length > 1 ? { ...segmentProperties(segment), part: index + 1 } : segmentProperties(segment),
  }));
}

/** Convert a journey into a FeatureCollection: hops, segments, source, target. */
export function journeyToGeoJSON(journey: Journey): GeoFeatureCollection {
  const features: GeoFeature[] = [];
  for (const hop of journey.hops) {
    const feature = hopFeature(hop);
    if (feature) features.push(feature);
  }
  const undrawn: UndrawnSegment[] = [];
  for (const segment of journey.segments) features.push(...segmentFeatures(journey, segment, undrawn));

  const source = journey.source;
  if (source && source.lat != null && source.lon != null) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [source.lon, source.lat] },
      properties: {
        kind: 'source',
        label: source.label ?? null,
        precision: source.precision ?? null,
        certainty: source.declared ? 'measured' : 'inferred',
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
    properties: {
      generator: 'packet-voyage',
      traced_at: journey.traced_at,
      target: journey.target,
      summary: journey.summary,
      credits: journey.credits,
      redaction: journey.redaction ?? null,
      segments: journey.segments.length,
      undrawn_segments: undrawn,
    },
  };
}
