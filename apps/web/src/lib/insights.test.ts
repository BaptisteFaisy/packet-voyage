import { describe, expect, it } from 'vitest';
import { compareWithEra, delayBreakdown, distanceBounds, mediaForJourney } from '@packet-voyage/core';
import { loadCables } from '@packet-voyage/data';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { eraChoices, formatMediaLabel, insightsModel, traceYearOf } from './insights.ts';

const CABLES = loadCables();

describe('insightsModel bounds (§5.2)', () => {
  it('carries the bounds of distanceBounds unchanged', () => {
    const { bounds } = insightsModel(SAMPLE_JOURNEY, CABLES, 1988);
    const expected = distanceBounds(SAMPLE_JOURNEY);
    expect(bounds.min_km).toBe(expected.min_km);
    expect(bounds.max_km).toBe(expected.max_km);
    expect(bounds.min_basis).toBe(expected.min_basis);
    expect(bounds.max_basis).toBe(expected.max_basis);
    expect(bounds.note).toEqual(expected.note);
    expect(bounds.min_km).toBe(SAMPLE_JOURNEY.summary.distance_km_min);
  });

  it('has no upper bound when nothing was measured', () => {
    const silent = { ...SAMPLE_JOURNEY, summary: { ...SAMPLE_JOURNEY.summary, rtt_ms: null } };
    const { bounds } = insightsModel(silent, CABLES, 1988);
    expect(bounds.max_km).toBeNull();
    expect(bounds.max_basis).toBeNull();
  });
});

describe('insightsModel breakdown (§5.3)', () => {
  it('adds the residual and the light floor back to the measured delay', () => {
    const { breakdown } = insightsModel(SAMPLE_JOURNEY, CABLES, 1988);
    expect(breakdown).toEqual(delayBreakdown(SAMPLE_JOURNEY));
    const rtt = breakdown.rtt_ms ?? Number.NaN;
    const floor = breakdown.propagation_floor_ms ?? Number.NaN;
    const residual = breakdown.residual_ms ?? Number.NaN;
    expect(residual + floor).toBeCloseTo(rtt, 6);
    expect(breakdown.residual_share).toBeCloseTo(residual / rtt, 6);
  });

  it('breaks nothing down without a measured delay', () => {
    const silent = { ...SAMPLE_JOURNEY, summary: { ...SAMPLE_JOURNEY.summary, rtt_ms: null } };
    const { breakdown } = insightsModel(silent, CABLES, 1988);
    expect(breakdown.rtt_ms).toBeNull();
    expect(breakdown.residual_ms).toBeNull();
    expect(breakdown.residual_share).toBeNull();
  });
});

describe('insightsModel media (§5.3)', () => {
  it('lists the five media sorted by the delay each would need', () => {
    const { media } = insightsModel(SAMPLE_JOURNEY, CABLES, 1988);
    expect(media).toEqual(mediaForJourney(SAMPLE_JOURNEY));
    expect(media).toHaveLength(5);
    const rtts = media.map((item) => item.min_rtt_ms);
    expect(rtts).toEqual([...rtts].sort((a, b) => a - b));
  });

  it('rules a geostationary relay out for a transatlantic delay', () => {
    const { media } = insightsModel(SAMPLE_JOURNEY, CABLES, 1988);
    const geo = media.find((item) => item.medium === 'geostationary');
    expect(geo?.compatible).toBe(false);
    expect(geo?.min_rtt_ms).toBeGreaterThan(SAMPLE_JOURNEY.summary.rtt_ms ?? 0);
    for (const item of media.filter((entry) => entry.medium !== 'geostationary')) {
      expect(item.compatible).toBe(true);
    }
  });
});

describe('insightsModel era (§5.4)', () => {
  it('carries the comparison of compareWithEra unchanged', () => {
    const { era } = insightsModel(SAMPLE_JOURNEY, CABLES, 1988);
    const expected = compareWithEra({ journey: SAMPLE_JOURNEY, cables: CABLES, year: 1988 });
    expect(era).toEqual(expected);
    expect(era.year).toBe(1988);
    expect(era.crossings).toBe(2);
  });

  it('sees no dated cable in service in 1988 and says the dataset is blind', () => {
    const { era } = insightsModel(SAMPLE_JOURNEY, CABLES, 1988);
    expect(era.available_then).toBe(0);
    expect(era.compatible_then).toHaveLength(0);
    expect(era.undated).toBeGreaterThan(0);
    expect(era.compatible_now.length).toBeGreaterThan(era.compatible_then.length);
    expect(era.verdict.en).toContain('invisible to this comparison');
  });

  it('still answers with an empty cable pool', () => {
    const { era } = insightsModel(SAMPLE_JOURNEY, [], 1988);
    expect(era.available_then).toBe(0);
    expect(era.compatible_then).toHaveLength(0);
    expect(era.compatible_now).toHaveLength(0);
  });
});

describe('eraChoices', () => {
  it('contains the trace year and is strictly ordered', () => {
    const years = eraChoices(SAMPLE_JOURNEY);
    expect(years).toContain(traceYearOf(SAMPLE_JOURNEY));
    expect(years).toContain(1988);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    expect(new Set(years).size).toBe(years.length);
    expect(years[years.length - 1]).toBe(traceYearOf(SAMPLE_JOURNEY));
  });

  it('offers nothing after the trace', () => {
    const early = { ...SAMPLE_JOURNEY, traced_at: '1990-05-01T00:00:00Z' };
    expect(eraChoices(early)).toEqual([1988, 1990]);
  });

  it('reads the year where the trace was taken, not in UTC', () => {
    const newYearEve = { ...SAMPLE_JOURNEY, traced_at: '2027-01-01T00:30:00+02:00' };
    expect(traceYearOf(newYearEve)).toBe(2027);
    expect(eraChoices(newYearEve)).toContain(2027);
  });
});

describe('formatMediaLabel', () => {
  it('names the five media from the single table of the core', () => {
    expect(formatMediaLabel('vacuum', 'en')).toBe('vacuum');
    expect(formatMediaLabel('vacuum', 'fr')).toBe('vide');
    expect(formatMediaLabel('microwave', 'en')).toBe('microwave in air');
    expect(formatMediaLabel('microwave', 'fr')).toBe('faisceau hertzien');
    expect(formatMediaLabel('copper', 'en')).toBe('copper / coax');
    expect(formatMediaLabel('copper', 'fr')).toBe('cuivre / coaxial');
    expect(formatMediaLabel('fibre', 'en')).toBe('optical fibre');
    expect(formatMediaLabel('fibre', 'fr')).toBe('fibre optique');
    expect(formatMediaLabel('geostationary', 'en')).toBe('geostationary relay');
    expect(formatMediaLabel('geostationary', 'fr')).toBe('relais géostationnaire');
  });
});
