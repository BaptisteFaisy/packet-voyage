/**
 * Workspace dependency seam.
 *
 * The sibling packages (`@packet-voyage/core`, `@packet-voyage/enrich`,
 * `@packet-voyage/data`) are loaded **lazily**, inside `loadVoyageDeps()`, so
 * that `voyage --help` and every exit-2 argument refusal still work while a
 * sibling lot is being written, and so tests can inject in-memory fakes.
 * Types are imported with `import type` (erased at runtime); the runtime
 * imports are the dynamic ones at the bottom of this file.
 *
 * The structural interfaces mirror `docs/CONTRACTS.md` §5.5–§5.8 — the
 * contract wins over any local instinct.
 */
import type {
  Cable,
  FixedLink,
  HintCity,
  Hop,
  Journey,
  Landmass,
  Provenance,
  RedactionLevel,
} from '@packet-voyage/schema';

/* ------------------------------------------------------------- core (§5.1–5.5) */

export interface ParsedTraceLike {
  format: string;
  family: 4 | 6;
  protocol: string;
  tool: Journey['tool'];
  target?: { host: string; ip?: string | null } | null;
  hops: Hop[];
  unknownLines: string[];
  warnings: string[];
}

export interface ComputeJourneyInputLike {
  text?: string;
  parsed?: ParsedTraceLike;
  candidates?: unknown[][];
  source?: { lat: number; lon: number; label?: string; country?: string } | null;
  target?: { host: string; ip?: string | null } | null;
  tracedAt: string;
  tool?: Journey['tool'];
  protocol?: string;
  cables?: Cable[];
  masses?: Landmass[];
  links?: FixedLink[];
  hints?: HintCity[];
  credits?: string[];
}

export interface CoreDeps {
  parseTrace(text: string, options?: { format?: string }): ParsedTraceLike;
  computeJourney(input: ComputeJourneyInputLike): Journey;
  redactJourney(journey: Journey, level: RedactionLevel): Journey;
  redactionPreview(journey: Journey, level: RedactionLevel): string[];
  encodeShareLink(journey: Journey, baseUrl: string): string;
  MAX_FRAGMENT_BYTES: number;
}

/* ----------------------------------------------------------- enrich (§5.6) */

export interface ConsentStateLike {
  granted: boolean;
  services: string[];
  grantedAt: string | null;
}

export interface CacheLike {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlDays: number): void;
  stats(): { entries: number; oldest: string | null; newest: string | null };
}

export type FetcherLike = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{ status: number; json(): Promise<unknown>; text(): Promise<string> }>;

export interface EnrichOptionsLike {
  offline: boolean;
  consent: ConsentStateLike;
  cache: CacheLike;
  fetch: FetcherLike;
  now: string;
  log?: (line: string) => void;
}

export interface EnrichResultLike {
  hops: Hop[];
  candidates: unknown[][];
  missing: string[];
  sentAddresses: string[];
}

export interface EnrichDeps {
  enrichHops(hops: Hop[], options: EnrichOptionsLike): Promise<EnrichResultLike>;
  createFileCache(dir: string): CacheLike;
  readConsent(dir: string): ConsentStateLike;
  writeConsent(dir: string, state: ConsentStateLike): void;
  consentPromptText(): string;
  ixpPrefixes(options: EnrichOptionsLike): Promise<unknown[]>;
}

/* ------------------------------------------------------------- data (§5.7) */

export interface DataDeps {
  loadCables(): Cable[];
  loadLandmasses(): Landmass[];
  loadFixedLinks(): FixedLink[];
  loadHints(): HintCity[];
  loadProvenance(): Provenance[];
  staleProvenance(days?: number): Provenance[];
  creditsFor(ids: string[]): string[];
}

/* ------------------------------------------------------------------ bundle */

export interface VoyageDeps {
  core: CoreDeps;
  enrich: EnrichDeps;
  data: DataDeps;
}

export interface LoadedDatasets {
  cables: Cable[];
  masses: Landmass[];
  links: FixedLink[];
  hints: HintCity[];
  provenance: Provenance[];
  credits: string[];
  stale: Provenance[];
}

/** Load the embedded datasets once per command; staleness threshold: 90 days. */
export function loadDatasets(data: DataDeps, staleDays = 90): LoadedDatasets {
  const provenance = data.loadProvenance();
  return {
    cables: data.loadCables(),
    masses: data.loadLandmasses(),
    links: data.loadFixedLinks(),
    hints: data.loadHints(),
    provenance,
    credits: data.creditsFor(provenance.map((entry) => entry.id)),
    stale: data.staleProvenance(staleDays),
  };
}

/** The production loader: the real workspace packages, per the contract. */
export async function loadVoyageDeps(): Promise<VoyageDeps> {
  const [core, enrich, data] = await Promise.all([
    import('@packet-voyage/core'),
    import('@packet-voyage/enrich'),
    import('@packet-voyage/data'),
  ]);
  return {
    core: core as unknown as CoreDeps,
    enrich: enrich as unknown as EnrichDeps,
    data: data as unknown as DataDeps,
  };
}
