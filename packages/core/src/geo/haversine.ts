import type { Position } from '@packet-voyage/schema';
import { EARTH_RADIUS_KM } from './constants.ts';

const DEG2RAD = Math.PI / 180;

/**
 * Normalizes an angular difference in degrees to [-180, 180].
 */
export function normalizeDeltaLonDeg(deltaDeg: number): number {
  let d = (deltaDeg + 180) % 360;
  if (d < 0) d += 360;
  return d - 180;
}

/**
 * Normalizes a longitude in degrees to [-180, 180].
 */
export function normalizeLonDeg(lonDeg: number): number {
  return normalizeDeltaLonDeg(lonDeg);
}

/**
 * Computes the central angle between two points on a sphere in radians.
 * Uses the Haversine formula, antimeridian-safe across the 180° boundary.
 */
export function centralAngleRad(a: Position, b: Position): number {
  if (a.lat === b.lat && a.lon === b.lon) return 0;

  const lat1 = a.lat * DEG2RAD;
  const lat2 = b.lat * DEG2RAD;
  const dLat = (b.lat - a.lat) * DEG2RAD;
  const dLon = normalizeDeltaLonDeg(b.lon - a.lon) * DEG2RAD;

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const h = sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfLon * sinHalfLon;
  const clampedH = Math.min(1, Math.max(0, h));

  return 2 * Math.atan2(Math.sqrt(clampedH), Math.sqrt(1 - clampedH));
}

/**
 * Computes the great-circle distance between two positions on Earth in kilometers.
 * Antimeridian-safe: wrapping around ±180° longitude yields minimal distance.
 */
export function haversineKm(a: Position, b: Position): number {
  return EARTH_RADIUS_KM * centralAngleRad(a, b);
}
