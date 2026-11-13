import { describe, expect, it } from 'vitest';
import type { Hop, Position } from '@packet-voyage/schema';
import { DEFAULT_SETTINGS } from '../settings.ts';
import { choosePositions, locate } from './index.ts';
import type { CandidateHop, FusedCandidate } from './types.ts';

function makeHop(ttl: number, envMs: number | null, asn: number | null = 64500): Hop {
  return {
    ttl,
    replies: envMs !== null ? [{ ip: `198.51.100.${ttl}`, rtt_ms: [envMs] }] : [],
    class: 'public',
    asn,
    envelope_ms: envMs,
  };
}

function makeCand(
  city: string,
  country: string,
  lat: number,
  lon: number,
  source: string,
  weight: number,
): FusedCandidate {
  return {
    city,
    country,
    lat,
    lon,
    source,
    weight,
    sources: [source],
    id: `${source}|${city}|${lat}|${lon}`,
  };
}

const LYON: Position = { lat: 45.764, lon: 4.8357 };
const PARIS = makeCand('Paris', 'FR', 48.8566, 2.3522, 'name-hint', 0.6);
const LONDON = makeCand('London', 'GB', 51.5074, -0.1278, 'name-hint', 0.6);
const NEW_YORK = makeCand('New York', 'US', 40.7128, -74.006, 'ipmap-latency', 0.85);

describe('choosePositions states (VOY-F-17)', () => {
  it('VOY-F-17 chooses unlocated when the only candidate has weight below unlocatedScore', () => {
    const hops: CandidateHop[] = [
      {
        hop: makeHop(1, 10),
        location: null,
        candidates: [makeCand('Paris', 'FR', 48.8566, 2.3522, 'geodb', 0.05)],
      },
    ];
    const chosen = choosePositions(hops, DEFAULT_SETTINGS, { source: LYON, envelopes: [10] });
    expect(chosen[0]!.location).toBeNull();
  });

  it('VOY-F-17 rejects a candidate beyond the step bound before the DP sees it', () => {
    // New York (~5,840 km from Lyon) with envelope 25 ms:
    // stepAllowedKm(25) = 3,797 km, so NY is rejected by light, never placed.
    const result = locate({
      hops: [makeHop(1, 10), makeHop(2, 25)],
      candidates: [[LONDON], [NEW_YORK]],
      envelopes: [10, 25],
      source: LYON,
      settings: DEFAULT_SETTINGS,
    });
    expect(result.hops[1]!.location).toBeNull();
    expect(result.rejected.some((r) => r.city === 'New York' && r.reason === 'light')).toBe(true);
  });
});

describe('choosePositions triangle bound (VOY-F-17, VOY-P-07)', () => {
  it('VOY-F-17 forbids a pair whose S-i-j-S perimeter exceeds c*env_j', () => {
    // Madrid (905 km from Lyon) and Berlin (965 km, 1,869 km from Madrid):
    // both pass their step bound at env = 10 ms (1,548 km) but the perimeter
    // 905 + 1,869 + 965 = 3,739 km > triangleAllowedKm(10) = 3,097.9 km.
    const madrid = makeCand('Madrid', 'ES', 40.4168, -3.7038, 'name-hint', 0.6);
    const berlin = makeCand('Berlin', 'DE', 52.52, 13.405, 'ipmap-latency', 0.85);

    const result = locate({
      hops: [makeHop(1, 10), makeHop(2, 10)],
      candidates: [[madrid], [berlin]],
      envelopes: [10, 10],
      source: LYON,
      settings: DEFAULT_SETTINGS,
    });

    // Berlin has the higher weight, so Madrid is dropped and Berlin is kept.
    expect(result.hops[1]!.location?.city).toBe('Berlin');
    expect(result.hops[0]!.location).toBeNull();
  });
});

