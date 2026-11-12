/**
 * Datasets of `packages/data` (L7), pulled at build time through Vite glob
 * imports so nothing is fetched at runtime (VOY-N-01) and the datasets stay
 * out of the main bundle (VOY-N-07): each JSON becomes its own chunk and is
 * loaded on demand. While L7 has not landed, every glob is empty and the
 * callers fall back to graceful emptiness (no land, no cables, no hints).
 */
import type { Cable, FixedLink, HintCity, Landmass, Provenance } from '@packet-voyage/schema';
// Deep path, not the package barrel: `@packet-voyage/data` statically imports
// every dataset JSON, which would pull 116 kB gzip out of the lazy chunks and
// into the main bundle (VOY-N-07). `credits.ts` is pure and imports no data.
import { creditsFromSheets } from '../../../../packages/data/src/credits.ts';

type JsonModule = { default: unknown };

const datasetModules = import.meta.glob<JsonModule>(
  '../../../../packages/data/datasets/*.json',
);
const provenanceModules = import.meta.glob<JsonModule>(
  '../../../../packages/data/provenance/*.json',
);

export interface Datasets {
  cables: Cable[];
  masses: Landmass[];
  links: FixedLink[];
  hints: HintCity[];
  provenance: Provenance[];
  /** Attribution lines of the datasets actually bundled (VOY-F-48). */
  credits: string[];
  available: boolean;
}

const EMPTY: Datasets = {
  cables: [],
  masses: [],
  links: [],
  hints: [],
  provenance: [],
  credits: [],
  available: false,
};

function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  return [];
}

function classifyDataset(path: string): 'cables' | 'masses' | 'links' | 'hints' | null {
  const lower = path.toLowerCase();
  if (lower.includes('cable')) return 'cables';
  if (lower.includes('land') || lower.includes('mass')) return 'masses';
  if (lower.includes('link')) return 'links';
  if (lower.includes('hint')) return 'hints';
  return null;
}

async function loadArrayModules(modules: Record<string, () => Promise<JsonModule>>): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  for (const [path, loader] of Object.entries(modules)) {
    const kind = classifyDataset(path);
    if (!kind) continue;
    try {
      const mod = await loader();
      out[kind] = [...(out[kind] ?? []), ...asArray(mod.default)];
    } catch {
      // A broken dataset must not break the site: it simply stays absent.
    }
  }
  return out;
}

async function loadProvenance(modules: Record<string, () => Promise<JsonModule>>): Promise<Provenance[]> {
  const sheets: Provenance[] = [];
  for (const loader of Object.values(modules)) {
    try {
      const mod = await loader();
      const value = mod.default;
      if (value && typeof value === 'object' && 'id' in value) {
        sheets.push(value as Provenance);
      }
    } catch {
      // Skip unreadable sheets.
    }
  }
  return sheets.sort((a, b) => a.id.localeCompare(b.id));
}

let cached: Datasets | null = null;

/** Provenance-sheet id of each bundled kind (CONTRACTS §5.7). */
const DATASET_IDS_BY_KIND = {
  cables: 'submarine-cables',
  masses: 'landmasses',
  links: 'fixed-links',
  hints: 'hints',
} as const;

type DatasetKind = keyof typeof DATASET_IDS_BY_KIND;

/** The ids of the datasets that really arrived, so the credits match the data used. */
function usedDatasetIds(arrays: Record<string, unknown[]>): string[] {
  return (Object.keys(DATASET_IDS_BY_KIND) as DatasetKind[])
    .filter((kind) => (arrays[kind] ?? []).length > 0)
    .map((kind) => DATASET_IDS_BY_KIND[kind]);
}

/** Load every bundled dataset once; `{ available: false }` while L7 is pending. */
export async function loadDatasets(): Promise<Datasets> {
  if (cached) return cached;
  const hasDatasets = Object.keys(datasetModules).length > 0;
  const hasProvenance = Object.keys(provenanceModules).length > 0;
  if (!hasDatasets && !hasProvenance) {
    cached = EMPTY;
    return cached;
  }
  const arrays = await loadArrayModules(datasetModules);
  const provenance = await loadProvenance(provenanceModules);
  cached = {
    cables: (arrays.cables ?? []) as Cable[],
    masses: (arrays.masses ?? []) as Landmass[],
    links: (arrays.links ?? []) as FixedLink[],
    hints: (arrays.hints ?? []) as HintCity[],
    provenance,
    credits: creditsFromSheets(provenance, usedDatasetIds(arrays)),
    available: true,
  };
  return cached;
}
