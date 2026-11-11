import { describe, expect, it } from 'vitest';
import type { Candidate, Hop } from '@packet-voyage/schema';
import { computeEnvelopes } from '../envelope/index.ts';
import { DEFAULT_SETTINGS } from '../settings.ts';
import { locate } from './index.ts';

function hop(
  ttl: number,
  ip: string,
  rtts: number[],
  klass: Hop['class'],
  asn: number | null,
  name?: string,
  ixp?: string,
): Hop {
  return {
    ttl,
    replies: ip ? [{ ip, name: name ?? null, rtt_ms: rtts }] : [{ ip: '', rtt_ms: [], flags: ['timeout'] }],
    class: klass,
    asn,
    ixp: ixp ?? null,
  };
}

const LYON = { lat: 45.764, lon: 4.8357, label: 'Lyon', country: 'FR' };
const PARIS: Omit<Candidate, 'source' | 'weight'> = { city: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 };
const LONDON: Omit<Candidate, 'source' | 'weight'> = { city: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 };
const NY: Omit<Candidate, 'source' | 'weight'> = { city: 'New York', country: 'US', lat: 40.7128, lon: -74.006 };
const ASHBURN: Omit<Candidate, 'source' | 'weight'> = { city: 'Ashburn', country: 'US', lat: 39.0438, lon: -77.4874 };

/** The ten hops of the §7.14 worked example (Lyon -> Ashburn). */
const HOPS_714: Hop[] = [
  hop(1, '192.0.2.1', [1.2], 'documentation', null, 'gw.home.example'),
  hop(2, '192.0.2.10', [4.8], 'documentation', 64496, 'bras-lyon.access.example.net'),
  hop(3, '198.51.100.3', [9.1], 'public', 64496, 'ae1.par1.access.example.net'),
  hop(4, '198.51.100.9', [9.6], 'public', 64500, 'ix-paris.transit.example.net', 'Example-IX Paris'),
  hop(5, '198.51.100.21', [14.9], 'public', 64500, 'xe-0.lon2.transit.example.net'),
  hop(6, '198.51.100.22', [13.8], 'public', 64500, 'core-lon1.transit.example.net'),
  hop(7, '198.51.100.31', [88.4], 'public', 64500, 'ae0.nyc1.transit.example.net'),
  hop(8, '198.51.100.32', [86.9], 'public', 64500, 'core-nyc2.transit.example.net'),
  hop(9, '203.0.113.10', [92.3], 'public', 64510, 'edge-iad1.host.example.net'),
  hop(10, '203.0.113.80', [91.7], 'public', 64510, 'www.example.org'),
];

/** The candidate pools matching §7.14 ("Ce qui est su" column). */
const CANDIDATES_714: Candidate[][] = [
  [{ ...LYON, city: 'Lyon', source: 'declared', weight: 1.0 }],
  [],
  [{ ...PARIS, source: 'name-hint', weight: 0.6 }],
  [
    { ...PARIS, source: 'ixp-prefix', weight: 0.8 },
    { ...PARIS, source: 'name-hint', weight: 0.6 },
    { ...ASHBURN, source: 'geodb', weight: 0.3 },
  ],
  [{ ...LONDON, source: 'name-hint', weight: 0.6 }],
  [{ ...LONDON, source: 'ipmap-latency', weight: 0.85 }],
  [{ ...NY, source: 'name-hint', weight: 0.6 }],
  [{ ...NY, source: 'ipmap-latency', weight: 0.85 }],
  [{ ...ASHBURN, source: 'name-hint', weight: 0.6 }],
  [{ ...ASHBURN, source: 'ipmap-latency', weight: 0.85 }],
];

function run714() {
  return locate({
    hops: HOPS_714,
    candidates: CANDIDATES_714,
    envelopes: computeEnvelopes(HOPS_714),
    source: LYON,
    settings: DEFAULT_SETTINGS,
  });
}

