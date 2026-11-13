/**
 * load.ts — dataset loaders and provenance helpers (CONTRACTS §5.7).
 *
 * Every dataset is validated against `@packet-voyage/schema` at load; a
 * failure throws a `DatasetError` naming the file (VOY-N-05). Results are
 * memoised per process: the datasets are static imports, so the parse cost is
 * paid once. No `node:fs`, no clock except in `staleProvenance` (injectable).
 */
import type { Cable, FixedLink, HintCity, Landmass, Provenance } from '@packet-voyage/schema';
import {
  CableSchema,
  FixedLinkSchema,
  HintCitySchema,
  LandmassSchema,
  ProvenanceSchema,
} from '@packet-voyage/schema';
import {
  DATASET_FILES,
  DATASET_IDS,
  PROVENANCE_FILES,
  RAW_DATASETS,
  RAW_PROVENANCE,
} from './datasets.ts';
import type { DatasetId } from './datasets.ts';
import { creditsFromSheets } from './credits.ts';
import { DatasetError } from './errors.ts';
import type { SafeParser } from './errors.ts';

/** Validate one raw payload as an array of entries. */
function validateArray<T>(id: DatasetId, file: string, itemSchema: SafeParser<T>, raw: unknown): T[] {
  if (!Array.isArray(raw)) {
    throw new DatasetError(id, file, [{ path: [], message: 'expected a JSON array' }]);
  }
  const out: T[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const result = itemSchema.safeParse(raw[i]);
    if (!result.success) throw new DatasetError(id, file, result.error.issues.map(withIndex(i)));
    out.push(result.data);
  }
  return out;
}

/** Prefix every issue path with the entry index, for actionable messages. */
function withIndex(i: number) {
  return (issue: { path: (string | number)[]; message: string }) => ({
    path: [i, ...issue.path],
    message: issue.message,
  });
}

function memoise<T>(compute: () => T): () => T {
  let cached: T | null = null;
  return () => {
    cached ??= compute();
    return cached;
  };
}

export const loadCables: () => Cable[] = memoise(
  () => validateArray('submarine-cables', DATASET_FILES['submarine-cables'], CableSchema, RAW_DATASETS['submarine-cables']),
);

export const loadLandmasses: () => Landmass[] = memoise(
  () => validateArray('landmasses', DATASET_FILES.landmasses, LandmassSchema, RAW_DATASETS.landmasses),
);

export const loadFixedLinks: () => FixedLink[] = memoise(
  () => validateArray('fixed-links', DATASET_FILES['fixed-links'], FixedLinkSchema, RAW_DATASETS['fixed-links']),
);

export const loadHints: () => HintCity[] = memoise(
  () => validateArray('hints', DATASET_FILES.hints, HintCitySchema, RAW_DATASETS.hints),
);

export const loadProvenance: () => Provenance[] = memoise(() => {
  const sheets: Provenance[] = [];
  for (const id of DATASET_IDS) {
    const file = PROVENANCE_FILES[id];
    const result = ProvenanceSchema.safeParse(RAW_PROVENANCE[id]);
    if (!result.success) throw new DatasetError(id, file, result.error.issues);
    if (result.data.id !== id) {
      throw new DatasetError(id, file, [{ path: ['id'], message: `expected '${id}'` }]);
    }
    sheets.push(result.data);
  }
  return sheets;
});

/**
 * Attribution strings for the given dataset ids (or source aliases such as
 * `osm-cables`). The resolution itself lives in `credits.ts`, pure, so the site
 * computes the very same credits from the sheets it lazy-loads (VOY-F-48).
 */
export function creditsFor(ids: string[]): string[] {
  return creditsFromSheets(loadProvenance(), ids);
}

/** Age of a provenance sheet in whole days, relative to `now`. */
export function provenanceAgeDays(retrievedAt: string, now: Date): number {
  const then = Date.parse(retrievedAt);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY; // unparsable date = stale
  return Math.floor((now.getTime() - then) / 86_400_000);
}

/**
 * Provenance sheets older than `days` (VOY-N-11: a discreet warning after
 * 90 days). `now` is injectable for tests; it defaults to the current date.
 */
export function staleProvenance(days = 90, now: Date = new Date()): Provenance[] {
  return loadProvenance().filter((sheet) => provenanceAgeDays(sheet.retrieved_at, now) > days);
}
