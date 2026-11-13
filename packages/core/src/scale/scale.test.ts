import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { DEFAULT_SETTINGS } from '../settings.ts';
import { EARTH_RADIUS_KM, haversineKm } from '../geo/index.ts';
import {
  EARTH_CIRCUMFERENCE_KM,
  everydayScale,
  earthLaps,
  LIGHT_KM_PER_MS,
  lightDistanceKm,
  PARIS_MARSEILLE_KM,
  parisMarseilleCount,
} from './scale.ts';

/** Seeds recorded so a counter-example can be replayed (§13). */
const SEED = 20261119;

/** Two decimals at most: a scale anchor is never shown more precise than it is. */
function expectTwoDecimals(value: number): void {
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
  expect(Number(value.toFixed(2))).toBe(value);
}

describe('the light gauge (§7.12)', () => {
  it('keeps the vacuum speed as the anchor, and the circumference as 2πR', () => {
    expect(LIGHT_KM_PER_MS).toBe(DEFAULT_SETTINGS.lightVacuumKmPerMs);
    expect(EARTH_CIRCUMFERENCE_KM).toBeCloseTo(2 * Math.PI * EARTH_RADIUS_KM, 9);
    expect(EARTH_CIRCUMFERENCE_KM).toBeGreaterThan(40000);
    expect(EARTH_CIRCUMFERENCE_KM).toBeLessThan(40100);
  });

  it('converts milliseconds into kilometres of light, exactly', () => {
    expect(lightDistanceKm(0)).toBe(0);
    expect(lightDistanceKm(1)).toBe(299.79);
    expect(lightDistanceKm(10)).toBe(2997.9);
    expect(lightDistanceKm(0.5)).toBe(149.9);
    expect(lightDistanceKm(91.7)).toBe(27490.74);
  });

  it('never returns a negative gauge: a nonsense delay reads as zero', () => {
    expect(lightDistanceKm(-1)).toBe(0);
    expect(lightDistanceKm(Number.NaN)).toBe(0);
    expect(lightDistanceKm(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe('the everyday scales', () => {
  it('counts laps of the Earth and Paris–Marseille trips exactly', () => {
    expect(earthLaps(EARTH_CIRCUMFERENCE_KM)).toBe(1);
    expect(earthLaps(EARTH_CIRCUMFERENCE_KM / 2)).toBe(0.5);
    expect(earthLaps(0)).toBe(0);
    expect(parisMarseilleCount(PARIS_MARSEILLE_KM)).toBe(1);
    expect(parisMarseilleCount(6600)).toBe(10);
    expect(parisMarseilleCount(0)).toBe(0);
  });

  it('never returns a negative anchor', () => {
    for (const value of [-660, -1, Number.NaN, Number.NEGATIVE_INFINITY]) {
      expect(earthLaps(value)).toBe(0);
      expect(parisMarseilleCount(value)).toBe(0);
      expect(everydayScale(value).km).toBe(0);
    }
  });

  it('agrees with the geometry: half the Earth is half a lap', () => {
    const antipodes = haversineKm({ lat: 48.8566, lon: 2.3522 }, { lat: -48.8566, lon: -177.6478 });
    expect(earthLaps(antipodes)).toBe(0.5);
  });
});

describe('everydayScale', () => {
  it('reads one distance in human terms, rounded to two decimals', () => {
    expect(everydayScale(6655)).toEqual({
      km: 6655,
      laps: 0.17,
      trips: 10.08,
      lightKmPerMs: LIGHT_KM_PER_MS,
    });
    expect(everydayScale(660)).toEqual({ km: 660, laps: 0.02, trips: 1, lightKmPerMs: LIGHT_KM_PER_MS });
  });

  it('takes the light gauge from the settings, never from a hidden default', () => {
    expect(everydayScale(1000, { lightVacuumKmPerMs: 204 }).lightKmPerMs).toBe(204);
    expect(everydayScale(1000).lightKmPerMs).toBe(DEFAULT_SETTINGS.lightVacuumKmPerMs);
    expect(everydayScale(1000, { unit: 'mi', language: 'fr' }).lightKmPerMs).toBe(LIGHT_KM_PER_MS);
  });

  it('is the same as calling the anchors one by one', () => {
    const km = 4321.09;
    const scale = everydayScale(km);
    expect(scale.laps).toBe(earthLaps(km));
    expect(scale.trips).toBe(parisMarseilleCount(km));
  });

});

describe('everydayScale, whatever the distance (§13)', () => {
  it(`keeps every anchor finite, non-negative and rounded (seed ${SEED})`, () => {
    fc.assert(
      fc.property(fc.double({ min: -1e9, max: 1e9, noNaN: true }), (km) => {
        const scale = everydayScale(km);
        for (const value of [scale.km, scale.laps, scale.trips]) expectTwoDecimals(value);
        expectTwoDecimals(lightDistanceKm(km));
        expectTwoDecimals(earthLaps(km));
        expectTwoDecimals(parisMarseilleCount(km));
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it(`rounds to two decimals at most, never beyond (seed ${SEED})`, () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e6, noNaN: true }), (km) => {
        const exactLaps = km / EARTH_CIRCUMFERENCE_KM;
        const exactTrips = km / PARIS_MARSEILLE_KM;
        // The anchor stays within half of its last shown digit of the exact
        // value: no rounding is invented, and none is hidden.
        expect(Math.abs(earthLaps(km) - exactLaps)).toBeLessThanOrEqual(0.0051);
        expect(Math.abs(parisMarseilleCount(km) - exactTrips)).toBeLessThanOrEqual(0.0051);
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it(`scales linearly with the light gauge (seed ${SEED})`, () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e4, noNaN: true }),
        fc.double({ min: 0, max: 1e4, noNaN: true }),
        (a, b) => {
          const sum = lightDistanceKm(a + b);
          expect(Math.abs(sum - (lightDistanceKm(a) + lightDistanceKm(b)))).toBeLessThanOrEqual(0.02);
        },
      ),
      { seed: SEED, numRuns: 200 },
    );
  });
});
