/**
 * datasets.ts — static JSON imports of every bundled dataset.
 *
 * MECHANISM (chosen, documented): the datasets are exposed through ES module
 * imports with the `{ type: 'json' }` attribute. This works identically in
 * every consumer of `@packet-voyage/data`:
 * - Vite (apps/web) bundles JSON imports natively;
 * - esbuild (apps/cli build) bundles them too;
 * - Node >= 22 runs them natively (ESM import attributes);
 * - vitest transforms them through Vite.
 * As a result, the code path used by the web app has NO runtime dependency on
 * `node:fs` — the JSON is part of the module graph and is bundled.
 *
 * The imports are typed as `unknown`: loaders validate them at runtime against
 * `@packet-voyage/schema` (see load.ts) instead of trusting the inferred
 * literal types of large JSON modules.
 */
import cablesJson from '../datasets/submarine-cables.json' with { type: 'json' };
import landmassesJson from '../datasets/landmasses.json' with { type: 'json' };
import fixedLinksJson from '../datasets/fixed-links.json' with { type: 'json' };
import hintsJson from '../datasets/hints.json' with { type: 'json' };
import cablesProvenance from '../provenance/submarine-cables.json' with { type: 'json' };
import landmassesProvenance from '../provenance/landmasses.json' with { type: 'json' };
import fixedLinksProvenance from '../provenance/fixed-links.json' with { type: 'json' };
import hintsProvenance from '../provenance/hints.json' with { type: 'json' };

/** Every bundled dataset id (= the provenance sheet id, CONTRACTS §5.7). */
export const DATASET_IDS = [
  'submarine-cables',
  'landmasses',
  'fixed-links',
  'hints',
] as const;
export type DatasetId = (typeof DATASET_IDS)[number];

/** Raw dataset payloads, keyed by dataset id. Validated by the loaders. */
export const RAW_DATASETS: Record<DatasetId, unknown> = {
  'submarine-cables': cablesJson,
  landmasses: landmassesJson,
  'fixed-links': fixedLinksJson,
  hints: hintsJson,
};

/** Raw provenance sheets, keyed by dataset id. Validated by the loaders. */
export const RAW_PROVENANCE: Record<DatasetId, unknown> = {
  'submarine-cables': cablesProvenance,
  landmasses: landmassesProvenance,
  'fixed-links': fixedLinksProvenance,
  hints: hintsProvenance,
};

/** Repository-relative file of each dataset, used in error messages. */
export const DATASET_FILES: Record<DatasetId, string> = {
  'submarine-cables': 'packages/data/datasets/submarine-cables.json',
  landmasses: 'packages/data/datasets/landmasses.json',
  'fixed-links': 'packages/data/datasets/fixed-links.json',
  hints: 'packages/data/datasets/hints.json',
};

/** Repository-relative file of each provenance sheet, used in error messages. */
export const PROVENANCE_FILES: Record<DatasetId, string> = {
  'submarine-cables': 'packages/data/provenance/submarine-cables.json',
  landmasses: 'packages/data/provenance/landmasses.json',
  'fixed-links': 'packages/data/provenance/fixed-links.json',
  hints: 'packages/data/provenance/hints.json',
};
