/**
 * The gallery is the judges' entry point (VOY-F-44) and the first line of the
 * acceptance checklist (§18): the six journeys must reproduce the numbers locked
 * in their `expected.json`, and each one must really show the feature it names.
 *
 * `WRITE_GALLERY=1 npx vitest run gallery` regenerates the files; a plain run
 * only checks them.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { JourneySchema } from '@packet-voyage/schema';
import { buildJourney } from './build.ts';
import { SCENARIOS } from './scenarios.ts';
import { expectedOf, galleryFiles, writeGallery } from './write.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.env.WRITE_GALLERY === '1';

type Expected = ReturnType<typeof expectedOf>;

const FEATURE_CHECKS: Record<string, (expected: Expected) => void> = {
  'ocean-crossing': (e) => {
    expect(e.sea_segments).toBeGreaterThan(0);
    expect(e.compatible_cables).toBeGreaterThan(0);
    expect(e.summary.rejected_by_light).toBeGreaterThan(0);
  },
  continental: (e) => {
    expect(e.sea_segments).toBe(0);
    expect(e.segments).toBeGreaterThanOrEqual(3);
    expect(e.summary.countries.length).toBeGreaterThanOrEqual(2);
  },
  detour: (e) => {
    expect(e.summary.detours).toBeGreaterThan(0);
    expect(e.summary.inflation ?? 0).toBeGreaterThan(1.2);
  },
  'rejected-by-light': (e) => {
    expect(e.summary.rejected_by_light).toBeGreaterThanOrEqual(2);
    expect(e.rejected_candidates).toBeGreaterThanOrEqual(2);
  },
  anycast: (e) => {
    expect(e.anycast_hops).toBeGreaterThan(0);
  },
  'with-gaps': (e) => {
    expect(e.summary.gaps).toBeGreaterThanOrEqual(2);
    expect(e.located_hops).toBeLessThan(e.hops);
  },
};

function readExpected(slug: string): Expected {
  const path = join(root, 'gallery', slug, 'expected.json');
  if (!existsSync(path)) {
    throw new Error(`${slug}: expected.json missing — run WRITE_GALLERY=1 npx vitest run gallery`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as Expected;
}

describe('the six sample journeys (VOY-F-44, §18)', () => {
  // First, so a fresh clone can generate the files before they are compared.
  it('regenerates the gallery when WRITE_GALLERY=1', () => {
    if (!WRITE) {
      expect(galleryFiles().length).toBeGreaterThan(20);
      return;
    }
    const count = writeGallery(root);
    expect(count).toBeGreaterThan(20);
  });

  it('covers the six required situations', () => {
    expect(SCENARIOS.map((scenario) => scenario.slug)).toEqual([
      'ocean-crossing',
      'continental',
      'detour',
      'rejected-by-light',
      'anycast',
      'with-gaps',
    ]);
  });

  it('computes a schema-valid, redacted journey for each scenario', () => {
    for (const scenario of SCENARIOS) {
      const journey = buildJourney(scenario);
      expect(JourneySchema.safeParse(journey).success, scenario.slug).toBe(true);
      expect(journey.redaction?.applied, scenario.slug).toBe(true);
      expect(journey.hops.length, scenario.slug).toBeGreaterThan(2);
      for (const hop of journey.hops) {
        expect(['public', 'documentation'], scenario.slug).toContain(hop.class);
      }
    }
  });

  it('shows the feature each journey promises', () => {
    for (const scenario of SCENARIOS) {
      const expected = expectedOf(buildJourney(scenario), scenario);
      FEATURE_CHECKS[scenario.slug]?.(expected);
    }
  });

  it('is deterministic: rebuilding gives byte-identical files', () => {
    const first = galleryFiles().map((file) => `${file.path}:${file.content.length}`);
    const second = galleryFiles().map((file) => `${file.path}:${file.content.length}`);
    expect(second).toEqual(first);
  });

  it('reproduces the numbers locked in expected.json (§18 non-regression)', () => {
    for (const scenario of SCENARIOS) {
      const computed = expectedOf(buildJourney(scenario), scenario);
      expect(computed, scenario.slug).toEqual(readExpected(scenario.slug));
    }
  });

});
