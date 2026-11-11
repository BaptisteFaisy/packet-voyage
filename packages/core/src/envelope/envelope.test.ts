import { describe, expect, it } from 'vitest';
import type { Hop } from '@packet-voyage/schema';
import { DEFAULT_SETTINGS, withSettings } from '../settings.ts';
import {
  computeEnvelopes,
  lightBudgetKm,
  lightFloorMs,
  minDelayMs,
  stepAllowedKm,
  triangleAllowedKm,
} from './index.ts';

function makeHop(ttl: number, rtts: number[]): Hop {
  return {
    ttl,
    replies: [
      {
        ip: `192.0.2.${ttl}`,
        rtt_ms: rtts,
      },
    ],
    class: 'public',
  };
}

function makeSilentHop(ttl: number): Hop {
  return {
    ttl,
    replies: [
      {
        ip: '',
        rtt_ms: [],
        flags: ['timeout'],
      },
    ],
    class: 'public',
  };
}

describe('computeEnvelopes and minDelayMs', () => {
  it('extracts minDelayMs across multiple replies and probes', () => {
    const hop: Hop = {
      ttl: 1,
      replies: [
        { ip: '1.1.1.1', rtt_ms: [10.5, 9.2] },
        { ip: '1.1.1.2', rtt_ms: [12.0, 8.4] },
      ],
      class: 'public',
    };
    expect(minDelayMs(hop)).toBe(8.4);
    expect(minDelayMs(makeSilentHop(2))).toBeNull();
  });

  it('erases slow-to-answer hops (example §7.6: hop 5 at 14.9, hop 6 at 13.8)', () => {
    const hops = [
      makeHop(1, [1.2]),
      makeHop(2, [4.8]),
      makeHop(3, [9.1]),
      makeHop(4, [10.2]),
      makeHop(5, [14.9]),
      makeHop(6, [13.8]),
      makeHop(7, [20.0]),
    ];
    const envs = computeEnvelopes(hops);
    expect(envs).toEqual([1.2, 4.8, 9.1, 10.2, 13.8, 13.8, 20.0]);
    // Hop 5 is smoothed to 13.8 ms because hop 6 was reached faster
    expect(envs[4]).toBe(13.8);
  });

  it('keeps silent hops at null without corrupting the running min of earlier hops', () => {
    const hops = [
      makeHop(1, [5.0]),
      makeSilentHop(2),
      makeHop(3, [4.0]),
    ];
    const envs = computeEnvelopes(hops);
    expect(envs).toEqual([4.0, null, 4.0]);
  });

  it('handles empty trace or all-silent trace', () => {
    expect(computeEnvelopes([])).toEqual([]);
    expect(computeEnvelopes([makeSilentHop(1), makeSilentHop(2)])).toEqual([null, null]);
  });
});

describe('light bounds (§7.6, §7.11)', () => {
  const settings = DEFAULT_SETTINGS;

  it('computes lightBudgetKm as c * rtt / 2', () => {
    // 299.79 * 10 / 2 = 1498.95 km
    expect(lightBudgetKm(10, settings.lightVacuumKmPerMs)).toBeCloseTo(1498.95, 6);
    expect(lightBudgetKm(0, settings.lightVacuumKmPerMs)).toBe(0);
  });

  it('computes stepAllowedKm with slack', () => {
    // c * env / 2 + slack
    // 299.79 * 10 / 2 + 50 = 1548.95 km
    expect(stepAllowedKm(10, settings)).toBeCloseTo(1548.95, 6);
  });

  it('computes triangleAllowedKm with two slacks', () => {
    // c * envJ + 2 * slack
    // 299.79 * 10 + 100 = 3097.9 km
    expect(triangleAllowedKm(10, settings)).toBeCloseTo(3097.9, 6);
  });

  it('computes lightFloorMs in fibre (2d / c_fibre)', () => {
    // 6499.69 km (Lyon-Ashburn) in fibre at 204 km/ms -> 63.72 ms
    expect(lightFloorMs(6499.69, settings)).toBeCloseTo(63.722, 2);
  });

  it('respects custom settings passed to bound helpers', () => {
    const custom = withSettings({
      lightVacuumKmPerMs: 300,
      lightFibreKmPerMs: 200,
      slackKm: 100,
    });
    expect(stepAllowedKm(10, custom)).toBe(1500 + 100);
    expect(triangleAllowedKm(10, custom)).toBe(3000 + 200);
    expect(lightFloorMs(1000, custom)).toBe(10);
  });
});
