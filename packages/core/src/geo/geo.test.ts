import { describe, expect, it } from 'vitest';
import type { Landmass, Position } from '@packet-voyage/schema';
import {
  EARTH_RADIUS_KM,
  crossesWater,
  greatCirclePoints,
  haversineKm,
  landmassAt,
  pointInPolygon,
  toMiles,
} from './index.ts';

/* ------------------------------------------------------------ fixtures */

const PARIS: Position = { lat: 48.8566, lon: 2.3522 };
const LONDON: Position = { lat: 51.5074, lon: -0.1278 };
const NYC: Position = { lat: 40.7128, lon: -74.006 };
const LAX: Position = { lat: 34.0522, lon: -118.2437 };

/** Coarse square "continent" around France, with a hole shaped like a lake. */
function continent(): Landmass {
  const outer: Position[] = [
    { lat: 40, lon: -5 },
    { lat: 40, lon: 10 },
    { lat: 55, lon: 10 },
    { lat: 55, lon: -5 },
  ];
  const lake: Position[] = [
    { lat: 42, lon: 7 },
    { lat: 42, lon: 9 },
    { lat: 43, lon: 9 },
    { lat: 43, lon: 7 },
  ];
  return { id: 'west-europe', name: 'West Europe', polygons: [outer, lake] };
}

/** Small island in the middle of the Atlantic. */
function island(): Landmass {
  return {
    id: 'atlantis',
    name: 'Atlantis',
    polygons: [
      [
        { lat: 30, lon: -40 },
        { lat: 30, lon: -38 },
        { lat: 32, lon: -38 },
        { lat: 32, lon: -40 },
      ],
    ],
  };
}

/* ------------------------------------------------------------ haversine */

describe('haversineKm', () => {
  it('exposes the mean earth radius of the spec (6371 km)', () => {
    expect(EARTH_RADIUS_KM).toBe(6371);
  });

  it('measures Paris-London at its known great-circle distance', () => {
    expect(haversineKm(PARIS, LONDON)).toBeCloseTo(343.556, 1);
  });

  it('measures New York-Los Angeles at its known great-circle distance', () => {
    expect(haversineKm(NYC, LAX)).toBeCloseTo(3935.746, 0);
  });

  it('returns 0 for coincident points, whatever the longitude', () => {
    expect(haversineKm(PARIS, PARIS)).toBe(0);
    expect(haversineKm({ lat: 90, lon: 12 }, { lat: 90, lon: 12 })).toBe(0);
  });

  it('gives 111.195 km per degree on the equator and on the meridian', () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111.194927, 5);
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111.194927, 5);
  });

  it('is antimeridian-safe: one degree across 180° equals one degree elsewhere', () => {
    const across: Position[] = [
      { lat: 0, lon: 179.5 },
      { lat: 0, lon: -179.5 },
    ];
    const elsewhere: Position[] = [
      { lat: 0, lon: -0.5 },
      { lat: 0, lon: 0.5 },
    ];
    expect(haversineKm(across[0]!, across[1]!)).toBeCloseTo(111.194927, 5);
    expect(haversineKm(across[0]!, across[1]!)).toBeCloseTo(
      haversineKm(elsewhere[0]!, elsewhere[1]!),
      6,
    );
  });

  it('measures Suva (178°E) to 179.9°W as a short hop, not a world tour', () => {
    const suva: Position = { lat: -17.7134, lon: 178.065 };
    const eastOf180: Position = { lat: -17.7134, lon: -179.9 };
    expect(haversineKm(suva, eastOf180)).toBeCloseTo(215.55, 1);
  });

  it('never exceeds half the earth circumference', () => {
    const max = Math.PI * EARTH_RADIUS_KM;
    expect(haversineKm({ lat: 90, lon: 0 }, { lat: -90, lon: 0 })).toBeCloseTo(max, 6);
    expect(haversineKm(NYC, LAX)).toBeLessThanOrEqual(max);
  });
});

/* ------------------------------------------------------ greatCirclePoints */

