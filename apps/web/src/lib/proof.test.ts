/**
 * The proof of a block: the figures it computed, computed once and read
 * everywhere (one implementation per logic).
 */
import { describe, expect, it } from 'vitest';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import type { Journey } from '@packet-voyage/schema';
import { proofFacts } from './proof.ts';

const HOP = SAMPLE_JOURNEY.hops[3] ?? null;

describe('proofFacts — the figures a block computed', () => {
  it('VOY-F-30 the map block proves the distance, the located hops, the cables and the floor', () => {
    expect(proofFacts({ journey: SAMPLE_JOURNEY, block: 'map' })).toEqual([
      { key: 'proof.distance', value: 6655, unit: 'km' },
      { key: 'proof.located', value: '9 / 10', unit: 'text' },
      { key: 'proof.cables', value: 4, unit: 'count' },
      { key: 'proof.floor', value: 63.6, unit: 'ms' },
    ]);
  });

  it('VOY-F-26 the insights block proves the floor, the inflation and what is left beyond the light', () => {
    const facts = proofFacts({ journey: SAMPLE_JOURNEY, block: 'insights' });
    expect(facts).toEqual([
      { key: 'proof.floor', value: 63.6, unit: 'ms' },
      { key: 'proof.inflation', value: 1.44, unit: 'ratio' },
      { key: 'proof.residual', value: 28.1, unit: 'ms' },
      { key: 'proof.countries', value: 3, unit: 'count' },
    ]);
  });

  it('VOY-F-35 the story block counts the log entries, the countries and the networks', () => {
    expect(proofFacts({ journey: SAMPLE_JOURNEY, block: 'story' })).toEqual([
      { key: 'proof.log', value: 4, unit: 'count' },
      { key: 'proof.countries', value: 3, unit: 'count' },
      { key: 'proof.networks', value: 3, unit: 'count' },
    ]);
  });

  it('the hop block names the hop, its certainty and the source of its position', () => {
    const facts = proofFacts({ journey: SAMPLE_JOURNEY, block: 'hop', hop: HOP });
    expect(facts).toEqual([
      { key: 'proof.hop', value: '#4', unit: 'text' },
      { key: 'proof.level', value: 'solid', unit: 'text' },
      { key: 'proof.source', value: 'ixp-prefix, name-hint', unit: 'text' },
      { key: 'proof.rejected', value: 1, unit: 'count' },
    ]);
  });

  it('a figure the journey does not carry stays null, and is never read as zero', () => {
    const withoutFloor: Journey = {
      ...SAMPLE_JOURNEY,
      summary: { ...SAMPLE_JOURNEY.summary, light_floor_ms: null, inflation: null },
    };
    const facts = proofFacts({ journey: withoutFloor, block: 'insights' });
    expect(facts.find((fact) => fact.key === 'proof.floor')?.value).toBeNull();
    expect(facts.find((fact) => fact.key === 'proof.residual')?.value).toBeNull();
    expect(facts.find((fact) => fact.key === 'proof.countries')?.value).toBe(3);
  });

  it('the comparison block counts the journeys it may choose from', () => {
    expect(proofFacts({ journey: SAMPLE_JOURNEY, block: 'compare', available: 7 })).toEqual([
      { key: 'proof.available', value: 7, unit: 'count' },
    ]);
  });
});
