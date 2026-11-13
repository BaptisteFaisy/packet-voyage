# CONTRACTS — the single source of truth for interfaces

Everything a contributor (human or agent) needs to write a module that composes
with the others **without talking to them**. Read this file first, then the
sections of `docs/fr/CAHIER-DES-CHARGES.md` quoted in your lot.

If a signature here and your instinct disagree, **the contract wins**. If the
contract is wrong, say so in your report; do not silently change it.

## 0. Ground rules (apply to every lot)

1. **Own your paths only.** Write inside the directories listed in your lot.
   Never create or edit a file outside them — no shared file, no root config,
   no `git` command of any kind (no `init`, `add`, `commit`, `push`).
2. **Language of the deliverables: English.** Code, comments, doc comments,
   test names, user-facing strings. (The French spec in `docs/fr/` stays French.)
3. **Honesty contract** (`docs/fr/CAHIER-DES-CHARGES.md` §5): no value without
   its certainty level (`measured` / `inferred` / `assumed`); never "the packet
   travelled through cable X", always "compatible cables"; every travelled
   distance is preceded by "at least"; never invent a position — an unlocated
   hop stays unlocated.
4. **Size limits**: a file stays under 500 lines, a function under 50 lines
   (blank lines and comments excluded). ESLint enforces both; split instead of
   growing.
5. **Tests colocated**: `src/<module>/<name>.test.ts`, run by `vitest run`.
   Property tests use `fast-check` and carry their spec id in the test name,
   e.g. `it('VOY-P-06 no retained position violates the light bound', ...)`.
6. **No network, no clock, no randomness in `packages/core`**: every function
   takes its inputs (including `traced_at` and the dataset) as arguments.
   Network lives in `packages/enrich` only, behind an injected `Fetcher`.
7. **Determinism**: same inputs + same settings ⇒ byte-identical outputs. Sort
   before choosing; never rely on object key order or `Math.random()`.
8. **TypeScript strict** (`tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`,
   `verbatimModuleSyntax`, `isolatedModules`). Use `import type` for types.
   Node ESM: relative imports **with the `.ts` extension** (`./hop.ts`), which
   the workspace resolves through `main: ./src/index.ts` + vitest + esbuild.
9. **Report, do not guess**: end your work with a short report listing the files
   you wrote, the tests you added, the numbers you measured, and anything you
   could not do.

## 1. Workspace map and lot ownership

```
packages/schema/    L1  Zod schemas + inferred types (journey.json, provenance)
packages/core/
  src/parse/        L1  trace readers (traceroute, tracert, mtr text, mtr json, atlas) + writers
  src/addr/         L1  IPv4/IPv6 parsing, classes (§7.3), prefix membership
  src/geo/          L2  haversine, great-circle arcs, antimeridian, point-in-polygon
  src/hints/        L2  router-name hints (airport codes, city names), exclusion list
  src/envelope/     L2  delay envelope, vacuum and fibre bounds
  src/locate/       L3  candidate fusion, light filtering, path choice (DP), confidence
  src/segments/     L4  segments, nature (land/sea/…), skipped hops
  src/cables/       L4  compatible cables, score, bands
  src/metrics/      L4  summary, inflation, light floor, detours
  src/story/        L5  journey log templates, passport stamps, vocabulary control
  src/redact/       L5  redaction by level
  src/share/        L5  fragment link encode/decode
  src/settings.ts   L0 (written already) — do not edit, import it
  src/index.ts      L0 (written already) — do not edit
packages/enrich/    L6  Node-only adapters: rDNS, RIPEstat, IPmap, PeeringDB, DB-IP,
                        cache, consent, and the enrichment orchestrator
packages/data/      L7  datasets + provenance sheets + loaders (own licence notice)
scripts/data/       L7  extraction and build scripts (Overpass, Natural Earth)
apps/cli/           L8  `voyage` command: trace, read, enrich, share, data, consent
apps/web/           L9  static site: gallery, paste, map, timeline, cards, table, a11y
apps/mcp/ + power/  L13 MCP server (4 tools) + Kiro power declaration
gallery/            L10 six redacted sample journeys + their fixtures
.kiro/              L11 steering, specs, hooks, agents, skills, probe-allowlist
scripts/guards/     L12 vocabulary, data-licence, fixture-privacy, limits, no-network,
                        kiro-tracked guards (`*.guard.mjs`, discovered by run-all.mjs)
scripts/hooks/      L12 the same guards as Kiro hook entry points (`*.mjs`)
docs/               L0/L12 README, SOURCES.md, VALIDATION.md, KIRO_JOURNAL.md
```

