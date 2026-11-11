import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Position } from '@packet-voyage/schema';
import { EARTH_RADIUS_KM, haversineKm, normalizeDeltaLonDeg, normalizeLonDeg } from './index.ts';

const HALF_CIRCUMFERENCE = Math.PI * EARTH_RADIUS_KM;

/**
 * Floating-point tolerance, proportional to the magnitude: haversine loses a
 * few relative digits near antipodal points (sqrt of a value close to 1), and
 * shifted longitudes round differently. 1e-6 relative is 2 cm at 20 000 km —
 * far tighter than the 50 km slack of the product, far above the ulp noise.
 */
function eps(d: number): number {
  return 1e-6 * (1 + d);
}

/** Generator for valid WGS84 positions. */
const arbitraryPosition = fc.record({
  lat: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
  lon: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
});

/** Generator for arbitrary longitude shifts, wrapping past the antimeridian. */
const arbitraryShift = fc.double({ min: -720, max: 720, noNaN: true, noDefaultInfinity: true });

describe('VOY-P-12 geometry properties', () => {
  it('VOY-P-12 geometry is symmetric, satisfies triangle inequality, and is antimeridian invariant', () => {
    fc.assert(
      fc.property(
        arbitraryPosition,
        arbitraryPosition,
        arbitraryPosition,
        arbitraryShift,
        (a: Position, b: Position, c: Position, shiftDeg: number) => {
          const dAB = haversineKm(a, b);
          const dBA = haversineKm(b, a);
          const dBC = haversineKm(b, c);
          const dAC = haversineKm(a, c);

          // 1. Bounded: 0 <= d <= half the circumference
          expect(dAB).toBeGreaterThanOrEqual(0);
          expect(dAB).toBeLessThanOrEqual(HALF_CIRCUMFERENCE + 1e-6);

          // 2. Zero between coincident points …
          expect(haversineKm(a, a)).toBe(0);

          // … and only between them: points apart by more than 1e-6 degree
          // (about 1 cm) always measure strictly positive.
          const dLat = Math.abs(a.lat - b.lat);
          const dLon = Math.abs(normalizeDeltaLonDeg(a.lon - b.lon));
          if (dLat > 1e-6 || dLon > 1e-6) {
            expect(dAB).toBeGreaterThan(0);
          }

          // 3. Symmetry: d(A, B) = d(B, A)
          expect(Math.abs(dAB - dBA)).toBeLessThan(eps(dAB));

          // 4. Triangle inequality: d(A, C) <= d(A, B) + d(B, C)
          expect(dAC).toBeLessThanOrEqual(dAB + dBC + eps(dAB + dBC));

          // 5. Rotation invariance: shifting every longitude by the same angle
          // — hence crossing the antimeridian — preserves the distance.
          const aShifted: Position = { lat: a.lat, lon: normalizeLonDeg(a.lon + shiftDeg) };
          const bShifted: Position = { lat: b.lat, lon: normalizeLonDeg(b.lon + shiftDeg) };
          const dShifted = haversineKm(aShifted, bShifted);
          expect(Math.abs(dAB - dShifted)).toBeLessThan(eps(dAB));
        },
      ),
      // Fixed seed: the property suite is deterministic run to run (§0.7).
      { seed: 20260711, numRuns: 1000 },
    );
  });
});
