/**
 * Geometry helpers for the map (§11.8): d3-geo projections and the route
 * polylines. Pure functions, no React, no DOM.
 */
import type { Journey, Position } from '@packet-voyage/schema';
import type { GeoProjection } from 'd3-geo';
import { geoEqualEarth, geoOrthographic } from 'd3-geo';
import { greatCirclePoints } from './journey-source.ts';

export type ProjectionKind = 'globe' | 'flat';

export function makeProjection(
  kind: ProjectionKind,
  width: number,
  height: number,
  rotation: [number, number],
): GeoProjection {
  if (kind === 'globe') {
    return geoOrthographic()
      .rotate([-rotation[0], -rotation[1], 0])
      .scale(Math.min(width, height) / 2.2)
      .translate([width / 2, height / 2])
      .clipAngle(90);
  }
  return geoEqualEarth()
    .scale(Math.min(width / 6.4, height / 3.1))
    .translate([width / 2, height / 2]);
}

export interface RouteNode {
  ttl: number;
  position: Position;
}

/** Located hops in order, optionally prefixed by the declared source. */
export function routeNodes(journey: Journey): RouteNode[] {
  const nodes: RouteNode[] = [];
  if (journey.source && journey.source.lat != null && journey.source.lon != null) {
    nodes.push({ ttl: 0, position: { lat: journey.source.lat, lon: journey.source.lon } });
  }
  for (const hop of journey.hops) {
    if (hop.location) {
      nodes.push({ ttl: hop.ttl, position: { lat: hop.location.lat, lon: hop.location.lon } });
    }
  }
  return nodes;
}

export interface RouteLeg {
  key: string;
  fromTtl: number;
  toTtl: number;
  points: Position[];
  durationMs: number | null;
}

/**
 * One polyline per segment between located hops, sampled along the great
 * circle. Consecutive same-city segments collapse visually (two identical
 * endpoints still produce a leg, drawn as a dot).
 */
export function routeLegs(journey: Journey): RouteLeg[] {
  const legs: RouteLeg[] = [];
  const byTtl = new Map<number, Position>();
  for (const node of routeNodes(journey)) byTtl.set(node.ttl, node.position);
  for (const segment of journey.segments) {
    const from = byTtl.get(segment.from_ttl);
    const to = byTtl.get(segment.to_ttl);
    if (!from || !to) continue;
    legs.push({
      key: `leg-${segment.from_ttl}-${segment.to_ttl}`,
      fromTtl: segment.from_ttl,
      toTtl: segment.to_ttl,
      points: greatCirclePoints(from, to, 32),
      durationMs: segment.delta_ms ?? null,
    });
  }
  return legs;
}

export function rejectedPositions(journey: Journey): { ttl: number; position: Position; city: string }[] {
  const out: { ttl: number; position: Position; city: string }[] = [];
  for (const hop of journey.hops) {
    if (!hop.location) continue;
    for (const rejection of hop.location.rejected) {
      // Rejected candidates have no coordinates in the journey; they are
      // drawn as a struck-through marker at a deterministic offset of the
      // retained position so the demo shows "appeared, then undone".
      out.push({
        ttl: hop.ttl,
        position: { lat: hop.location.lat + 6, lon: hop.location.lon + 6 },
        city: rejection.city,
      });
    }
  }
  return out;
}