## 2. Data model (owned by L1, imported by everybody)

`packages/schema/src/index.ts` exports **Zod schemas and their inferred types**.
Field names are exactly these (snake_case in JSON, as in §11.4 of the spec):

```ts
export type HopClass =
  | 'private' | 'cgnat' | 'link-local' | 'loopback'
  | 'documentation' | 'multicast' | 'reserved' | 'public';
export type Certainty = 'measured' | 'inferred' | 'assumed';
export type ConfidenceLevel = 'solid' | 'probable' | 'uncertain' | 'unlocated';
export type SegmentKind = 'local' | 'undetermined' | 'sea' | 'sea-or-fixed';
export type CableBand = 'high' | 'medium' | 'low';
export type RejectionReason = 'light' | 'triangle' | 'anycast' | 'no-candidate';
export type RedactionLevel = 'country' | 'city';

export interface Position { lat: number; lon: number }

export interface Reply {
  ip: string;
  name?: string | null;
  rtt_ms: number[];        // empty when the hop stayed silent
  loss?: number;           // 0..1, when the format reports it
  flags?: string[];        // 'timeout', '!H', '!N', '!X', 'lt1ms', 'mpls'
}

export interface Candidate extends Position {
  city: string;
  country?: string | null;  // ISO 3166-1 alpha-2 when known
  source: string;           // see §3 for the closed list of source ids
  weight: number;           // 0..1, before light filtering
  anycast?: boolean;
}

export interface Rejection {
  source: string;
  city: string;
  country?: string | null;
  reason: RejectionReason;
  allowed_km: number;       // what the delay permits
  needed_km: number;        // what the candidate requires
}

export interface Location extends Position {
  city: string;
  country?: string | null;
  confidence: number;       // 0..1
  level: ConfidenceLevel;
  sources: string[];        // the sources that founded this position
  rejected: Rejection[];    // kept and shown: the rejection is the demo
}

export interface Hop {
  ttl: number;
  replies: Reply[];
  class: HopClass;
  asn?: number | null;
  as_name?: string | null;
  prefix?: string | null;
  ixp?: string | null;
  anycast?: boolean;
  mpls?: string[];
  envelope_ms?: number | null;   // null when nothing is known (silent hops)
  location?: Location | null;    // null when unlocated — never invented
}

export interface CableMatch {
  id: string;
  name: string;
  compatibility: number;   // 0..1, never presented as a probability
  band: CableBand;
  landings: string[];
  length_km?: number | null;
  rfs_year?: number | null;
  owners?: string[];
  source: string;          // provenance id, e.g. 'osm-cables'
}

export interface Segment {
  from_ttl: number;
  to_ttl: number;
  kind: SegmentKind;
  geodesic_km: number;      // straight-line, "as the crow flies"
  delta_ms: number | null;  // envelope difference across the segment
  skipped_hops: number;     // silent or unlocated hops this segment spans
  cables: CableMatch[];     // at most settings.maxCablesShown, sorted
  other_cables: number;     // exact count of the compatible cables not shown
  fixed_link?: string | null;
}

export interface Summary {
  distance_km_min: number;   // sum of segment geodesic distances — "at least"
  rtt_ms: number | null;     // envelope at the destination (measured)
  light_floor_ms: number | null;
  inflation: number | null;  // rtt / light_floor, in the vacuum
  countries: string[];       // in hop order, located hops only
  networks: number;          // distinct ASNs
  ixps: number;
  detours: Detour[];
  rejected_by_light: number;
  gaps: number;              // silent or unlocated hops
}

export interface Detour { kind: 'country-return' | 'zigzag'; ttls: number[]; detail: string }

export interface Source {
  label?: string | null;
  lat?: number | null;
  lon?: number | null;
  precision?: 'city' | 'country' | null;
  declared?: boolean;        // true when the user declared the city
}

export interface Target { host: string; ip?: string | null }

export interface Journey {
  version: 1;
  traced_at: string;         // RFC 3339, UTC
  tool: 'traceroute' | 'tracert' | 'mtr' | 'mtr-json' | 'atlas' | 'pasted' | 'unknown';
  protocol: string;          // 'icmp' | 'udp' | 'tcp' | 'unknown'
  family: 4 | 6;
  source?: Source | null;
  target: Target;
  hops: Hop[];
  segments: Segment[];
  summary: Summary;
  story?: StoryEntry[];      // built by L5, optional in a stored journey
  credits: string[];         // from the provenance sheets of the data used
  redaction?: { level: RedactionLevel; applied: boolean } | null;
}

export interface StoryEntry {
  kind: 'stop' | 'crossing' | 'gap' | 'rejected' | 'arrival';
  ttl?: number | null;
  certainty: Certainty;
  en: string;
  fr: string;
}

export interface Stamp { kind: 'country' | 'network' | 'ixp'; label: string; count: number }
```

