import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { HintCity } from '@packet-voyage/schema';
import {
  EXCLUDED_TOKENS,
  findHints,
  normalizeCityName,
  splitRouterName,
  stripTrailingDigits,
} from './index.ts';

const SAMPLE_TABLE: HintCity[] = [
  { code: 'PAR', city: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522, kind: 'city' },
  { code: 'CDG', city: 'Paris', country: 'FR', lat: 49.0097, lon: 2.5479, kind: 'airport' },
  { code: 'ORY', city: 'Paris', country: 'FR', lat: 48.7262, lon: 2.3652, kind: 'airport' },
  { code: 'LON', city: 'London', country: 'GB', lat: 51.5074, lon: -0.1278, kind: 'city' },
  { code: 'LHR', city: 'London', country: 'GB', lat: 51.47, lon: -0.4543, kind: 'airport' },
  { code: 'NYC', city: 'New York', country: 'US', lat: 40.7128, lon: -74.006, kind: 'city' },
  { code: 'JFK', city: 'New York', country: 'US', lat: 40.6413, lon: -73.7781, kind: 'airport' },
  { code: 'EWR', city: 'Newark', country: 'US', lat: 40.6895, lon: -74.1745, kind: 'airport' },
  { code: 'FRA', city: 'Frankfurt', country: 'DE', lat: 50.1109, lon: 8.6821, kind: 'city' },
  { code: 'AMS', city: 'Amsterdam', country: 'NL', lat: 52.3676, lon: 4.9041, kind: 'city' },
  { code: 'GIG', city: 'Rio de Janeiro', country: 'BR', lat: -22.8089, lon: -43.2436, kind: 'airport' },
];

describe('tokens and router name splitting', () => {
  it('strips trailing digits from fragments', () => {
    expect(stripTrailingDigits('par1')).toBe('par');
    expect(stripTrailingDigits('lon42')).toBe('lon');
    expect(stripTrailingDigits('nyc')).toBe('nyc');
    expect(stripTrailingDigits('10g')).toBe('10g');
    expect(stripTrailingDigits('404')).toBe('');
  });

  it('splits on dots, dashes and underscores', () => {
    expect(splitRouterName('ae3.par1.transit.example.net')).toEqual([
      'ae',
      'par',
      'transit',
      'example',
      'net',
    ]);
    expect(splitRouterName('xe-0-1-0_nyc2.core_example.com')).toEqual([
      'xe',
      'nyc',
      'core',
      'example',
      'com',
    ]);
  });

  it('drops empty tokens resulting from repeated delimiters', () => {
    expect(splitRouterName('..par1--lon2__')).toEqual(['par', 'lon']);
  });

  it('normalizes city names for comparison', () => {
    expect(normalizeCityName('New York')).toBe('newyork');
    expect(normalizeCityName('Frankfurt am Main')).toBe('frankfurtammain');
  });
});

describe('VOY-F-15 hints extraction', () => {
  it('identifies airport codes and city names in real-world router naming', () => {
    const hints = findHints('ae3.par1.transit.example.net', SAMPLE_TABLE);
    expect(hints).toHaveLength(1);
    expect(hints[0]?.city).toBe('Paris');
    expect(hints[0]?.code).toBe('PAR');
  });

  it('identifies London and New York in multi-hop names', () => {
    const lonHints = findHints('be2.lon4.core.example.net', SAMPLE_TABLE);
    expect(lonHints.map((h) => h.city)).toEqual(['London']);

    const nycHints = findHints('xe-0-0-0.nyc2.example.com', SAMPLE_TABLE);
    expect(nycHints.map((h) => h.city)).toEqual(['New York']);
  });

  it('matches full city names as well as three-letter codes', () => {
    const hints = findHints('router1.amsterdam.backbone.net', SAMPLE_TABLE);
    expect(hints.map((h) => h.city)).toEqual(['Amsterdam']);
  });

  it('discards fragments in the exclusion list (e.g. gig, net, core, transit)', () => {
    const hints = findHints('gig0-0-0.fra1.core.net', SAMPLE_TABLE);
    expect(hints.map((h) => h.city)).toEqual(['Frankfurt']);
    expect(hints.some((h) => h.city === 'Rio de Janeiro')).toBe(false);
  });

  it('deduplicates multiple matches for the same city in one router name', () => {
    const hints = findHints('cdg1-par2.edge.example.org', SAMPLE_TABLE);
    expect(hints).toHaveLength(1);
    expect(hints[0]?.city).toBe('Paris');
    expect(hints[0]?.code).toBe('CDG');
  });

  it('handles empty names and routers with zero matches', () => {
    expect(findHints('', SAMPLE_TABLE)).toEqual([]);
    expect(findHints('unknown-hop-01.localdomain', SAMPLE_TABLE)).toEqual([]);
    expect(findHints('gig.eth.net.core.agg', SAMPLE_TABLE)).toEqual([]);
  });
});

describe('VOY-F-15 property and exclusions', () => {
  it('preserves the closed excluded token list of the contract', () => {
    const tokens = [
      'gig', 'eth', 'net', 'cdn', 'agg', 'rtr', 'nat', 'core', 'edge',
      'border', 'peer', 'transit', 'host', 'vlan', 'ten', 'pop', 'gw', 'isp',
    ];
    for (const token of tokens) {
      expect(EXCLUDED_TOKENS).toContain(token);
    }
  });

  it('VOY-F-15 is deterministic, yields table members with distinct cities', () => {
    const excluded = fc
      .array(fc.constantFrom(...EXCLUDED_TOKENS), { minLength: 1, maxLength: 6 })
      .map((t) => t.join('.'));
    const routers = fc
      .array(fc.stringMatching(/^[a-z]{2,6}[0-9]{0,2}$/), { minLength: 1, maxLength: 6 })
      .map((t) => t.join('-'));

    fc.assert(
      fc.property(fc.oneof(excluded, routers), (hostName) => {
        const first = findHints(hostName, SAMPLE_TABLE);
        const second = findHints(hostName, SAMPLE_TABLE);
        expect(second).toEqual(first);
        for (const hint of first) {
          expect(SAMPLE_TABLE).toContain(hint);
        }
        const cities = first.map((h) => normalizeCityName(h.city));
        expect(new Set(cities).size).toBe(cities.length);
      }),
      { numRuns: 300 },
    );

    expect(findHints('gig.eth.net.core.agg.rtr.nat.edge.peer', SAMPLE_TABLE)).toEqual([]);
  });
});