describe('locate worked example §7.14 (VOY-F-14/16/17/18)', () => {
  it('reproduces §7.14 positions and confidence levels hop by hop', () => {
    const result = run714();
    expect(result.relativeOnly).toBe(false);
    expect(result.hops).toHaveLength(10);
    expect(result.hops[0]!.location?.city).toBe('Lyon');
    expect(result.hops[1]!.location).toBeNull();
    expect(result.hops[2]!.location).toMatchObject({ city: 'Paris', level: 'probable' });
    expect(result.hops[3]!.location).toMatchObject({
      city: 'Paris',
      level: 'solid',
      sources: ['ixp-prefix', 'name-hint'],
    });
    // Hop 5 announces 14.9 ms but hop 6 answers in 13.8: the envelope erases it.
    expect(result.hops[4]!.hop.envelope_ms).toBe(13.8);
    expect(result.hops[4]!.location).toMatchObject({ city: 'London', level: 'probable' });
    expect(result.hops[5]!.location).toMatchObject({ city: 'London', level: 'solid' });
  });

  it('reproduces §7.14 arrival hops and the single Ashburn rejection at hop 4', () => {
    const result = run714();
    expect(result.hops[6]!.location).toMatchObject({ city: 'New York', level: 'probable' });
    expect(result.hops[7]!.location).toMatchObject({ city: 'New York', level: 'solid' });
    expect(result.hops[8]!.location).toMatchObject({ city: 'Ashburn', level: 'probable' });
    expect(result.hops[9]!.location).toMatchObject({ city: 'Ashburn', level: 'solid' });

    // "9.6 ms allows 1,439 km at most (+50 slack); 6,496 km needed" (§7.14).
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]).toMatchObject({
      city: 'Ashburn',
      country: 'US',
      source: 'geodb',
      reason: 'light',
    });
    expect(result.rejected[0]!.allowed_km).toBeCloseTo(1488.992, 2);
    expect(result.rejected[0]!.needed_km).toBeGreaterThan(6490);
    expect(result.rejected[0]!.needed_km).toBeLessThan(6600);
    // The rejection is kept on the hop that produced it (the demo, §7.6).
    expect(result.hops[3]!.location!.rejected).toEqual(result.rejected);
  });
});

describe('locate declared source (VOY-F-19)', () => {
  it('VOY-F-19 places the declared city on the first non-public hop as declared/1.00', () => {
    const hops: Hop[] = [
      hop(1, '192.0.2.1', [1.2], 'documentation', null, 'gw.home.example'),
      hop(2, '198.51.100.3', [9.1], 'public', 64496, 'ae1.par1.access.example.net'),
    ];
    const result = locate({
      hops,
      candidates: [[], [{ ...PARIS, source: 'name-hint', weight: 0.6 }]],
      envelopes: computeEnvelopes(hops),
      source: LYON,
      settings: DEFAULT_SETTINGS,
    });
    expect(result.hops[0]!.location).toMatchObject({
      city: 'Lyon',
      country: 'FR',
      confidence: 1.0,
      level: 'solid',
      sources: ['declared'],
    });
    expect(result.hops[1]!.location?.city).toBe('Paris');
    expect(result.relativeOnly).toBe(false);
  });

  it('VOY-F-19 without a declared source nothing is invented and relativeOnly is set', () => {
    const hops: Hop[] = [
      hop(1, '192.0.2.1', [1.2], 'documentation', null),
      hop(2, '198.51.100.3', [9.1], 'public', 64496),
    ];
    const rel = locate({
      hops,
      candidates: [[], [{ ...PARIS, source: 'name-hint', weight: 0.6 }]],
      envelopes: computeEnvelopes(hops),
      source: null,
      settings: DEFAULT_SETTINGS,
    });
    expect(rel.relativeOnly).toBe(true);
    expect(rel.hops[0]!.location).toBeNull();
  });
});

describe('locate silent gaps (VOY-P-11)', () => {
  it('VOY-P-11 keeps silent hops unlocated without inventing positions', () => {
    const hops: Hop[] = [
      hop(1, '198.51.100.1', [9.1], 'public', 64500),
      hop(2, '', [], 'public', null),
      hop(3, '198.51.100.3', [13.8], 'public', 64500),
    ];
    const result = locate({
      hops,
      candidates: [
        [{ ...PARIS, source: 'name-hint', weight: 0.6 }],
        [],
        [{ ...LONDON, source: 'ipmap-latency', weight: 0.85 }],
      ],
      envelopes: computeEnvelopes(hops),
      source: LYON,
      settings: DEFAULT_SETTINGS,
    });
    expect(result.hops[0]!.location?.city).toBe('Paris');
    expect(result.hops[1]!.location).toBeNull();
    expect(result.hops[2]!.location?.city).toBe('London');
  });
});