describe('greatCirclePoints', () => {
  it('includes both endpoints exactly and steps + 1 positions', () => {
    const pts = greatCirclePoints(PARIS, NYC, 10);
    expect(pts).toHaveLength(11);
    expect(pts[0]).toEqual(PARIS);
    expect(pts[pts.length - 1]).toEqual(NYC);
  });

  it('defaults to 20 intervals', () => {
    expect(greatCirclePoints(PARIS, LONDON)).toHaveLength(21);
  });

  it('sums the intermediate legs back to the total distance', () => {
    const pts = greatCirclePoints(PARIS, NYC, 40);
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += haversineKm(pts[i - 1]!, pts[i]!);
    }
    expect(total).toBeCloseTo(haversineKm(PARIS, NYC), 6);
  });

  it('handles a segment across the antimeridian with sane longitudes', () => {
    const a: Position = { lat: 0, lon: 179 };
    const b: Position = { lat: 0, lon: -179 };
    const pts = greatCirclePoints(a, b, 4);
    expect(pts).toHaveLength(5);
    for (const p of pts) {
      expect(p.lon).toBeGreaterThanOrEqual(-180);
      expect(p.lon).toBeLessThanOrEqual(180);
    }
    // The arc goes east across 180°, it never tours the globe westward.
    expect(Math.abs(pts[2]!.lon)).toBeCloseTo(180, 6);
  });

  it('returns copies of a for coincident points and [a] for steps <= 0', () => {
    expect(greatCirclePoints(PARIS, PARIS, 3)).toEqual([PARIS, PARIS, PARIS, PARIS]);
    expect(greatCirclePoints(PARIS, NYC, 0)).toEqual([PARIS]);
  });
});

/* -------------------------------------------------------- pointInPolygon */

describe('pointInPolygon', () => {
  const rings = continent().polygons;

  it('finds Paris inside the continent, outside the lake', () => {
    expect(pointInPolygon(PARIS, rings)).toBe(true);
  });

  it('finds a point of the lake inside the hole, hence outside the polygon', () => {
    expect(pointInPolygon({ lat: 42.5, lon: 8 }, rings)).toBe(false);
  });

  it('rejects a point outside the outer ring and degenerate rings', () => {
    expect(pointInPolygon(LONDON, rings)).toBe(true); // London is inside coarse West Europe
    expect(pointInPolygon(NYC, rings)).toBe(false);
    expect(pointInPolygon(NYC, [])).toBe(false);
    expect(pointInPolygon(NYC, [[{ lat: 0, lon: 0 }]])).toBe(false);
  });

  it('supports an outer ring alone, with or without a repeated last point', () => {
    const open: Position[][] = [
      [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 10 },
        { lat: 10, lon: 10 },
        { lat: 10, lon: 0 },
      ],
    ];
    const closed: Position[][] = [[...open[0]!, open[0]![0]!]];
    expect(pointInPolygon({ lat: 5, lon: 5 }, open)).toBe(true);
    expect(pointInPolygon({ lat: 5, lon: 5 }, closed)).toBe(true);
    expect(pointInPolygon({ lat: 15, lon: 5 }, closed)).toBe(false);
  });
});

/* ------------------------------------------------- landmassAt, crossesWater */

describe('landmassAt and crossesWater', () => {
  const masses = [continent(), island()];

  it('returns the containing landmass, null on water', () => {
    expect(landmassAt(PARIS, masses)?.id).toBe('west-europe');
    expect(landmassAt({ lat: 31, lon: -39 }, masses)?.id).toBe('atlantis');
    expect(landmassAt({ lat: 31, lon: -39 }, [continent()])).toBeNull();
    expect(landmassAt(NYC, masses)).toBeNull();
  });

  it('sees water on the Paris-New York arc', () => {
    expect(crossesWater(PARIS, NYC, masses)).toBe(true);
  });

  it('keeps a fully continental segment on land', () => {
    const lyon: Position = { lat: 45.764, lon: 4.8357 };
    const milan: Position = { lat: 45.4642, lon: 9.19 };
    expect(crossesWater(lyon, milan, masses)).toBe(false);
  });

  it('honours the samples parameter', () => {
    expect(crossesWater(PARIS, NYC, masses, 8)).toBe(true);
    expect(crossesWater(PARIS, PARIS, masses, 4)).toBe(false);
  });
});

/* ----------------------------------------------------------------- toMiles */

describe('toMiles', () => {
  it('converts with the contracted factor 0.621371', () => {
    expect(toMiles(0)).toBe(0);
    expect(toMiles(1)).toBeCloseTo(0.621371, 12);
    expect(toMiles(100)).toBeCloseTo(62.1371, 9);
    expect(toMiles(-5)).toBeCloseTo(-3.106855, 9);
  });
});