`packages/schema` also exports the Zod objects (`JourneySchema`, `HopSchema`, …),
`parseJourney(text: string): Journey` (throws a structured `JourneyParseError`
carrying the Zod issues), and the **provenance** schema:

```ts
export interface Provenance {
  id: string; title: string; origin: string; url: string;
  licence: string; retrieved_at: string;
  query?: string; transform?: string; attribution: string;
  features: number; sha256: string;
}
```

And the **dataset** shapes (owned by L7, described here so L2/L4 can code against them):

```ts
export interface Cable {
  id: string; name: string; length_km?: number | null; rfs_year?: number | null;
  owners?: string[]; landings: Landing[]; geometry: Position[][]; // polylines, WGS84
  status: 'in-service' | 'retired' | 'planned'; source: string;
}
export interface Landing extends Position { name: string; country?: string | null }
export interface Landmass { id: string; name: string; polygons: Position[][] } // rings, first = outer
export interface FixedLink { id: string; name: string; a: Position; b: Position; countries: string[] }
export interface HintCity extends Position { code: string; city: string; country: string; kind: 'airport' | 'city' }
```

## 3. Closed lists (do not invent new ids)

**Candidate sources** (`Candidate.source`, `Location.sources[]`, `Rejection.source`):

| id | meaning | starting weight |
|---|---|---|
| `declared` | city declared by the user for the source hop | 1.00 |
| `ipmap-latency` | RIPE IPmap, latency engine | 0.85 |
| `ixp-prefix` | address inside a known IXP prefix (PeeringDB) | 0.80 |
| `name-hint` | airport/city code found in the router name | 0.60 |
| `ipmap-rdns` | RIPE IPmap, reverse-DNS engine | 0.50 |
| `ipmap-ix` | RIPE IPmap, IXP engine | 0.50 |
| `ipmap-contribution` | RIPE IPmap, contribution engine | 0.50 |
| `ipmap-anycast` | RIPE IPmap, anycast engine | 0.50 |
| `neighbourhood` | added by path choice, not a source (§7.5) | 0.40 |
| `geodb` | local DB (DB-IP / IPinfo Lite) | 0.30 |
| `ripestat` | RIPEstat network-level hint | 0.30 |
| `operator` | cable owner / operator match (cable scoring only) | 0.30 |

**Certainty** is carried by every displayed value: `measured` (address, delays,
loss, order), `inferred` (network, city, country, IXP, segment nature),
`assumed` (the drawn path, compatible cables, real distance).

**Vocabulary** (§5.4) — enforced by `scripts/guards/vocabulary.guard.mjs`:
allowed: "compatible cables for this crossing", "likely in {city} ({n} sources
agree)", "at least {n} km", "countries where a hop was located", "not located".
Forbidden in any user-facing string: "travelled through", "took the cable",
"your packet crossed", "went through cable", "located in {city}" without a
level, a bare "{n} km" for a travelled distance, "countries your data crossed",
any default position (country centroid, operator headquarters).

