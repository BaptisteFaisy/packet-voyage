import type { Landmass, Position } from '@packet-voyage/schema';
import { greatCirclePoints } from './geodesic.ts';
import { pointInPolygon } from './polygon.ts';

/** Default number of samples used to probe a great-circle segment for water. */
export const DEFAULT_WATER_SAMPLES = 64;

/**
 * Returns the first landmass (in dataset order) whose polygons contain `p`,
 * or `null` when the point lies on water.
 */
export function landmassAt(p: Position, masses: Landmass[]): Landmass | null {
  for (const mass of masses) {
    if (pointInPolygon(p, mass.polygons)) return mass;
  }
  return null;
}

/**
 * Tells whether the straight great-circle segment between `a` and `b` leaves
 * land at least once. The arc is sampled at `samples + 1` equally spaced
 * positions (endpoints included); if any sample is not inside a landmass,
 * the crossing touches water.
 *
 * With a coarse landmass dataset this is an *inference* of the segment nature
 * (§7.9): it says "compatible with a sea crossing", never a certainty.
 */
export function crossesWater(
  a: Position,
  b: Position,
  masses: Landmass[],
  samples: number = DEFAULT_WATER_SAMPLES,
): boolean {
  const points = greatCirclePoints(a, b, Math.max(1, samples));
  return points.some((p) => landmassAt(p, masses) === null);
}
