---
inclusion: always
---

# Packet Voyage — tech steering

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | pnpm workspaces | `pnpm-workspace.yaml`; run `pnpm typecheck`, `pnpm lint`, `pnpm test` from the root |
| Language | TypeScript strict | `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`; `import type` for types |
| Module system | Node ESM | Relative imports **with the `.ts` extension** (`./hop.ts`), resolved via `main: ./src/index.ts` + vitest + esbuild |
| Tests | vitest, colocated | `src/<module>/<name>.test.ts`; properties with `fast-check` |
| Schema | Zod | `packages/schema` owns every wire shape; `parseJourney` throws a structured `JourneyParseError` |
| Web | Vite + React 18 + `d3-geo` | Canvas rendering, SVG interaction layer; projections `geoOrthographic` and `geoEqualEarth`; hash routes only (GitHub Pages, no rewrite) |
| CLI | esbuild bundle | `apps/cli/build.mjs` → `dist/voyage.mjs`; npm package `packet-voyage`, command `voyage` |
| MCP | JSON-RPC 2.0 over stdio | `apps/mcp`, no dependency beyond the workspace |

## Hard rules (CONTRACTS §0)

1. **No network, no clock, no randomness in `packages/core`.** Every function
   takes its inputs — including `traced_at` and the datasets — as arguments.
   Network lives in `packages/enrich` only, behind an injected `Fetcher`
   (CONTRACTS §5.6). Enforced by `scripts/guards/no-network.guard.mjs`.
2. **Determinism**: same inputs + same settings ⇒ byte-identical outputs. Sort
   before choosing; tie-break on stable ids (e.g. the DP path choice breaks
   ties by candidate id, VOY-P-08). Never `Math.random()`, never rely on object
   key order.
3. **Size limits**: file < 500 lines, function < 50 lines (blank lines and
   comments excluded). ESLint enforces both; `scripts/guards/limits.guard.mjs`
   double-checks. Split instead of growing.
4. **Contracts win.** Signatures in `docs/CONTRACTS.md` §5 are binding. If a
   contract and your instinct disagree, follow the contract and report the
   disagreement — never change a contract silently.
5. `packages/core/src/settings.ts`, `src/index.ts` and `src/pipeline.ts` are
   already written by L0: **import them, do not edit them**. If
   `computeJourney` needs a change, report it.

## Units and constants

Kilometres and milliseconds everywhere in the domain. Speed-of-light constants
come from `Settings` (`lightVacuumKmPerMs = 299.79`, `lightFibreKmPerMs = 204`),
never re-declared locally; see `geo-math.md`. Display may convert to miles
(`toMiles`, `settings.unit`); files store km, ms and UTC RFC 3339 instants
(VOY-N-09).

## Budgets (VOY-N-06, VOY-N-07)

- Parse + compute a 30-hop journey: < 200 ms (measure, do not assume).
- Warm-cache enrichment: < 3 s.
- Web app code: < 350 kB compressed — datasets are JSON assets, never imported
  into the bundle. Checked by `scripts/guards/bundle-size.guard.mjs`.
- Vendored datasets: < 1.5 MB compressed, geometries simplified.

## i18n and time

- English default, French available: `apps/web/src/i18n/{en,fr}.ts` export the
  same key set; every `StoryEntry` carries `en` and `fr`.
- All stored instants are UTC RFC 3339. The clock is injected (`tracedAt`);
  nothing calls `Date.now()` inside `packages/core`.