## 4. Settings (`packages/core/src/settings.ts`, already written)

```ts
export interface Settings {
  lightVacuumKmPerMs: number; lightFibreKmPerMs: number; slackKm: number;
  agreeRadiusKm: number; unlocatedScore: number; zigzagKm: number;
  localKm: number; landFactor: number; cableFactor: number;
  cableTolerance: number; detourRatio: number; maxCablesShown: number;
  maxCableScoreBands: { high: number; medium: number }; // 0.6 / 0.3
  language: 'en' | 'fr'; unit: 'km' | 'mi';
}
export const DEFAULT_SETTINGS: Settings;
export function withSettings(partial: Partial<Settings>): Settings;
```

Values are those of §7.13 (`high ≥ 0.6`, `medium ≥ 0.3`, else `low`).

## 5. Module APIs

Signatures are binding. Extra internal helpers are free, extra **exports** must
be listed in your report.

### 5.1 L1 — `packages/core/src/parse` and `src/addr`

```ts
export type TraceFormat = 'traceroute' | 'tracert' | 'mtr-text' | 'mtr-json' | 'atlas' | 'unknown';

export interface ParsedTrace {
  format: TraceFormat;
  family: 4 | 6;
  protocol: 'icmp' | 'udp' | 'tcp' | 'unknown';
  tool: Journey['tool'];
  target?: Target | null;
  hops: Hop[];                 // ttl, replies, class, mpls, flags — no location yet
  unknownLines: string[];      // kept verbatim, never dropped (§7.2)
  warnings: string[];
}

export function detectFormat(text: string): TraceFormat;
export function parseTrace(text: string, options?: { format?: TraceFormat }): ParsedTrace; // never throws
export function writeTrace(trace: ParsedTrace, format: TraceFormat): string;  // round-trip, VOY-P-01
export function parseAtlasResult(json: unknown): ParsedTrace;                 // VOY-F-05
```

`parseTrace` returns `{ format: 'unknown', hops: [], unknownLines: [firstLine] }`
instead of throwing (VOY-F-02, VOY-N-10). Multiple replies per hop are kept;
`<1 ms` becomes `rtt_ms: [0.5]` **and** `flags: ['lt1ms']`; `*`/`???` produce a
hop with `replies: [{ ip: '', rtt_ms: [], flags: ['timeout'] }]`; MPLS label
lines attach to the previous hop (`mpls: [...]`).

```ts
// src/addr
export function parseAddress(ip: string): { family: 4 | 6; normalized: string } | null;
export function classifyAddress(ip: string): HopClass;   // §7.3, handles IPv6 shorthand
export function isPublicAddress(ip: string): boolean;    // class === 'public'
export function inPrefix(ip: string, cidr: string): boolean;
export function isDocumentationAddress(ip: string): boolean;
```

### 5.2 L2 — `src/geo`, `src/hints`, `src/envelope`

```ts
// src/geo
export const EARTH_RADIUS_KM: 6371;
export function haversineKm(a: Position, b: Position): number;      // antimeridian-safe
export function greatCirclePoints(a: Position, b: Position, steps?: number): Position[];
export function pointInPolygon(p: Position, rings: Position[][]): boolean;
export function landmassAt(p: Position, masses: Landmass[]): Landmass | null;
export function crossesWater(a: Position, b: Position, masses: Landmass[], samples?: number): boolean;
export function toMiles(km: number): number;

// src/hints
export function findHints(hostName: string, table: HintCity[]): HintCity[];
export const EXCLUDED_TOKENS: readonly string[];   // 'core', 'edge', 'border', 'peer', …
export function splitRouterName(hostName: string): string[];

// src/envelope
export function computeEnvelopes(hops: Hop[]): (number | null)[];   // monotone, VOY-P-05
export function lightBudgetKm(rttMs: number, kmPerMs: number): number; // kmPerMs * rtt / 2
export function stepAllowedKm(envelopeMs: number, settings: Settings): number;
export function triangleAllowedKm(envJ: number, settings: Settings): number;
export function lightFloorMs(distanceKm: number, settings: Settings): number; // 2d / c
```

