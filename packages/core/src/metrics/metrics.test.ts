/**
 * Seed: 20261113 (L4 metrics unit & fast-check properties)
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Hop, Location, Rejection } from '@packet-voyage/schema';
import { buildSegments } from '../segments/segments.ts';
import type { LocatedHop } from '../segments/segments.ts';
import { haversineKm } from '../geo/index.ts';
import { detectDetours, inflationOf, summarize } from './metrics.ts';
import { DEFAULT_SETTINGS } from '../settings.ts';

function hop(
  ttl: number,
  envMs: number | null,
  asn: number | null = 64512,
  ixp: string | null = null,
): Hop {
  return {
    ttl,
    replies: [{ ip: '192.0.2.1', rtt_ms: envMs != null ? [envMs] : [] }],
    class: 'documentation',
    asn,
    as_name: asn ? `AS${asn}` : null,
    ixp,
    envelope_ms: envMs,
  };
}

function loc(
  city: string,
  country: string | null,
  lat: number,
  lon: number,
  rejected: Rejection[] = [],
): Location {
  return {
    city,
    country,
    lat,
    lon,
    confidence: 0.9,
    level: 'solid',
    sources: ['ipmap-latency'],
    rejected,
  };
}

function lightRejection(city: string): Rejection {
  return {
    source: 'geodb',
    city,
    country: 'US',
    reason: 'light',
    allowed_km: 500,
    needed_km: 5500,
  };
}

function checkWorkedExample(): void {
  // Mirrors the §7.14 worked example shape: Paris -> (silent) -> London -> New York.
  const hops: LocatedHop[] = [
    { hop: hop(1, 2.0, 64512), location: loc('Paris', 'FR', 48.8566, 2.3522) },
    { hop: hop(2, null, null), location: null },
    {
      hop: hop(3, 18.6, 64513, 'LINX'),
      location: loc('London', 'GB', 51.5074, -0.1278, [lightRejection('Ashburn')]),
    },
    { hop: hop(4, 91.7, 64514), location: loc('New York', 'US', 40.7128, -74.006) },
  ];
  const segments = buildSegments(hops, [], [], DEFAULT_SETTINGS);
  const summary = summarize(hops, segments, DEFAULT_SETTINGS);

  const expectedDistance = segments.reduce((s, seg) => s + seg.geodesic_km, 0);
  expect(summary.distance_km_min).toBeCloseTo(expectedDistance, 6);
  expect(summary.rtt_ms).toBe(91.7);
  expect(summary.light_floor_ms).toBeGreaterThan(50);
  expect(summary.inflation).toBeGreaterThan(1);
  expect(summary.countries).toEqual(['FR', 'GB', 'US']);
  expect(summary.networks).toBe(3);
  expect(summary.ixps).toBe(1);
  expect(summary.rejected_by_light).toBe(1);
  expect(summary.gaps).toBe(1);
}

function checkDetourDetection(): void {
  const hops: LocatedHop[] = [
    { hop: hop(1, 5.0), location: loc('Paris', 'FR', 48.8566, 2.3522) },
    { hop: hop(2, 50.0), location: loc('New York', 'US', 40.7128, -74.006) },
    { hop: hop(3, 95.0), location: loc('Lyon', 'FR', 45.764, 4.8357) },
  ];
  const detours = detectDetours(hops, DEFAULT_SETTINGS);
  const kinds = detours.map((d) => d.kind);
  expect(kinds).toContain('country-return');
  expect(kinds).toContain('zigzag');

  const straight: LocatedHop[] = [
    { hop: hop(1, 5.0), location: loc('Paris', 'FR', 48.8566, 2.3522) },
    { hop: hop(2, 10.0), location: loc('London', 'GB', 51.5074, -0.1278) },
    { hop: hop(3, 80.0), location: loc('New York', 'US', 40.7128, -74.006) },
  ];
  expect(detectDetours(straight, DEFAULT_SETTINGS)).toEqual([]);
}

function checkInflationEdgeCases(): void {
  expect(inflationOf(100, 50)).toBe(2);
  expect(inflationOf(50, 50)).toBe(1);
  expect(inflationOf(10, 0)).toBe(Infinity);
  expect(inflationOf(0, 0)).toBe(1);
}

const p14SampleArb = fc.record({
  sLat: fc.double({ min: -70, max: 70, noNaN: true }),
  sLon: fc.double({ min: -179, max: 179, noNaN: true }),
  dLat: fc.double({ min: -70, max: 70, noNaN: true }),
  dLon: fc.double({ min: -179, max: 179, noNaN: true }),
  extraMs: fc.double({ min: 0, max: 200, noNaN: true }),
});

interface P14Sample {
  sLat: number;
  sLon: number;
  dLat: number;
  dLon: number;
  extraMs: number;
}

function checkP14Sample(s: P14Sample): void {
  const dKm = haversineKm({ lat: s.sLat, lon: s.sLon }, { lat: s.dLat, lon: s.dLon });
  const vacuumFloorMs = (2 * dKm) / DEFAULT_SETTINGS.lightVacuumKmPerMs;
  const rttMs = vacuumFloorMs + s.extraMs;
  // VOY-P-14 core: an accepted journey has rtt >= 2 d(S,D)/c, so vacuum inflation >= 1.
  expect(inflationOf(rttMs, vacuumFloorMs)).toBeGreaterThanOrEqual(1 - 1e-12);

  const hops: LocatedHop[] = [
    { hop: hop(1, 1.0), location: loc('S', 'FR', s.sLat, s.sLon) },
    { hop: hop(2, Math.max(1.0, rttMs)), location: loc('D', 'US', s.dLat, s.dLon) },
  ];
  const segments = buildSegments(hops, [], [], DEFAULT_SETTINGS);
  const summary = summarize(hops, segments, DEFAULT_SETTINGS);
  // The epsilon guard mirrors inflationOf's zero-floor branch (degenerate S == D).
  if (summary.light_floor_ms != null && summary.light_floor_ms > 1e-9) {
    expect(summary.inflation).toBeCloseTo((summary.rtt_ms ?? 0) / summary.light_floor_ms, 9);
  }
}

const p15RawHopArb = fc.record({
  located: fc.boolean(),
  country: fc.constantFrom('FR', 'GB', 'DE', 'US', 'JP', null),
  lat: fc.double({ min: -60, max: 60, noNaN: true }),
  lon: fc.double({ min: -150, max: 150, noNaN: true }),
  env: fc.option(fc.double({ min: 1, max: 150, noNaN: true }), { nil: null }),
  rejectCount: fc.integer({ min: 0, max: 4 }),
  asn: fc.option(fc.integer({ min: 64512, max: 64520 }), { nil: null }),
});

type P15RawHop = { located: boolean; country: string | null; lat: number; lon: number; env: number | null; rejectCount: number; asn: number | null };

function checkP15Hops(raw: P15RawHop[]): void {
  const hops: LocatedHop[] = raw.map((r, i) => ({
    hop: hop(i + 1, r.env, r.asn),
    location: r.located
      ? loc(
          `C${i}`,
          r.country,
          r.lat,
          r.lon,
          Array.from({ length: r.rejectCount }, (_, k) => lightRejection(`R${k}`)),
        )
      : null,
  }));

  const segments = buildSegments(hops, [], [], DEFAULT_SETTINGS);
  const summary = summarize(hops, segments, DEFAULT_SETTINGS);

  const expectedDist = segments.reduce((sum, seg) => sum + seg.geodesic_km, 0);
  expect(summary.distance_km_min).toBeCloseTo(expectedDist, 9);

  // §7.14 / §11.4: the summary lists each country once, in hop order.
  const expectedCountries: string[] = [];
  for (const h of hops) {
    const country = h.location?.country;
    if (country && !expectedCountries.includes(country)) expectedCountries.push(country);
  }
  expect(summary.countries).toEqual(expectedCountries);

  const expectedRejections = hops.reduce(
    (sum, h) => sum + (h.location?.rejected.filter((r) => r.reason === 'light').length ?? 0),
    0,
  );
  expect(summary.rejected_by_light).toBe(expectedRejections);
  expect(summary.gaps).toBe(hops.filter((h) => h.location === null).length);
}

describe('L4 metrics — VOY-F-26, VOY-F-27, VOY-F-28, VOY-P-14, VOY-P-15', () => {
  it('VOY-F-26 & VOY-F-27 compute the worked-example summary indicators', () => {
    checkWorkedExample();
  });

  it('VOY-F-28 detects country-return and zigzag detours, and none on a straight path', () => {
    checkDetourDetection();
  });

  it('VOY-F-26 inflationOf divides rtt by the floor, guarding against a zero floor', () => {
    checkInflationEdgeCases();
  });

  it('VOY-P-14 property: rtt >= 2 d(S,D)/c for accepted journeys, so vacuum inflation >= 1', () => {
    fc.assert(fc.property(p14SampleArb, checkP14Sample), { numRuns: 100, seed: 20261113 });
  });

  it('VOY-P-15 property: distance = sum of segments, countries = located hops only, rejections = flat count', () => {
    fc.assert(fc.property(fc.array(p15RawHopArb, { minLength: 0, maxLength: 15 }), checkP15Hops), {
      numRuns: 100,
      seed: 20261113,
    });
  });
});
