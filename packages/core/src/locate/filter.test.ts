import { describe, expect, it } from 'vitest';
import type { Candidate, Position } from '@packet-voyage/schema';
import { stepAllowedKm } from '../envelope/index.ts';
import { haversineKm } from '../geo/index.ts';
import { DEFAULT_SETTINGS } from '../settings.ts';
import { filterByLight } from './filter.ts';

const LYON: Position = { lat: 45.764, lon: 4.8357 };
const PARIS: Candidate = {
  city: 'Paris',
  country: 'FR',
  lat: 48.8566,
  lon: 2.3522,
  source: 'ixp-prefix',
  weight: 0.8,
};
const ASHBURN: Candidate = {
  city: 'Ashburn',
  country: 'US',
  lat: 39.0438,
  lon: -77.4874,
  source: 'geodb',
  weight: 0.3,
};

describe('filterByLight §7.14 hop 4 (VOY-F-16)', () => {
  it('VOY-F-16 keeps Paris and rejects Ashburn at hop 4 of §7.14 (9.6 ms)', () => {
    const allowedKm = stepAllowedKm(9.6, DEFAULT_SETTINGS);
    const { kept, rejected } = filterByLight([PARIS, ASHBURN], allowedKm, LYON);

    expect(kept).toEqual([PARIS]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      source: 'geodb',
      city: 'Ashburn',
      country: 'US',
      reason: 'light',
      allowed_km: allowedKm,
    });
    expect(rejected[0]!.needed_km).toBeGreaterThan(6400);
    expect(rejected[0]!.needed_km).toBeLessThan(6600);
  });
});

describe('filterByLight boundary and antimeridian (VOY-F-16, VOY-P-06)', () => {
  it('VOY-F-16 keeps a candidate right at allowed_km and rejects just past it', () => {
    const exactDistance = haversineKm(LYON, PARIS);

    const onBound = filterByLight([PARIS], exactDistance, LYON);
    expect(onBound.kept).toEqual([PARIS]);
    expect(onBound.rejected).toEqual([]);

    const pastBound = filterByLight([PARIS], exactDistance - 0.001, LYON);
    expect(pastBound.kept).toEqual([]);
    expect(pastBound.rejected).toHaveLength(1);
    expect(pastBound.rejected[0]!.needed_km).toBeCloseTo(exactDistance, 6);
  });

  it('VOY-P-06 handles antimeridian candidates accurately (Suva -> Anchorage)', () => {
    const suva: Position = { lat: -18.1416, lon: 178.4419 };
    const anchorage: Candidate = {
      city: 'Anchorage',
      country: 'US',
      lat: 61.2181,
      lon: -149.9003,
      source: 'geodb',
      weight: 0.3,
    };
    const dist = haversineKm(suva, anchorage);
    expect(dist).toBeLessThan(10000);
    expect(filterByLight([anchorage], dist + 1, suva).kept).toHaveLength(1);
    expect(filterByLight([anchorage], dist - 1, suva).rejected).toHaveLength(1);
  });
});