`computeEnvelopes` implements §7.6: the envelope of a hop is the smallest delay
observed at that hop **or at any later hop**, so it never decreases with ttl.
Silent hops keep `null` and inherit nothing.

### 5.3 L3 — `src/locate`

```ts
export interface LocateInput {
  hops: Hop[];
  candidates: Candidate[][];        // index-aligned with hops; empty array = none
  envelopes: (number | null)[];
  source?: (Position & { label?: string; country?: string }) | null;
  settings: Settings;
}
export interface LocatedHop { hop: Hop; location: Location | null }
export interface LocateResult {
  hops: LocatedHop[];               // same length, same order as the input
  rejected: Rejection[];            // flat list, for the summary counter
  relativeOnly: boolean;            // true when no source position was known
}
export function locate(input: LocateInput): LocateResult;
export function fuseCandidates(list: Candidate[], settings: Settings): Candidate[]; // merge < agreeRadiusKm
export function filterByLight(c: Candidate[], allowedKm: number, from: Position): { kept: Candidate[]; rejected: Rejection[] };
export function choosePositions(hops: LocatedHop[], settings: Settings): LocatedHop[];  // DP, deterministic
export function confidenceOf(kept: Candidate[], settings: Settings): { confidence: number; level: ConfidenceLevel };
```

Hard rules: a retained position never exceeds `c × env / 2 + slackKm` from the
source (VOY-P-06); for every located pair `i < j`, the perimeter
`source→i→j→source` never exceeds `c × env_j` within tolerance (VOY-P-07); a
candidate that violates the hard bound never changes the retained path, it only
appears in `rejected` (VOY-P-09); adding a concordant source never lowers
confidence (VOY-P-10); a hop with no kept candidate is `level: 'unlocated'`,
`location: null` (VOY-P-11).

### 5.4 L4 — `src/segments`, `src/cables`, `src/metrics`

```ts
// src/segments
export function buildSegments(hops: LocatedHop[], masses: Landmass[], links: FixedLink[], settings: Settings): Segment[];
export function segmentKind(a: Position, b: Position, masses: Landmass[], settings: Settings): SegmentKind;

// src/cables
export function compatibleCables(seg: Segment, cables: Cable[], tracedAt: string, settings: Settings): { cables: CableMatch[]; other_cables: number };
export function scoreCable(cable: Cable, seg: Segment, settings: Settings): { compatibility: number; band: CableBand };

// src/metrics
export function summarize(hops: LocatedHop[], segments: Segment[], settings: Settings): Summary;
export function detectDetours(hops: LocatedHop[], settings: Settings): Detour[];
export function inflationOf(rttMs: number, lightFloorMs: number): number;
```

A segment spans consecutive **located** hops and counts the skipped ones; no
segment ever starts or ends on an unlocated hop (VOY-P-11). Only cables
`in-service` at `tracedAt`, with a landing on each side and a delay budget
within `cableTolerance`, are listed; the order is stable and at most
`maxCablesShown` are shown with an exact `other_cables` count (VOY-P-13).
`summarize` must satisfy VOY-P-15 (distance = sum of segments, countries =
located hops only, rejections = the flat count).

### 5.5 L5 — `src/story`, `src/redact`, `src/share`

```ts
// src/story
export function buildStory(journey: Journey, settings: Settings): StoryEntry[];
export function passport(journey: Journey): Stamp[];
export function checkVocabulary(text: string): { ok: boolean; violations: string[] };
export const FORBIDDEN_PATTERNS: readonly RegExp[];

// src/redact
export function redactJourney(journey: Journey, level: RedactionLevel): Journey; // VOY-P-16
export function redactionPreview(journey: Journey, level: RedactionLevel): string[]; // what will be shared

// src/share
export function encodeShareLink(journey: Journey, baseUrl: string): string;  // VOY-P-17
export function decodeShareLink(url: string): Journey;
export const MAX_FRAGMENT_BYTES: 60_000;
```

