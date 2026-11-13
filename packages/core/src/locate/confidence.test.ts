import { describe, expect, it } from 'vitest';
import type { Candidate } from '@packet-voyage/schema';
import { DEFAULT_SETTINGS } from '../settings.ts';
import { applyTransitionPenalty, confidenceOf } from './confidence.ts';

function cand(source: string, weight: number): Candidate {
  return {
    city: 'Paris',
    country: 'FR',
    lat: 48.8566,
    lon: 2.3522,
    source,
    weight,
  };
}

describe('confidenceOf (VOY-F-18)', () => {
  it('VOY-F-18 assigns unlocated when kept list is empty', () => {
    expect(confidenceOf([], DEFAULT_SETTINGS)).toEqual({ confidence: 0, level: 'unlocated' });
  });

  it('VOY-F-18 maps thresholds solid >= 0.80, probable >= 0.50, uncertain < 0.50', () => {
    expect(confidenceOf([cand('ipmap-latency', 0.85)], DEFAULT_SETTINGS)).toEqual({
      confidence: 0.85,
      level: 'solid',
    });
    expect(confidenceOf([cand('ixp-prefix', 0.8)], DEFAULT_SETTINGS)).toEqual({
      confidence: 0.8,
      level: 'solid',
    });
    expect(confidenceOf([cand('name-hint', 0.6)], DEFAULT_SETTINGS)).toEqual({
      confidence: 0.6,
      level: 'probable',
    });
    expect(confidenceOf([cand('ipmap-rdns', 0.5)], DEFAULT_SETTINGS)).toEqual({
      confidence: 0.5,
      level: 'probable',
    });
    expect(confidenceOf([cand('geodb', 0.3)], DEFAULT_SETTINGS)).toEqual({
      confidence: 0.3,
      level: 'uncertain',
    });
  });

  it('VOY-F-18 raises confidence monotonically when adding concordant sources', () => {
    const one = confidenceOf([cand('name-hint', 0.6)], DEFAULT_SETTINGS);
    const two = confidenceOf([cand('name-hint', 0.6), cand('geodb', 0.3)], DEFAULT_SETTINGS);
    const three = confidenceOf(
      [cand('name-hint', 0.6), cand('geodb', 0.3), cand('ipmap-rdns', 0.5)],
      DEFAULT_SETTINGS,
    );

    expect(two.confidence).toBeCloseTo(0.72, 6);
    expect(two.confidence).toBeGreaterThanOrEqual(one.confidence);
    expect(three.confidence).toBeCloseTo(0.86, 6);
    expect(three.level).toBe('solid');
  });

  it('VOY-F-18 reduces confidence via transition penalty without dropping below 0', () => {
    const penalized = applyTransitionPenalty(0.8, 0.65);
    expect(penalized.confidence).toBeCloseTo(0.52, 6);
    expect(penalized.level).toBe('probable');

    const heavilyPenalized = applyTransitionPenalty(0.6, 0.5);
    expect(heavilyPenalized.confidence).toBeCloseTo(0.3, 6);
    expect(heavilyPenalized.level).toBe('uncertain');
  });
});
