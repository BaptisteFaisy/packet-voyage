/**
 * The visitor's data goes through the same pipeline as the CLI's.
 *
 * The parity test below is the point of this module: for every recorded trace in
 * the repository, the browser path (`computeUserJourney`, datasets loaded as
 * bundled chunks) and the CLI path (`computeJourney` fed by `@packet-voyage/data`,
 * exactly as `apps/cli/src/commands/read.ts` does) must produce the same journey.
 * Before this, the site ran a reduced copy of the pipeline, so a pasted trace
 * lost the light floor, the inflation, the sea crossings, the compatible cables,
 * the journey log and the credits.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { computeJourney } from '@packet-voyage/core';
import type { Journey } from '@packet-voyage/schema';
import { DATASET_IDS, creditsFor, loadCables, loadFixedLinks, loadHints, loadLandmasses } from '@packet-voyage/data';
import { computeUserJourney } from './user-journey.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const TRACED_AT = '2026-11-12T09:14:03Z';
const LYON_ASHBURN = readFileSync(join(root, 'docs', 'examples', 'lyon-ashburn.txt'), 'utf8');

/** Every recorded trace of the repository: the appendix B example and the gallery. */
function recordedTraces(): string[] {
  const gallery = readdirSync(join(root, 'gallery'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join('gallery', entry.name, 'trace.txt'))
    .filter((rel) => existsSync(join(root, rel)));
  return [join('docs', 'examples', 'lyon-ashburn.txt'), ...gallery.sort()];
}

/** What `voyage read <file>` computes: the same core call, the Node datasets. */
function cliJourney(text: string): Journey {
  return computeJourney({
    text,
    tracedAt: TRACED_AT,
    cables: loadCables(),
    masses: loadLandmasses(),
    links: loadFixedLinks(),
    hints: loadHints(),
    credits: creditsFor([...DATASET_IDS]),
  });
}

describe('VOY-F-01 the browser path and the CLI path agree', () => {
  const traces = recordedTraces();

  it('finds the recorded traces of the repository', () => {
    expect(traces.length).toBeGreaterThanOrEqual(7);
  });

  it.each(traces)('computes %s identically to `voyage read`', async (rel) => {
    const text = readFileSync(join(root, rel), 'utf8');
    const result = await computeUserJourney(text, { tracedAt: TRACED_AT });
    expect(result.ok).toBe(true);
    expect(result.datasetsUsed).toBe(true);
    expect(result.journey).toEqual(cliJourney(text));
  });

  it('is deterministic: the same trace twice gives byte-identical JSON', async () => {
    const text = readFileSync(join(root, 'docs', 'examples', 'lyon-ashburn.txt'), 'utf8');
    const a = await computeUserJourney(text, { tracedAt: TRACED_AT });
    const b = await computeUserJourney(text, { tracedAt: TRACED_AT });
    expect(JSON.stringify(a.journey)).toBe(JSON.stringify(b.journey));
  });
});

describe('VOY-F-30 a pasted trace lights up every feature, not a subset', () => {
  it('gives the light floor, the inflation, the sea crossing, the cables, the log and the credits', async () => {
    const result = await computeUserJourney(LYON_ASHBURN, { tracedAt: TRACED_AT });
    const journey = result.journey as Journey;
    // Measured on 2026-11-12 with the vendored datasets: floor 60.76 ms,
    // inflation 1.51, 6 compatible cables, 11 log entries, 4 credits. The
    // reduced pipeline the site ran before gave null, null, 0, 0 and 0.
    expect(journey.summary.light_floor_ms).not.toBeNull();
    expect(journey.summary.light_floor_ms ?? 0).toBeCloseTo(60.8, 0);
    expect(journey.summary.inflation).not.toBeNull();
    expect(journey.summary.inflation ?? 0).toBeGreaterThan(1);
    expect(journey.segments.some((segment) => segment.kind === 'sea')).toBe(true);
    expect(journey.segments.reduce((total, segment) => total + segment.cables.length, 0)).toBeGreaterThan(0);
    expect((journey.story ?? []).length).toBeGreaterThan(0);
    expect(journey.credits.length).toBe(creditsFor([...DATASET_IDS]).length);
  });

  it('VOY-F-48 credits every dataset the journey used', async () => {
    const result = await computeUserJourney(LYON_ASHBURN, { tracedAt: TRACED_AT });
    const journey = result.journey as Journey;
    expect(journey.credits).toEqual(creditsFor([...DATASET_IDS]));
  });
});

describe('VOY-F-02 an unreadable paste is reported, never guessed', () => {
  it('returns the first unknown line and no journey', async () => {
    const result = await computeUserJourney('bonjour je ne suis pas une trace\n42 potatoes', {
      tracedAt: TRACED_AT,
    });
    expect(result.ok).toBe(false);
    expect(result.journey).toBeNull();
    expect(result.unknownLine).toBe('bonjour je ne suis pas une trace');
  });

  it('says what it cleaned instead of cleaning silently', async () => {
    const result = await computeUserJourney(`\uFEFF${LYON_ASHBURN.replace(/ {2}/g, '\t')}`, {
      tracedAt: TRACED_AT,
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.join(' ')).toMatch(/byte-order mark/i);
    expect(result.warnings.join(' ')).toMatch(/tabs/i);
  });
});