`redactJourney` removes the user address, every non-public hop and every access
network hop, and coarsens the source to the requested level. Templates only: no
LLM in this edition unless VOY-F-36 is enabled, and then every sentence is
verified against the journey (each number and proper name must appear in it).

### 5.6 L6 — `packages/enrich`

```ts
export type Fetcher = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ status: number; json(): Promise<unknown>; text(): Promise<string> }>;

export interface EnrichOptions {
  offline: boolean; consent: ConsentState; cache: Cache; fetch: Fetcher;
  now: string; ixpPrefixes?: IxpPrefix[]; localDb?: LocalNetworkDb;
  log?: (line: string) => void;   // every outbound address is logged here
}
export interface EnrichResult { hops: Hop[]; candidates: Candidate[][]; missing: string[]; sentAddresses: string[] }

export async function enrichHops(hops: Hop[], options: EnrichOptions): Promise<EnrichResult>;
export function reverseDns(ip: string): Promise<string | null>;         // system resolver
export async function ripeStat(ip: string, o: EnrichOptions): Promise<{ asn: number | null; as_name: string | null; prefix: string | null }>;
export async function ipmapLocate(ip: string, o: EnrichOptions): Promise<Candidate[]>;
export async function ixpPrefixes(o: EnrichOptions): Promise<IxpPrefix[]>;   // PeeringDB, live only
export interface Cache { get<T>(key: string): T | null; set<T>(key: string, value: T, ttlDays: number): void; stats(): { entries: number; oldest: string | null; newest: string | null } }
export function createFileCache(dir: string): Cache;
export interface ConsentState { granted: boolean; services: string[]; grantedAt: string | null }
export function readConsent(dir: string): ConsentState;
export function writeConsent(dir: string, state: ConsentState): void;
export function consentPromptText(): string;    // names the services and what is sent (§6.4)
```

Hard rule (VOY-P-04): nothing leaves the machine unless the address is public.
`enrichHops` must skip every non-public hop **before** any call, and record what
it would have sent in `sentAddresses` so the property test can assert on it.
Without consent or with `offline: true`, no `fetch` call happens at all
(VOY-F-11, VOY-F-13) and the missing enrichments are listed in `missing`.
VOY-P-19: with a warm cache, offline gives the same journey as the online run
that filled it.

### 5.7 L7 — `packages/data` + `scripts/data`

```ts
export function loadCables(): Cable[];
export function loadLandmasses(): Landmass[];
export function loadFixedLinks(): FixedLink[];
export function loadHints(): HintCity[];
export function loadProvenance(): Provenance[];
export function creditsFor(ids: string[]): string[];      // attribution strings
export function creditsFromSheets(sheets: Provenance[], ids: string[]): string[]; // pure: the site's path
export function staleProvenance(days?: number): Provenance[];  // VOY-N-11, 90 days
```

`creditsFromSheets` is the attribution logic with the sheets as an argument, so
a caller that already holds them — the site, which lazy-loads the provenance
chunks — gets exactly the credits `creditsFor` gives the CLI, without importing
the loaders (and the dataset JSON they statically pull) into its main bundle.

Files live in `packages/data/datasets/<id>.json` with a sibling
`packages/data/provenance/<id>.json` (schema above). Every dataset **must** have
a provenance sheet or the guard fails the build. `packages/data/LICENCE-DATA.md`
carries its own notice (ODbL for OSM-derived cables, public domain for Natural
Earth). Budgets: datasets under 1.5 MB compressed, geometries simplified
(VOY-N-07). Extraction scripts are versioned (`scripts/data/cables.overpassql`,
`scripts/data/build-cables.mjs`, `scripts/data/build-landmass.mjs`,
`scripts/data/build-hints.mjs`) and must be runnable offline against a cached
response (`scripts/data/cache/`, git-ignored) so CI never needs the network.

### 5.8 L8 — `apps/cli`

