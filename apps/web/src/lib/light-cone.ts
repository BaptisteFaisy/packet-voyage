/**
 * The light cone: for a hop that answered in `env` milliseconds, nothing can be
 * further than `c × env / 2 + slack` from the departure (§7.6). Drawn on the map,
 * that bound becomes a disc — the set of positions the measurement still allows.
 *
 * Pure geometry, no React, no canvas: the drawing lives in `map-render.ts`.
 */
import type { Journey, Position } from '@packet-voyage/schema';
import { DEFAULT_SETTINGS, EARTH_RADIUS_KM, stepAllowedKm, withSettings } from '@packet-voyage/core';
import type { Settings } from '@packet-voyage/core';

export interface LightDisc {
  ttl: number;
  center: Position;
  radiusKm: number;
  /** Rings of positions: more than one when the circle crosses the antimeridian. */
  rings: Position[][];
}

const DEFAULT_STEPS = 72;
const RAD = Math.PI / 180;

function normaliseLon(lon: number): number {
  let value = lon;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

/** Points at a constant great-circle distance from `center` (a small circle). */
export function discOutline(center: Position, radiusKm: number, steps = DEFAULT_STEPS): Position[] {
  const delta = radiusKm / EARTH_RADIUS_KM; // angular radius, radians
  const lat0 = center.lat * RAD;
  const sinLat0 = Math.sin(lat0);
  const cosLat0 = Math.cos(lat0);
  const outline: Position[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const bearing = (i / steps) * 2 * Math.PI;
    const lat = Math.asin(sinLat0 * Math.cos(delta) + cosLat0 * Math.sin(delta) * Math.cos(bearing));
    const lon =
      center.lon * RAD +
      Math.atan2(Math.sin(bearing) * Math.sin(delta) * cosLat0, Math.cos(delta) - sinLat0 * Math.sin(lat));
    outline.push({ lat: lat / RAD, lon: normaliseLon(lon / RAD) });
  }
  return outline;
}

/** Split a closed outline wherever it jumps across the antimeridian. */
export function splitRings(outline: Position[]): Position[][] {
  const rings: Position[][] = [[]];
  for (const point of outline) {
    const ring = rings[rings.length - 1] ?? [];
    const previous = ring[ring.length - 1];
    if (previous && Math.abs(point.lon - previous.lon) > 180) rings.push([]);
    rings[rings.length - 1]?.push(point);
  }
  return rings.filter((ring) => ring.length > 2);
}

/** One disc per located hop that has a measured envelope. */
export function lightDiscs(journey: Journey, settings?: Partial<Settings>): LightDisc[] {
  const config = settings ? withSettings(settings) : DEFAULT_SETTINGS;
  const source = journey.source;
  if (!source || source.lat == null || source.lon == null) return [];
  const origin: Position = { lat: source.lat, lon: source.lon };
  const discs: LightDisc[] = [];
  for (const hop of journey.hops) {
    if (!hop.location || hop.envelope_ms == null) continue;
    const radiusKm = stepAllowedKm(hop.envelope_ms, config);
    const outline = discOutline(origin, radiusKm);
    discs.push({ ttl: hop.ttl, center: origin, radiusKm, rings: splitRings(outline) });
  }
  return discs;
}

/** Every ring of every disc, ready to be projected and stroked. */
export function discRings(discs: LightDisc[]): Position[][] {
  return discs.flatMap((disc) => disc.rings);
}
