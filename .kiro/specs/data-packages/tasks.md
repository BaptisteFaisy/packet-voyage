# Tasks — `data-packages`

Each task names its files and the test/command that proves it. Tick only when
green. Data writes are `data-curator`-only (agents/data-curator.md).

- [ ] 1. `packages/data/LICENCE-DATA.md` — ODbL notice for cables, public
  domain for Natural Earth, MIT-does-not-cover-data statement (VOY-N-05).
- [ ] 2. `scripts/data/cables.overpassql` + `build-cables.mjs` — Overpass
  query for `communication=line` + `submarine=yes`; builder with
  `--from-cache`, simplification, stable ids, landing extraction; writes
  `datasets/submarine-cables.json` + provenance sheet with recomputed
  `features`/`sha256` (VOY-N-05, VOY-N-07). Verify: build twice from the same
  cache ⇒ identical sha256.
- [ ] 3. `build-landmass.mjs` — Natural Earth coastlines → `Landmass[]`
  (first ring outer, no antimeridian re-split). Verify: loader test +
  `pointInPolygon` smoke via `src/geo` fixture (VOY-N-05).
- [ ] 4. `build-fixed-links.mjs` — hand-maintained CC0 table (Channel Tunnel
  first). Verify: `datasets/fixed-links.json` validates (VOY-F-25 support).
- [ ] 5. `build-hints.mjs` — airports + cities from the licence-confirmed
  source; no CLLI; `HintCity[]` with `kind`. Verify: no code appears in
  `EXCLUDED_TOKENS`; loader test (VOY-F-15 support).
- [ ] 6. `packages/data/src/loaders.ts` — the four loaders + `loadProvenance`,
  validating against `packages/schema` shapes (CONTRACTS §5.7). Verify:
  `loaders.test.ts` — real datasets load; corrupted fixture throws with the
  sheet id (VOY-N-05).
- [ ] 7. `src/credits.ts` — `creditsFor(ids)`: dedupe, sort. Verify:
  `credits.test.ts` determinism (VOY-F-48).
- [ ] 8. `src/staleness.ts` — `staleProvenance(days=90)`, injected now.
  Verify: 89/90/91-day boundary tests (VOY-N-11).
- [ ] 9. Budget gate: gzip each dataset in a test; fail over 1.5 MB
  (VOY-N-07). Verify: `budget.test.ts` + `node scripts/guards/bundle-size.guard.mjs`.
- [ ] 10. Guard wiring check: `node scripts/guards/data-licence.guard.mjs`
  green on the real tree; non-zero on a temp tree with a sheet-less dataset
  (VOY-N-05).
- [ ] 11. Pipeline hookup: `computeJourney` fills `Journey.credits` via
  `creditsFor` — assert in a core test that credits are non-empty when
  datasets are passed (VOY-F-48).
- [ ] 12. `pnpm typecheck && pnpm lint && pnpm test` green; journal entry:
  dataset ids, feature counts, `retrieved_at` dates.