describe('choosePositions penalties and bonus (VOY-F-17)', () => {
  it('VOY-F-17 penalises fibre budget overflow and reduces confidence without rejecting', () => {
    // Paris -> London is ~344 km; delta env = 1 ms gives a fibre budget of
    // 204*1/2 + 50 = 152 km: penalised (never rejected — radio is possible).
    const result = locate({
      hops: [makeHop(1, 10, 64500), makeHop(2, 11, 64501)],
      candidates: [[PARIS], [LONDON]],
      envelopes: [10, 11],
      source: LYON,
      settings: DEFAULT_SETTINGS,
    });
    expect(result.hops[0]!.location?.city).toBe('Paris');
    expect(result.hops[1]!.location?.city).toBe('London');
    expect(result.hops[1]!.location!.confidence).toBeLessThan(0.6);
    expect(result.hops[1]!.location!.level).toBe('uncertain');
  });

  it('VOY-F-17 grants same-ASN same-city <1ms bonus to break a tie', () => {
    const lyonCand = makeCand('Lyon', 'FR', 45.764, 4.8357, 'name-hint', 0.6);
    const result = locate({
      hops: [makeHop(1, 9.0, 64500), makeHop(2, 9.4, 64500)],
      candidates: [[PARIS], [lyonCand, PARIS]],
      envelopes: [9.0, 9.4],
      source: LYON,
      settings: DEFAULT_SETTINGS,
    });
    // Both hop-2 candidates weigh 0.6; Paris gets the same-network bonus.
    expect(result.hops[1]!.location?.city).toBe('Paris');
  });
});

describe('choosePositions determinism and relative mode (VOY-P-08, VOY-F-19)', () => {
  it('VOY-P-08 breaks equal-score ties deterministically by candidate id', () => {
    const alpha = makeCand('Alpha', 'FR', 46.0, 4.8, 'geodb', 0.5);
    const beta = makeCand('Beta', 'FR', 46.1, 4.9, 'geodb', 0.5);

    const r1 = locate({
      hops: [makeHop(1, 10)],
      candidates: [[beta, alpha]],
      envelopes: [10],
      source: LYON,
      settings: DEFAULT_SETTINGS,
    });
    const r2 = locate({
      hops: [makeHop(1, 10)],
      candidates: [[alpha, beta]],
      envelopes: [10],
      source: LYON,
      settings: DEFAULT_SETTINGS,
    });

    expect(r1.hops[0]!.location?.city).toBe('Alpha');
    expect(r1).toEqual(r2);
  });

  it('VOY-F-19 sets relativeOnly and applies only relative bounds without a source', () => {
    const result = locate({
      hops: [makeHop(1, 10), makeHop(2, 12)],
      candidates: [[PARIS], [NEW_YORK]],
      envelopes: [10, 12],
      source: null,
      settings: DEFAULT_SETTINGS,
    });

    expect(result.relativeOnly).toBe(true);
    // Relative bound at env=12ms: 2*d(Paris, NY) ~ 11,670 km > 3,697 km, so
    // Paris and NY cannot both be kept; NY (0.85) outweighs Paris (0.60).
    expect(result.hops[1]!.location?.city).toBe('New York');
    expect(result.hops[0]!.location).toBeNull();
  });
});

describe('anycast (VOY-F-20)', () => {
  it('VOY-F-20 flags hop anycast and retains only the delay-compatible instance', () => {
    const anycastParis = { ...makeCand('Paris', 'FR', 48.8566, 2.3522, 'ipmap-anycast', 0.5), anycast: true };
    const anycastTokyo = { ...makeCand('Tokyo', 'JP', 35.6762, 139.6503, 'ipmap-anycast', 0.5), anycast: true };
    const anycastFrankfurt = { ...makeCand('Frankfurt', 'DE', 50.1109, 8.6821, 'ipmap-anycast', 0.5), anycast: true };

    const result = locate({
      hops: [makeHop(1, 10)],
      candidates: [[anycastTokyo, anycastFrankfurt, anycastParis]],
      envelopes: [10],
      source: LYON,
      settings: DEFAULT_SETTINGS,
    });

    expect(result.hops[0]!.hop.anycast).toBe(true);
    expect(result.hops[0]!.location?.city).toBe('Paris');
    // Tokyo is beyond the step bound (rejected by light); among the remaining
    // instances the closest (Paris) is retained, Frankfurt is rejected anycast.
    expect(result.rejected.some((r) => r.city === 'Tokyo' && r.reason === 'light')).toBe(true);
    expect(result.rejected.some((r) => r.city === 'Frankfurt' && r.reason === 'anycast')).toBe(true);
  });
});
