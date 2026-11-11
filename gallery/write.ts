/**
 * Writes (and verifies) the gallery files: one folder per sample journey, plus
 * `index.json` for the site.
 *
 * Regenerate with `WRITE_GALLERY=1 npx vitest run gallery`; a plain
 * `npx vitest run gallery` only checks that the committed files still match
 * what the product computes (§18, first line of the acceptance checklist).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Journey } from '@packet-voyage/schema';
import { buildJourney, candidatesFor, traceText } from './build.ts';
import type { Scenario } from './scenarios.ts';
import { SCENARIOS } from './scenarios.ts';

export interface GalleryFile {
  path: string;
  content: string;
}

function round1(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value.toFixed(1));
}

/** The numbers the non-regression test locks, and the feature promised. */
export function expectedOf(journey: Journey, scenario: Scenario) {
  const located = journey.hops.filter((hop) => hop.location !== null).length;
  const sea = journey.segments.filter((s) => s.kind === 'sea' || s.kind === 'sea-or-fixed');
  return {
    slug: scenario.slug,
    feature: scenario.feature,
    summary: {
      distance_km_min: round1(journey.summary.distance_km_min),
      rtt_ms: round1(journey.summary.rtt_ms),
      light_floor_ms: round1(journey.summary.light_floor_ms),
      inflation: journey.summary.inflation === null ? null : Number(journey.summary.inflation.toFixed(2)),
      countries: journey.summary.countries,
      networks: journey.summary.networks,
      ixps: journey.summary.ixps,
      detours: journey.summary.detours.length,
      rejected_by_light: journey.summary.rejected_by_light,
      gaps: journey.summary.gaps,
    },
    hops: journey.hops.length,
    located_hops: located,
    rejected_candidates: journey.hops.reduce((n, h) => n + (h.location?.rejected.length ?? 0), 0),
    anycast_hops: journey.hops.filter((hop) => hop.anycast === true).length,
    compatible_cables: sea.reduce((n, s) => n + s.cables.length + s.other_cables, 0),
    sea_segments: sea.length,
    segments: journey.segments.length,
  };
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** All files of one sample journey, with their repository-relative paths. */
export function scenarioFiles(scenario: Scenario): GalleryFile[] {
  const journey = buildJourney(scenario);
  const dir = join('gallery', scenario.slug);
  return [
    { path: join(dir, 'trace.txt'), content: traceText(scenario) },
    { path: join(dir, 'candidates.json'), content: json(candidatesFor(scenario)) },
    { path: join(dir, 'journey.json'), content: json(journey) },
    { path: join(dir, 'expected.json'), content: json(expectedOf(journey, scenario)) },
    { path: join(dir, 'meta.json'), content: json(metaOf(scenario, journey)) },
  ];
}

function metaOf(scenario: Scenario, journey: Journey) {
  return {
    slug: scenario.slug,
    title: scenario.title,
    blurb: scenario.blurb,
    feature: scenario.feature,
    family: journey.family,
    declared_departure: scenario.declared,
    traced_at: scenario.tracedAt,
    summary: journey.summary,
  };
}

/**
 * `gallery/index.json`, the list the site loads in one click (VOY-F-44).
 *
 * `title`, `en` and `fr` are plain strings: the site renders them directly, and
 * a React child cannot be an object. The bilingual blurb lives in `meta.json`.
 */
export function indexFile(): GalleryFile {
  const items = SCENARIOS.map((scenario) => {
    const journey = buildJourney(scenario);
    return {
      slug: scenario.slug,
      title: scenario.title.en,
      en: scenario.title.en,
      fr: scenario.title.fr,
      blurb_en: scenario.blurb.en,
      blurb_fr: scenario.blurb.fr,
      family: journey.family,
      feature: scenario.feature,
      traced_at: scenario.tracedAt,
      summary: journey.summary,
    };
  });
  return { path: join('gallery', 'index.json'), content: json(items) };
}

/** Every file of the gallery, in a stable order. */
export function galleryFiles(): GalleryFile[] {
  const files = SCENARIOS.flatMap((scenario) => scenarioFiles(scenario));
  return [...files, indexFile()];
}

/** Write the gallery under `root` (the repository root). */
export function writeGallery(root: string): number {
  const files = galleryFiles();
  for (const file of files) {
    const absolute = join(root, file.path);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, file.content);
  }
  return files.length;
}
