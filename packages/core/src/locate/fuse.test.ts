import { describe, expect, it } from 'vitest';
import type { Candidate } from '@packet-voyage/schema';
import { DEFAULT_SETTINGS, withSettings } from '../settings.ts';
import { fuseCandidates } from './fuse.ts';

function cand(
  overrides: Partial<Candidate> & Pick<Candidate, 'city' | 'lat' | 'lon' | 'source' | 'weight'>,
): Candidate {
  return { country: 'FR', ...overrides };
}

describe('fuseCandidates merging (VOY-F-14)', () => {
  it('VOY-F-14 returns empty array for empty input', () => {
    expect(fuseCandidates([], DEFAULT_SETTINGS)).toEqual([]);
  });

  it('VOY-F-14 merges candidates from different sources within agreeRadiusKm using noisy-OR', () => {
    const c1 = cand({ city: 'Paris', lat: 48.8566, lon: 2.3522, source: 'ixp-prefix', weight: 0.8 });
    const c2 = cand({ city: 'Paris', lat: 48.86, lon: 2.35, source: 'name-hint', weight: 0.6 });
    const fused = fuseCandidates([c1, c2], DEFAULT_SETTINGS);

    expect(fused).toHaveLength(1);
    const merged = fused[0]!;
    // 1 - (1 - 0.8)(1 - 0.6) = 1 - 0.08 = 0.92
    expect(merged.weight).toBeCloseTo(0.92, 6);
    expect(merged.sources).toEqual(['ixp-prefix', 'name-hint']);
    expect(merged.source).toBe('ixp-prefix');
  });

  it('VOY-F-14 does not merge candidates from the same source even when close', () => {
    const a = cand({ city: 'Paris A', lat: 48.85, lon: 2.35, source: 'name-hint', weight: 0.6 });
    const b = cand({ city: 'Paris B', lat: 48.86, lon: 2.36, source: 'name-hint', weight: 0.6 });
    const fused = fuseCandidates([b, a], DEFAULT_SETTINGS);

    expect(fused).toHaveLength(2);
    expect(fused[0]!.city).toBe('Paris A');
    expect(fused[1]!.city).toBe('Paris B');
  });

  it('VOY-P-08 collapses exact same-source duplicates keeping the heaviest weight', () => {
    const base = { city: 'Paris', lat: 48.8566, lon: 2.3522, source: 'geodb' };
    const weak = cand({ ...base, weight: 0.2 });
    const strong = cand({ ...base, weight: 0.4, anycast: true });

    const fused = fuseCandidates([weak, strong], DEFAULT_SETTINGS);
    expect(fused).toHaveLength(1);
    expect(fused[0]!.weight).toBe(0.4);
    expect(fused[0]!.anycast).toBe(true);
    // Order-independent (VOY-P-08).
    expect(fuseCandidates([strong, weak], DEFAULT_SETTINGS)).toEqual(fused);
  });
});

describe('fuseCandidates determinism and settings (VOY-F-14, VOY-P-08)', () => {
  it('VOY-F-14 keeps candidates farther than agreeRadiusKm separate, sorted by city', () => {
    const paris = cand({ city: 'Paris', lat: 48.8566, lon: 2.3522, source: 'name-hint', weight: 0.6 });
    const london = cand({
      city: 'London',
      country: 'GB',
      lat: 51.5074,
      lon: -0.1278,
      source: 'geodb',
      weight: 0.3,
    });
    const fused = fuseCandidates([london, paris], DEFAULT_SETTINGS);

    expect(fused).toHaveLength(2);
    expect(fused[0]!.city).toBe('London');
    expect(fused[1]!.city).toBe('Paris');
  });

  it('VOY-P-08 produces identical output regardless of candidate input order', () => {
    const a = cand({ city: 'Paris', lat: 48.8566, lon: 2.3522, source: 'ipmap-latency', weight: 0.85 });
    const b = cand({ city: 'Paris', lat: 48.87, lon: 2.38, source: 'name-hint', weight: 0.6 });
    const c = cand({ city: 'Ashburn', country: 'US', lat: 39.0438, lon: -77.4874, source: 'geodb', weight: 0.3 });

    const r1 = fuseCandidates([a, b, c], DEFAULT_SETTINGS);
    const r2 = fuseCandidates([c, b, a], DEFAULT_SETTINGS);
    const r3 = fuseCandidates([b, c, a], DEFAULT_SETTINGS);

    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  it('VOY-F-14 respects custom agreeRadiusKm and preserves anycast flag', () => {
    const orly = cand({ city: 'Orly', lat: 48.7262, lon: 2.3652, source: 'name-hint', weight: 0.6 });
    const roissy = cand({
      city: 'Roissy',
      lat: 49.0097,
      lon: 2.5479,
      source: 'geodb',
      weight: 0.3,
      anycast: true,
    });
    // ~34 km apart -> separate at 20 km, merged at 50 km
    expect(fuseCandidates([orly, roissy], withSettings({ agreeRadiusKm: 20 }))).toHaveLength(2);
    const merged = fuseCandidates([orly, roissy], withSettings({ agreeRadiusKm: 50 }));
    expect(merged).toHaveLength(1);
    expect(merged[0]!.anycast).toBe(true);
  });
});
