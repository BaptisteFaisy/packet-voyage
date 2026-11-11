import type { Position } from '@packet-voyage/schema';
import { normalizeDeltaLonDeg } from './haversine.ts';

function edgeCrossesRay(p: Position, a: Position, b: Position): boolean {
  const y = p.lat;
  const x = p.lon;
  const y1 = a.lat;
  const y2 = b.lat;

  // Ray shoots eastward (increasing longitude). Edge must straddle latitude y.
  const straddles = (y1 > y) !== (y2 > y);
  if (!straddles) return false;

  // Compute longitude intersection using minimal angular difference to preserve topology
  const dLon = normalizeDeltaLonDeg(b.lon - a.lon);
  const t = (y - y1) / (y2 - y1);
  const intersectLon = a.lon + t * dLon;
  const deltaFromP = normalizeDeltaLonDeg(intersectLon - x);

  return deltaFromP > 0;
}

/**
 * Tests whether a point is inside a single ring using ray casting (eastward ray).
 * Points exactly on an edge are implementation-defined (may fall either side);
 * landmass geometry is coarse enough that this never matters in practice.
 */
export function pointInRing(p: Position, ring: Position[]): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  const n = ring.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[j];
    const b = ring[i];
    if (!a || !b) continue;

    if (edgeCrossesRay(p, a, b)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Determines whether a position falls inside a polygon defined by rings.
 * Standard GeoJSON convention: `rings[0]` is the exterior ring, and optional
 * subsequent rings `rings[1..]` are interior rings (holes).
 */
export function pointInPolygon(p: Position, rings: Position[][]): boolean {
  const [outer, ...holes] = rings;
  if (!outer || outer.length < 3) return false;

  if (!pointInRing(p, outer)) return false;

  for (const hole of holes) {
    if (pointInRing(p, hole)) {
      return false;
    }
  }

  return true;
}