Commands (§11.6): `trace`, `read`, `enrich`, `share`, `data status|update`,
`consent`, `mcp`. Every command accepts `--json` and prints a `Journey` (or the
documented sub-shape) that validates against `packages/schema` (VOY-P-18).
`trace` picks `mtr --json -n -c <cycles> <host>` when available, else
`traceroute -n -q 3 <host>`, else `tracert -d <host>`; it never uses `sudo` and
never goes through a shell (VOY-F-41, VOY-F-42: reject ranges, lists, anything
starting with `-`, anything that is not a hostname or an address; spawn with an
argument array). Exit codes: `0` ok, `2` bad argument, `3` no trace tool,
`4` refused by consent/offline, `5` unreadable input. Build with esbuild
(`apps/cli/build.mjs` → `apps/cli/dist/voyage.mjs`, `bin/voyage.mjs` is a
3-line shim). The published package name is `packet-voyage`, the command `voyage`.

### 5.9 L9 — `apps/web`

Static site, **zero network request after load** (VOY-N-01). Vite + React 18 +
`d3-geo` canvas rendering with an SVG interaction layer; projections:
`geoOrthographic` (globe) and `geoEqualEarth` (flat). Routes are hash-based
(`#/`, `#/journey/<id>`, `#/compare`, `#/story`, `#/classroom`, `#/sources`,
`#/settings`) so GitHub Pages needs no rewrite. Screens and states: §12.1,
§12.2. Bundle budget: app code under 350 kB compressed (VOY-N-07) — keep
datasets out of the JS bundle and load them as JSON assets. Accessibility AA:
the roadmap table carries everything the map shows, full keyboard navigation
(arrows/Enter/Escape), `prefers-reduced-motion` disables every automatic
animation, certainty is carried by stroke style **and** a label, never colour
alone (VOY-N-08). i18n: `apps/web/src/i18n/{en,fr}.ts` exporting the same key
set; English default.

Component contract (keep these names so tests and the roadmap line up):
`App`, `GalleryView`, `PasteTrace`, `JourneyView`, `SummaryBanner`, `WorldMap`,
`DelayTimeline`, `HopList`, `HopCard`, `CrossingCard`, `RoadmapTable`,
`StoryView`, `PassportView`, `ClassroomView`, `SourcesView`, `SettingsView`,
`CompareView`. Shared logic in `apps/web/src/lib/` (no React import there).

A pasted trace is computed by `computeJourney` of `@packet-voyage/core` with the
bundled datasets (`lib/user-journey.ts`): the site runs **the same pipeline as
the CLI**, never a reduced copy of it, so a visitor's own trace gets the light
floor, the inflation, the sea crossings, the compatible cables, the journey log
and the credits — every number the catalogue demonstrates. `lib/user-journey.test.ts`
locks the parity against `voyage read` over every recorded trace of the
repository.

### 5.10 L10 — `gallery/`

Six journeys, each `gallery/<slug>/journey.json` (validated, redacted) plus
`gallery/<slug>/trace.txt` (the fixture it was computed from) and
`gallery/<slug>/expected.json` (the locked summary numbers). The six slugs:
`ocean-crossing`, `continental`, `detour`, `rejected-by-light`, `anycast`,
`with-gaps` (VOY-F-44). All addresses come from the documentation ranges
(RFC 5737 / RFC 3849) or are redacted; the fixture-privacy guard checks this.
`gallery/index.json` lists `{ slug, title, en, fr, family, summary }`.

### 5.11 L11 — `.kiro/`

Eight steering files (`product.md`, `tech.md`, `structure.md`, `testing.md`,
`honesty.md`, `probing-ethics.md`, `privacy.md`, `data-licences.md`,
`geo-math.md`, `trace-formats.md`, `release.md` — inclusion rules in §14.2),
twelve specs (`trace-parsers`, `address-classes`, `name-hints`, `data-packages`,
`enrichment`, `locator`, `crossings-and-cables`, `metrics-and-story`,
`journey-ui`, `share-and-redact`, `cli`, `mcp-power`), each with
`requirements.md` (EARS), `design.md`, `tasks.md`; six hooks as JSON in
`.kiro/hooks/` calling `scripts/hooks/*.mjs`; three agents (`geo-reviewer`,
`claims-reviewer`, `data-curator`); `.kiro/probe-allowlist.txt` containing only
`localhost`, `127.0.0.1`, `::1` and the documentation ranges; `.kiro/settings/mcp.json`
declaring `{ "mcpServers": { "packet-voyage": { "command": "npx", "args": ["packet-voyage", "mcp"] } } }`.

