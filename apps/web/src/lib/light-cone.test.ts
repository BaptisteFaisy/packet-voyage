import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, stepAllowedKm } from '@packet-voyage/core';
import type { Journey } from '@packet-voyage/schema';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { discOutline, discRings, lightDiscs, splitRings } from './light-cone.ts';

describe('the light cone (§7.6)', () => {
  it('gives each located hop with an envelope a disc of the right radius', () => {
    const discs = lightDiscs(SAMPLE_JOURNEY);
    const expected = SAMPLE_JOURNEY.hops.filter(
      (hop) => hop.location && hop.envelope_ms !== null && hop.envelope_ms !== undefined,
    );
    expect(discs.length).toBe(expected.length);
    for (const disc of discs) {
      const hop = expected.find((entry) => entry.ttl === disc.ttl);
      expect(disc.radiusKm).toBeCloseTo(stepAllowedKm(hop?.envelope_ms ?? 0, DEFAULT_SETTINGS), 6);
    }
  });

  it('draws nothing when the departure is unknown: bounds would be relative only', () => {
    const noSource = { ...SAMPLE_JOURNEY, source: null } as Journey;
    expect(lightDiscs(noSource)).toEqual([]);
  });
});

describe('the light cone on the sphere', () => {
  it('keeps longitudes inside [-180, 180], including near the antimeridian', () => {
    for (const centre of [
      { lat: 45.76, lon: 4.84 },
      { lat: 35.68, lon: 179.4 },
      { lat: -33.87, lon: -179.9 },
      { lat: 89, lon: 0 },
    ]) {
      for (const point of discOutline(centre, 4000)) {
        expect(point.lon).toBeGreaterThanOrEqual(-180);
        expect(point.lon).toBeLessThanOrEqual(180);
        expect(point.lat).toBeGreaterThanOrEqual(-90);
        expect(point.lat).toBeLessThanOrEqual(90);
      }
    }
  });

  it('splits a ring that crosses the antimeridian instead of drawing a 360° jump', () => {
    const crossing = [
      { lat: 0, lon: 176 },
      { lat: 1, lon: 177.5 },
      { lat: 2, lon: 179 },
      { lat: 3, lon: -179.5 },
      { lat: 2, lon: -178 },
      { lat: 1, lon: -176.5 },
    ];
    const rings = splitRings(crossing);
    expect(rings.length).toBe(2);
    for (const ring of rings) {
      for (let i = 1; i < ring.length; i += 1) {
        expect(Math.abs((ring[i]?.lon ?? 0) - (ring[i - 1]?.lon ?? 0))).toBeLessThan(180);
      }
    }
  });

  it('exposes every ring flat, ready to be projected', () => {
    const discs = lightDiscs(SAMPLE_JOURNEY);
    expect(discRings(discs).length).toBe(discs.reduce((total, disc) => total + disc.rings.length, 0));
  });
});
