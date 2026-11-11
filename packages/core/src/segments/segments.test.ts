/**
 * Seed: 20261111 (L4 segments unit & fast-check properties)
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { FixedLink, Hop, Landmass, Location, Position } from '@packet-voyage/schema';
import { buildSegments, classifyCrossing, segmentKind } from './segments.ts';
import type { LocatedHop } from './segments.ts';
import { DEFAULT_SETTINGS } from '../settings.ts';

function dummyHop(ttl: number, envelopeMs?: number | null): Hop {
  return {
    ttl,
    replies: [{ ip: '192.0.2.1', rtt_ms: envelopeMs != null ? [envelopeMs] : [] }],
    class: 'documentation',
    envelope_ms: envelopeMs ?? null,
  };
}

function dummyLocation(city: string, lat: number, lon: number, country: string = 'FR'): Location {
  return {
    city,
    country,
    lat,
    lon,
    confidence: 0.9,
    level: 'solid',
    sources: ['ipmap-latency'],
    rejected: [],
  };
}

const sampleMasses: Landmass[] = [
  {
    id: 'eurasia',
    name: 'Eurasia',
    polygons: [
      [
        { lat: 35, lon: -10 },
        { lat: 35, lon: 40 },
        { lat: 70, lon: 40 },
        { lat: 70, lon: -10 },
      ],
      // hole: the British Isles
      [
        { lat: 49.5, lon: -9 },
        { lat: 49.5, lon: 1.6 },
        { lat: 59, lon: 1.6 },
        { lat: 59, lon: -9 },
      ],
    ],
  },
  {
    id: 'britain',
    name: 'Great Britain',
    polygons: [
      [
        { lat: 50, lon: -6 },
        { lat: 50, lon: 1.6 },
        { lat: 58, lon: 1.6 },
        { lat: 58, lon: -6 },
      ],
    ],
  },
];

const sampleLinks: FixedLink[] = [
  {
    id: 'channel-tunnel',
    name: 'Channel Tunnel',
    a: { lat: 51.0, lon: 1.8 },
    b: { lat: 51.1, lon: 1.3 },
    countries: ['FR', 'GB'],
  },
];

interface RawGenHop {
  located: boolean;
  env: number | null;
  lat: number;
  lon: number;
}

const rawHopArb = fc.record({
  located: fc.boolean(),
  env: fc.option(fc.double({ min: 0.1, max: 200, noNaN: true }), { nil: null }),
  lat: fc.double({ min: -60, max: 60, noNaN: true }),
  lon: fc.double({ min: -150, max: 150, noNaN: true }),
});

function toLocatedHops(rawHops: RawGenHop[]): LocatedHop[] {
  return rawHops.map((h, idx) => ({
    hop: dummyHop(idx + 1, h.env),
    location: h.located ? dummyLocation(`City-${idx}`, h.lat, h.lon) : null,
  }));
}

function checkNoSegmentOnUnlocated(hops: LocatedHop[]): void {
  const segments = buildSegments(hops, [], [], DEFAULT_SETTINGS);
  const locatedCount = hops.filter((h) => h.location !== null).length;

  if (locatedCount <= 1) {
    expect(segments).toHaveLength(0);
    return;
  }

  expect(segments).toHaveLength(locatedCount - 1);
  for (const seg of segments) {
    const fromHop = hops.find((h) => h.hop.ttl === seg.from_ttl);
    const toHop = hops.find((h) => h.hop.ttl === seg.to_ttl);
    expect(fromHop?.location).not.toBeNull();
    expect(toHop?.location).not.toBeNull();
  }
}

function checkSpannedPlusLocatedEqualsTotal(hops: LocatedHop[]): void {
  const segments = buildSegments(hops, [], [], DEFAULT_SETTINGS);
  const locatedCount = hops.filter((h) => h.location !== null).length;
  const firstLocatedIdx = hops.findIndex((h) => h.location !== null);
  const lastLocatedIdx = hops.findLastIndex((h) => h.location !== null);
  if (firstLocatedIdx < 0) return;
  const spannedBetween = segments.reduce((sum, s) => sum + s.skipped_hops, 0);
  expect(spannedBetween + locatedCount).toBe(lastLocatedIdx - firstLocatedIdx + 1);
}

describe('L4 segments — nature and assembly (VOY-F-21, VOY-F-22, VOY-F-25)', () => {
  it('VOY-F-22 classifies same-city or < localKm as local', () => {
    const a: Position = { lat: 48.8566, lon: 2.3522 };
    const b: Position = { lat: 48.86, lon: 2.36 };
    expect(segmentKind(a, b, sampleMasses, DEFAULT_SETTINGS)).toBe('local');
  });

  it('VOY-F-22 classifies same landmass as undetermined and distinct landmasses as sea', () => {
    const paris: Position = { lat: 48.8566, lon: 2.3522 };
    const berlin: Position = { lat: 52.52, lon: 13.405 };
    const london: Position = { lat: 51.5, lon: -0.12 };
    expect(segmentKind(paris, berlin, sampleMasses, DEFAULT_SETTINGS)).toBe('undetermined');
    expect(segmentKind(paris, london, sampleMasses, DEFAULT_SETTINGS)).toBe('sea');
  });

  it('VOY-F-25 identifies a fixed link as sea-or-fixed alternative', () => {
    const calais = dummyLocation('Calais', 50.95, 1.85, 'FR');
    const london = dummyLocation('London', 51.5, -0.12, 'GB');
    const classified = classifyCrossing(calais, london, sampleMasses, sampleLinks, DEFAULT_SETTINGS);
    expect(classified.kind).toBe('sea-or-fixed');
    expect(classified.fixed_link).toBe('Channel Tunnel');
    const noLink = classifyCrossing(calais, london, sampleMasses, [], DEFAULT_SETTINGS);
    expect(noLink.kind).toBe('sea');
    expect(noLink.fixed_link).toBeNull();
  });

  it('VOY-F-21 connects consecutive located hops and counts skipped silent hops', () => {
    const hops: LocatedHop[] = [
      { hop: dummyHop(1, 2.0), location: dummyLocation('Paris', 48.85, 2.35) },
      { hop: dummyHop(2, null), location: null },
      { hop: dummyHop(3, null), location: null },
      { hop: dummyHop(4, 15.0), location: dummyLocation('London', 51.5, -0.12, 'GB') },
    ];
    const segments = buildSegments(hops, sampleMasses, sampleLinks, DEFAULT_SETTINGS);
    expect(segments).toHaveLength(1);
    const seg = segments[0]!;
    expect(seg.from_ttl).toBe(1);
    expect(seg.to_ttl).toBe(4);
    expect(seg.skipped_hops).toBe(2);
    expect(seg.delta_ms).toBeCloseTo(13.0, 1);
    expect(seg.geodesic_km).toBeGreaterThan(300);
    expect(seg.kind).toBe('sea');
  });

  it('VOY-F-21 yields a null delta_ms when an envelope is unknown', () => {
    const hops: LocatedHop[] = [
      { hop: dummyHop(1, null), location: dummyLocation('Paris', 48.85, 2.35) },
      { hop: dummyHop(2, 15.0), location: dummyLocation('Lyon', 45.76, 4.83) },
    ];
    const segments = buildSegments(hops, sampleMasses, [], DEFAULT_SETTINGS);
    expect(segments[0]?.delta_ms).toBeNull();
  });
});

describe('L4 segments — properties (VOY-P-11)', () => {

  it('VOY-P-11 property: no segment starts or ends on an unlocated hop', () => {
    fc.assert(
      fc.property(fc.array(rawHopArb, { minLength: 0, maxLength: 20 }), (rawHops) => {
        checkNoSegmentOnUnlocated(toLocatedHops(rawHops));
      }),
      { numRuns: 100, seed: 20261111 },
    );
  });

  it('VOY-P-11 property: spanned hops plus located hops equal the hop window', () => {
    fc.assert(
      fc.property(fc.array(rawHopArb, { minLength: 0, maxLength: 20 }), (rawHops) => {
        checkSpannedPlusLocatedEqualsTotal(toLocatedHops(rawHops));
      }),
      { numRuns: 100, seed: 20261111 },
    );
  });
});