### 5.12 L12 — guards

Each guard is `scripts/guards/<name>.guard.mjs`, self-contained, stdlib only,
prints what it checked, exits non-zero with the offending file/line on stderr:
`vocabulary` (§5.4 over `apps/web/src/**` and `packages/core/src/story/**`),
`data-licence` (every `packages/data/datasets/*.json` has a provenance sheet
with a permitted licence), `fixture-privacy` (no private, CGNAT or finer-than-
country data in `gallery/**` and `**/*.test.ts` fixtures), `limits` (files < 500
lines, functions < 50 lines, skipping `node_modules`, `dist`, `.git`, `datasets`),
`no-network` (no `fetch`/`http`/`net`/`dns` import outside `packages/enrich`,
`apps/cli`, `apps/mcp`, `scripts/data`), `kiro-tracked` (`.kiro/` present and
not git-ignored, MIT licence detected), `roadmap-parity` (every hop and segment
of a journey appears in the roadmap table), `bundle-size` (built web assets
under the budgets of VOY-N-07, skipped when `apps/web/dist` is absent).
`scripts/hooks/<name>.mjs` are thin wrappers reading the Kiro hook JSON on
stdin and applying the same guard to the changed files.

### 5.13 L13 — `apps/mcp` + `power/`

Tools `trace_host`, `read_trace`, `explain_journey`, `compare_journeys`
(§11.7), JSON-RPC 2.0 over stdio, no dependency beyond the workspace. Limits
(VOY-N-02): one trace at a time, at least 5 s between two traces, at most 20
traces per session, every `trace_host` requires an explicit approval flag.
`power/packet-voyage.md` declares the power and the latency-investigation skill.

## 6. The pipeline (who calls whom)

```
parseTrace(text)                       → ParsedTrace (hops with class, no location)
enrichHops(hops, options)              → hops + candidates[][] (L6; L3 works without it)
computeEnvelopes(hops)                 → envelopes
locate({hops, candidates, envelopes, source, settings}) → LocatedHop[]
buildSegments(located, masses, links, settings)         → Segment[]
compatibleCables(seg, cables, traced_at, settings)      → cables per segment
summarize(located, segments, settings)                  → Summary
buildStory(journey, settings)                           → StoryEntry[]
redactJourney(journey, level)                           → shareable Journey
encodeShareLink(redacted, baseUrl)                      → link
```

`packages/core/src/pipeline.ts` (written by L0) wires this into
`computeJourney(input): Journey` — **L3, L4, L5 must not modify it**; if it
needs a change, report it.

```ts
export interface ComputeJourneyInput {
  text?: string;                        // a raw trace
  parsed?: ParsedTrace;                 // or an already parsed trace
  candidates?: Candidate[][];           // optional (offline / name hints only)
  source?: (Position & { label?: string; country?: string }) | null;
  target?: Target | null;
  tracedAt: string;                     // injected clock
  tool?: Journey['tool'];
  protocol?: string;
  cables?: Cable[]; masses?: Landmass[]; links?: FixedLink[]; hints?: HintCity[];
  settings?: Partial<Settings>;
}
export function computeJourney(input: ComputeJourneyInput): Journey;
```

## 7. Definition of done for a lot

- `pnpm typecheck`, `pnpm lint`, `pnpm test` are green **on your files**
  (run them from your working copy of the repository).
- Every requirement id you were given appears in a test name.
- Every property id you were given has a `fast-check` test, with a fixed seed
  list recorded in the test file comment.
- No file over 500 lines, no function over 50 lines.
- Your report states: files written, tests added and passing, measured numbers,
  contract deviations (if any), what is left.
