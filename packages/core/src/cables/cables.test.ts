/**
 * Seed: 20261112 (L4 cables unit & fast-check properties)
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Cable, CableMatch, Landing, Position } from '@packet-voyage/schema';
import { bestLandingPair, cableSegmentLengthKm, compatibleCables, scoreCable } from './cables.ts';
import type { SegmentWithContext } from './cables.ts';
import { haversineKm } from '../geo/index.ts';
import { DEFAULT_SETTINGS, withSettings } from '../settings.ts';
import type { Settings } from '../settings.ts';

const CORNWALL: Landing = { name: 'Cornwall, GB', country: 'GB', lat: 50.08, lon: -5.65 };
const NEW_YORK: Landing = { name: 'New York, US', country: 'US', lat: 40.64, lon: -73.78 };
const MARSEILLE: Landing = { name: 'Marseille, FR', country: 'FR', lat: 43.3, lon: 5.37 };
const LONDON: Position = { lat: 51.5, lon: -0.12 };
const NYC_POS: Position = { lat: 40.71, lon: -74.0 };
const TRACED_AT = '2026-11-11T00:00:00Z';

const ATLANTIC_GEOMETRY: Position[][] = [
  [
    { lat: 50.08, lon: -5.65 },
    { lat: 46.0, lon: -40.0 },
    { lat: 40.64, lon: -73.78 },
  ],
];

function makeCable(overrides: Partial<Cable> & { id: string; name: string }): Cable {
  return {
    status: 'in-service',
    landings: [CORNWALL, NEW_YORK],
    geometry: ATLANTIC_GEOMETRY,
    source: 'osm-cables',
    length_km: 5600,
    rfs_year: 2018,
    owners: ['ExampleCarrier'],
    ...overrides,
  };
}

function makeSeaSegment(overrides: Partial<SegmentWithContext> = {}): SegmentWithContext {
  return {
    from_ttl: 6,
    to_ttl: 7,
    kind: 'sea',
    geodesic_km: 5570,
    delta_ms: 73.1,
    skipped_hops: 0,
    cables: [],
    other_cables: 0,
    fixed_link: null,
    context: {
      from: LONDON,
      to: NYC_POS,
      fromAsName: 'ExampleCarrier Global',
      toAsName: 'OtherNet',
    },
    ...overrides,
  };
}

function checkServiceFilterAndLocalExclusion(): void {
  const seg = makeSeaSegment();
  const cables = [
    makeCable({ id: 'c1', name: 'Transatlantic A' }),
    makeCable({ id: 'c2', name: 'Retired Cable', status: 'retired' }),
    makeCable({ id: 'c3', name: 'Future Cable', rfs_year: 2030 }),
    // Two landings, but the A -> Marseille -> New York -> B detour is too slow for 73 ms.
    makeCable({ id: 'c4', name: 'Detoured Cable', landings: [MARSEILLE, NEW_YORK], geometry: [] }),
  ];
  const res = compatibleCables(seg, cables, TRACED_AT, DEFAULT_SETTINGS);
  expect(res.cables.map((c) => c.id)).toEqual(['c1']);
  expect(res.other_cables).toBe(0);
  expect(res.cables[0]?.band).toBe('high');
  expect(res.cables[0]?.compatibility).toBeGreaterThanOrEqual(0.6);

  const localRes = compatibleCables(
    makeSeaSegment({ kind: 'local' }),
    cables,
    TRACED_AT,
    DEFAULT_SETTINGS,
  );
  expect(localRes).toEqual({ cables: [], other_cables: 0 });
}

function checkCableCardMetadata(): void {
  const cable = makeCable({
    id: 'sample-atlantic',
    name: 'Sample Atlantic',
    owners: ['Telco A', 'ExampleCarrier'],
    rfs_year: 2019,
    length_km: 6605,
  });
  const res = compatibleCables(makeSeaSegment(), [cable], TRACED_AT, DEFAULT_SETTINGS);
  expect(res.cables).toHaveLength(1);
  const card = res.cables[0]!;
  expect(card.name).toBe('Sample Atlantic');
  expect(card.landings).toEqual(['Cornwall, GB', 'New York, US']);
  expect(card.length_km).toBe(6605);
  expect(card.rfs_year).toBe(2019);
  expect(card.owners).toEqual(['Telco A', 'ExampleCarrier']);
  expect(card.source).toBe('osm-cables');
}

function checkOperatorScoring(): void {
  const seg = makeSeaSegment({
    context: { from: LONDON, to: NYC_POS, fromAsName: 'NoMatchA', toAsName: 'NoMatchB' },
  });
  const unknownOwners = scoreCable(makeCable({ id: 'u', name: 'U', owners: [] }), seg, DEFAULT_SETTINGS);
  const mismatchOwners = scoreCable(
    makeCable({ id: 'm', name: 'M', owners: ['DifferentCorp'] }),
    seg,
    DEFAULT_SETTINGS,
  );
  const matchOwners = scoreCable(makeCable({ id: 'k', name: 'K' }), makeSeaSegment(), DEFAULT_SETTINGS);
  expect(unknownOwners.compatibility).toBeGreaterThan(mismatchOwners.compatibility);
  expect(matchOwners.compatibility).toBeGreaterThan(unknownOwners.compatibility);
  for (const scored of [unknownOwners, mismatchOwners, matchOwners]) {
    expect(scored.compatibility).toBeGreaterThanOrEqual(0);
    expect(scored.compatibility).toBeLessThanOrEqual(1);
    expect(['high', 'medium', 'low']).toContain(scored.band);
  }
}

function checkMaxShownAndOtherCount(): void {
  const settings = withSettings({ maxCablesShown: 2 });
  const cables = [1, 2, 3].map((n) =>
    makeCable({ id: `c${n}`, name: `Cable ${n}`, length_km: 5400 + n * 100, geometry: [] }),
  );
  const res = compatibleCables(makeSeaSegment({ delta_ms: 90 }), cables, TRACED_AT, settings);
  expect(res.cables.length).toBeLessThanOrEqual(2);
  const full = compatibleCables(
    makeSeaSegment({ delta_ms: 90 }),
    cables,
    TRACED_AT,
    withSettings({ maxCablesShown: 100 }),
  );
  expect(res.cables.length + res.other_cables).toBe(full.cables.length);
}

interface CableSpec {
  idx: number;
  status: Cable['status'];
  rfsYear: number;
  lengthKm: number;
  twoSides: boolean;
}

const cableSpecArb = fc.record({
  idx: fc.integer({ min: 0, max: 999 }),
  status: fc.constantFrom('in-service' as const, 'retired' as const, 'planned' as const),
  rfsYear: fc.integer({ min: 1995, max: 2032 }),
  lengthKm: fc.integer({ min: 5200, max: 18000 }),
  twoSides: fc.boolean(),
});

function cablesFromSpecs(specs: CableSpec[]): Cable[] {
  return specs.map((s, i) => ({
    id: `cable-${i}-${s.idx}`,
    name: `Cable ${s.idx}`,
    status: s.status,
    rfs_year: s.rfsYear,
    length_km: s.lengthKm,
    owners: ['ExampleCarrier'],
    landings: s.twoSides ? [CORNWALL, NEW_YORK] : [MARSEILLE],
    geometry: [],
    source: 'osm-cables',
  }));
}

function checkListedCableInvariants(
  res: { cables: CableMatch[]; other_cables: number },
  cables: Cable[],
  seg: SegmentWithContext,
  settings: Settings,
): void {
  const byId = new Map(cables.map((c) => [c.id, c]));
  for (const match of res.cables) {
    const orig = byId.get(match.id)!;
    expect(orig.status).toBe('in-service');
    expect(orig.rfs_year).toBeLessThanOrEqual(2026);
    expect(orig.landings.length).toBeGreaterThanOrEqual(2);
    expect(new Set(match.landings).size).toBe(2);
    expect(match.compatibility).toBeGreaterThanOrEqual(0);
    expect(match.compatibility).toBeLessThanOrEqual(1);
    const pair = bestLandingPair(orig, seg, settings);
    expect(pair).not.toBeNull();
    if (seg.delta_ms != null) {
      expect(pair!.expectedMs).toBeLessThanOrEqual(
        seg.delta_ms * (1 + settings.cableTolerance) + 1e-9,
      );
    }
  }
  for (let i = 1; i < res.cables.length; i += 1) {
    expect(res.cables[i - 1]!.compatibility).toBeGreaterThanOrEqual(res.cables[i]!.compatibility);
  }
}

function checkP13Invariants(specs: CableSpec[], maxCablesShown: number): void {
  const settings = withSettings({ maxCablesShown });
  const seg = makeSeaSegment({ delta_ms: 80 });
  const cables = cablesFromSpecs(specs);

  const res = compatibleCables(seg, cables, TRACED_AT, settings);
  const reversedRes = compatibleCables(seg, [...cables].reverse(), TRACED_AT, settings);
  expect(res.cables).toEqual(reversedRes.cables);
  expect(res.other_cables).toBe(reversedRes.other_cables);
  expect(res.cables.length).toBeLessThanOrEqual(maxCablesShown);

  checkListedCableInvariants(res, cables, seg, settings);

  const allRes = compatibleCables(seg, cables, TRACED_AT, withSettings({ maxCablesShown: 1000 }));
  expect(res.cables.length + res.other_cables).toBe(allRes.cables.length);
}

describe('L4 cables — VOY-F-23, VOY-F-24, VOY-P-13', () => {
  it('VOY-F-23 lists only compatible in-service cables and none for local segments', () => {
    checkServiceFilterAndLocalExclusion();
  });

  it('VOY-F-24 preserves cable card metadata (landings, length, rfs_year, owners, source)', () => {
    checkCableCardMetadata();
  });

  it('VOY-F-23 scores operator match above unknown owners above mismatch, within [0,1]', () => {
    checkOperatorScoring();
  });

  it('VOY-F-23 shows at most maxCablesShown cables with the exact other_cables count', () => {
    checkMaxShownAndOtherCount();
  });

  it('VOY-F-23 measures the cable leg along geometry when usable, else cableFactor x straight line', () => {
    const withGeometry = makeCable({ id: 'g', name: 'Geometric' });
    const withoutGeometry = makeCable({ id: 'n', name: 'Straight', geometry: [] });
    const geomKm = cableSegmentLengthKm(withGeometry, CORNWALL, NEW_YORK, DEFAULT_SETTINGS);
    const fallbackKm = cableSegmentLengthKm(withoutGeometry, CORNWALL, NEW_YORK, DEFAULT_SETTINGS);
    // Geometry follows the drawn polyline (longer than the chord it spans).
    expect(geomKm).toBeGreaterThan(haversineKm(CORNWALL, NEW_YORK));
    // Without usable geometry, the rule of §7.10 is cableFactor x straight-line distance.
    expect(fallbackKm).toBeCloseTo(
      DEFAULT_SETTINGS.cableFactor * haversineKm(CORNWALL, NEW_YORK),
      6,
    );
    // `length_km` is dataset metadata for the card (VOY-F-24), never a delay input.
    const inflated = makeCable({ id: 'x', name: 'Inflated metadata', geometry: [], length_km: 99000 });
    expect(cableSegmentLengthKm(inflated, CORNWALL, NEW_YORK, DEFAULT_SETTINGS)).toBeCloseTo(
      fallbackKm,
      6,
    );
  });

  it('VOY-F-23 is deterministic: same inputs give byte-identical results', () => {
    const cables = [1, 2, 3, 4].map((n) =>
      makeCable({ id: `c${n}`, name: `Cable ${n}`, geometry: [], length_km: 5400 + n * 90 }),
    );
    const seg = makeSeaSegment();
    const a = compatibleCables(seg, cables, TRACED_AT, DEFAULT_SETTINGS);
    const b = compatibleCables(seg, cables, TRACED_AT, DEFAULT_SETTINGS);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('VOY-P-13 property: listed cables in service, landings both sides, delay respected, score in [0,1], stable order, <= maxCablesShown, exact other count', () => {
    fc.assert(
      fc.property(
        fc.array(cableSpecArb, { minLength: 0, maxLength: 14 }),
        fc.integer({ min: 1, max: 5 }),
        (specs, maxShown) => checkP13Invariants(specs, maxShown),
      ),
      { numRuns: 100, seed: 20261112 },
    );
  });
});
