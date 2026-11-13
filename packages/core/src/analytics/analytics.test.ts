import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { loadCables, loadFixedLinks, loadHints, loadLandmasses } from '@packet-voyage/data';
import type { Journey } from '@packet-voyage/schema';
import { computeJourney } from '../pipeline.ts';
import { parseTrace } from '../parse/index.ts';
import { checkVocabulary } from '../story/index.ts';
import { stepAllowedKm } from '../envelope/index.ts';
import { DEFAULT_SETTINGS } from '../settings.ts';
import { arbFullJourney } from '../testing/journey-arbitrary.ts';
import {
  applyExampleNetworks,
  EXAMPLE_CANDIDATES,
  EXAMPLE_SOURCE,
  EXAMPLE_TRACE,
  EXAMPLE_TRACED_AT,
} from '../fixtures/example-7-14.ts';
import { compareWithEra, inServiceInYear } from './era.ts';
import { distanceBounds } from './bounds.ts';
import { delayBreakdown } from './breakdown.ts';
import { compatibleMedia, GEO_ORBIT_KM, mediaForJourney } from './media.ts';

/** Seeds recorded so a counter-example can be replayed (§13). */
const SEED = 20261118;

function exampleJourney(): Journey {
  const parsed = parseTrace(EXAMPLE_TRACE);
  return computeJourney({
    parsed: { ...parsed, hops: applyExampleNetworks(parsed.hops) },
    candidates: EXAMPLE_CANDIDATES,
    source: EXAMPLE_SOURCE,
    tracedAt: EXAMPLE_TRACED_AT,
    masses: loadLandmasses(),
    cables: loadCables(),
    links: loadFixedLinks(),
    hints: loadHints(),
  });
}

describe('analytics on the §7.14 example', () => {
  const journey = exampleJourney();

  it('era: fewer cables were in service in 1987 than today', () => {
    const cables = loadCables();
    const comparison = compareWithEra({ journey, cables, year: 1987 });
    expect(comparison.available_then).toBe(inServiceInYear(cables, 1987).length);
    expect(comparison.available_then).toBeLessThan(cables.length);
    expect(comparison.undated).toBe(cables.filter((cable) => cable.rfs_year == null).length);
    expect(comparison.undated).toBeGreaterThan(0);
    expect(comparison.verdict.en).toMatch(/no commissioning year/);
    expect(comparison.crossings).toBeGreaterThan(0);
    expect(comparison.compatible_then.length).toBeLessThanOrEqual(comparison.available_then);
    expect(checkVocabulary(comparison.verdict.en).violations).toEqual([]);
    expect(checkVocabulary(comparison.verdict.fr).violations).toEqual([]);
    expect(comparison.verdict.en).toMatch(/under-represented/);
  });

  it('bounds: at least 6,654 km, at most what 91.7 ms of fibre can pay for', () => {
    const bounds = distanceBounds(journey);
    expect(bounds.min_km).toBeGreaterThan(6600);
    expect(bounds.min_km).toBeLessThan(6700);
    expect(bounds.max_km).not.toBeNull();
    expect(bounds.max_km!).toBeGreaterThan(bounds.min_km);
    expect(bounds.max_km!).toBeCloseTo((204 * 91.702) / 2, 0);
    expect(bounds.max_basis).toBe('fibre-delay-budget');
    expect(checkVocabulary(bounds.note.en).violations).toEqual([]);
  });

  it('breakdown: light takes 63.7 ms, the rest is inferred queueing', () => {
    const split = delayBreakdown(journey);
    expect(split.rtt_ms).toBeCloseTo(91.702, 2);
    expect(split.propagation_floor_ms).toBeCloseTo(63.7, 0);
    expect(split.residual_ms).toBeCloseTo((split.rtt_ms ?? 0) - (split.propagation_floor_ms ?? 0), 6);
    expect(split.residual_share).toBeGreaterThan(0.2);
    expect(split.residual_share).toBeLessThan(0.4);
    expect(split.clamped).toBe(false);
    expect(split.reading).toBe('inferred');
    expect(checkVocabulary(split.note.en).violations).toEqual([]);
    expect(checkVocabulary(split.note.fr).violations).toEqual([]);
  });

  it('media: light-speed media fit, a geostationary relay does not', () => {
    const media = mediaForJourney(journey);
    expect(media).toHaveLength(5);
    const byName = new Map(media.map((entry) => [entry.medium, entry]));
    expect(byName.get('vacuum')!.compatible).toBe(true);
    expect(byName.get('fibre')!.compatible).toBe(true);
    expect(byName.get('geostationary')!.compatible).toBe(false);
    expect(byName.get('geostationary')!.min_rtt_ms).toBeCloseTo((4 * GEO_ORBIT_KM) / 299.79, 0);
    const floors = media.map((entry) => entry.min_rtt_ms);
    expect(floors).toEqual([...floors].sort((a, b) => a - b));
  });
});

describe('analytics properties (§13)', () => {
  it(`bounds never invert and media stay monotone in distance (seed ${SEED})`, () => {
    fc.assert(
      fc.property(arbFullJourney, fc.double({ min: 0, max: 20000, noNaN: true }), (journey, km) => {
        const bounds = distanceBounds(journey);
        if (bounds.max_km !== null) expect(bounds.max_km).toBeGreaterThanOrEqual(0);
        expect(bounds.min_km).toBeGreaterThanOrEqual(0);
        const media = compatibleMedia(km, 1000);
        const floors = media.map((entry) => entry.min_rtt_ms);
        expect(floors).toEqual([...floors].sort((a, b) => a - b));
        for (const entry of media) expect(entry.compatible).toBe(1000 >= entry.min_rtt_ms - 1e-9);
        const split = delayBreakdown(journey);
        expect(split.residual_ms ?? 0).toBeGreaterThanOrEqual(0);
      }),
      { seed: SEED, numRuns: 60 },
    );
  });

  it('a null delay leaves no upper bound and no breakdown', () => {
    const journey = { ...exampleJourney(), summary: { ...exampleJourney().summary, rtt_ms: null } };
    expect(distanceBounds(journey).max_km).toBeNull();
    expect(delayBreakdown(journey).residual_ms).toBeNull();
    expect(compatibleMedia(1000, null).every((entry) => !entry.compatible)).toBe(true);
  });

  it('the light disc radius matches the envelope bound used by the map', () => {
    expect(stepAllowedKm(9.6, DEFAULT_SETTINGS)).toBeCloseTo((299.79 * 9.6) / 2 + 50, 6);
  });
});
