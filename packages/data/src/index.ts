/**
 * @packet-voyage/data — bundled datasets, provenance sheets and loaders.
 *
 * Licence note: the CODE of this package is MIT (see the repository LICENSE),
 * but the DATA in `datasets/` and `provenance/` carries its own licences
 * (ODbL, public domain, CC0) — see `packages/data/LICENCE-DATA.md` and every
 * `provenance/<id>.json` sheet (VOY-N-05).
 */
export {
  loadCables,
  loadLandmasses,
  loadFixedLinks,
  loadHints,
  loadProvenance,
  creditsFor,
  staleProvenance,
  provenanceAgeDays,
} from './load.ts';
export { DatasetError } from './errors.ts';
export type { DatasetIssue, SafeParser } from './errors.ts';
export { DATASET_IDS, DATASET_FILES, PROVENANCE_FILES } from './datasets.ts';
export type { DatasetId } from './datasets.ts';
