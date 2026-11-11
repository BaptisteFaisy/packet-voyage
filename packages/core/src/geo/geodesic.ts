import type { Position } from '@packet-voyage/schema';
import { centralAngleRad, normalizeDeltaLonDeg, normalizeLonDeg } from './haversine.ts';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

function posToVec(p: Position): Vector3D {
  const latRad = p.lat * DEG2RAD;
  const lonRad = p.lon * DEG2RAD;
  const cosLat = Math.cos(latRad);
  return {
    x: cosLat * Math.cos(lonRad),
    y: cosLat * Math.sin(lonRad),
    z: Math.sin(latRad),
  };
}

function vecToPos(v: Vector3D): Position {
  const norm = Math.hypot(v.x, v.y, v.z);
  if (norm === 0) return { lat: 0, lon: 0 };
  const lat = Math.asin(Math.max(-1, Math.min(1, v.z / norm))) * RAD2DEG;
  const lon = Math.atan2(v.y, v.x) * RAD2DEG;
  return { lat, lon: normalizeLonDeg(lon) };
}

/** Fallback used for (nearly) antipodal endpoints: straight interpolation on the sphere angles. */
function interpolateLinear(a: Position, b: Position, f: number): Position {
  const dLon = normalizeDeltaLonDeg(b.lon - a.lon);
  return {
    lat: a.lat + (b.lat - a.lat) * f,
    lon: normalizeLonDeg(a.lon + dLon * f),
  };
}

function interpolateArc(a: Position, b: Position, omega: number, f: number): Position {
  const sinOmega = Math.sin(omega);
  if (Math.abs(sinOmega) < 1e-9) return interpolateLinear(a, b, f);

  const v1 = posToVec(a);
  const v2 = posToVec(b);
  const a1 = Math.sin((1 - f) * omega) / sinOmega;
  const b1 = Math.sin(f * omega) / sinOmega;
  return vecToPos({
    x: a1 * v1.x + b1 * v2.x,
    y: a1 * v1.y + b1 * v2.y,
    z: a1 * v1.z + b1 * v2.z,
  });
}

/**
 * Returns the positions lying on the great-circle arc from `a` to `b`.
 * Includes both endpoints. `steps` is the number of intervals (default 20),
 * so the result holds `steps + 1` positions. Coincident points yield `steps + 1`
 * copies of `a`; `steps <= 0` yields `[a]`.
 */
export function greatCirclePoints(a: Position, b: Position, steps: number = 20): Position[] {
  if (steps <= 0) return [{ lat: a.lat, lon: a.lon }];

  const omega = centralAngleRad(a, b);
  const pts: Position[] = [];
  if (omega === 0) {
    // Coincident points: the arc is a single location, repeated.
    for (let i = 0; i <= steps; i++) pts.push({ lat: b.lat, lon: b.lon });
    return pts;
  }
  for (let i = 0; i <= steps; i++) {
    pts.push(i === 0 ? { lat: a.lat, lon: a.lon } : interpolateArc(a, b, omega, i / steps));
  }
  pts[steps] = { lat: b.lat, lon: b.lon };
  return pts;
}
