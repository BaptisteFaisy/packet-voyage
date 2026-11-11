import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Journey } from '@packet-voyage/schema';
import { DEFAULT_SETTINGS } from '../settings.ts';
import { arbFullJourney } from '../testing/journey-arbitrary.ts';
import {
  applyExampleNetworks,
  EXAMPLE_CANDIDATES,
  EXAMPLE_SOURCE,
  EXAMPLE_TRACE,
  EXAMPLE_TRACED_AT,
} from '../fixtures/example-7-14.ts';
import { computeJourney } from '../pipeline.ts';
import { parseTrace } from '../parse/index.ts';
import { loadCables, loadFixedLinks, loadHints, loadLandmasses } from '@packet-voyage/data';
import { buildStory } from './story.ts';
import { passport } from './passport.ts';
import { checkVocabulary } from './vocabulary.ts';

/** Seeds recorded so a counter-example can be replayed (§13). */
const SEEDS = { p20: 20261112, examples: 714 };

/** The §7.14 journey, computed with the real datasets and fictional networks. */
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

describe('journey log (§7.12, VOY-F-35)', () => {
  const journey = exampleJourney();
  const story = buildStory(journey, DEFAULT_SETTINGS);

  it('tells the rejected location with both distances', () => {
    const rejected = story.filter((entry) => entry.kind === 'rejected');
    expect(rejected.length).toBe(1);
    expect(rejected[0]?.en).toContain('Ashburn, US — rejected by light');
    expect(rejected[0]?.en).toMatch(/allows at most 1,4[0-9]{2} km/);
    expect(rejected[0]?.en).toMatch(/at least 6,[0-9]{3} km would be needed/);
  });

  it('announces the Atlantic crossing without claiming a cable', () => {
    const crossings = story.filter((entry) => entry.kind === 'crossing');
    const atlantic = crossings.find((entry) => entry.en.includes('At least 5,5'));
    expect(atlantic?.en).toContain('At least 5,5');
    expect(atlantic?.en).toContain('as the crow flies');
    expect(atlantic?.en).toMatch(
      /Nothing in the measurement says which one|No cable in the dataset is compatible/,
    );
    expect(atlantic?.certainty).toBe('assumed');
  });

  it('closes on the arrival banner of §7.14', () => {
    const arrival = story.at(-1);
    expect(arrival?.kind).toBe('arrival');
    expect(arrival?.en).toContain('At least 6,6');
    expect(arrival?.en).toContain('91.7 ms measured');
    expect(arrival?.en).toContain('inflation 1.4');
  });

  it('gives every entry a certainty level and both languages', () => {
    for (const entry of story) {
      expect(['measured', 'inferred', 'assumed']).toContain(entry.certainty);
      expect(entry.en.length).toBeGreaterThan(10);
      expect(entry.fr.length).toBeGreaterThan(10);
    }
  });

  it('stamps the passport with 3 countries, 3 networks and 1 exchange point', () => {
    const stamps = passport(journey);
    expect(stamps.filter((s) => s.kind === 'country').map((s) => s.label)).toEqual(['FR', 'GB', 'US']);
    expect(stamps.filter((s) => s.kind === 'network')).toHaveLength(3);
    expect(stamps.filter((s) => s.kind === 'ixp').map((s) => s.label)).toEqual(['Example-IX Paris']);
  });
});

describe('journey log properties (§13)', () => {
  it(`VOY-P-20 no story sentence uses a forbidden wording (seed ${SEEDS.p20})`, () => {
    fc.assert(
      fc.property(arbFullJourney, (generated) => {
        for (const entry of buildStory(generated, DEFAULT_SETTINGS)) {
          const en = checkVocabulary(entry.en);
          const fr = checkVocabulary(entry.fr);
          expect(en.violations, entry.en).toEqual([]);
          expect(fr.violations, entry.fr).toEqual([]);
        }
      }),
      { seed: SEEDS.p20, numRuns: 60 },
    );
  });
});
