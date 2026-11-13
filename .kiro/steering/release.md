---
inclusion: manual
---

# Packet Voyage — release steering (manual inclusion)

How to refresh the datasets, the gallery and the published artefacts. Invoke
this file explicitly (`#steering:release` or ask for it) when doing a data
refresh or a release; it is not needed for everyday code work.

## 1. Refresh a dataset (data-curator only)

1. Check licences first (`data-licences.md`): the source must still permit
   vendoring. TeleGeography and PeeringDB data stay out, whatever the refresh.
2. Run the extraction offline-first:
   `node scripts/data/build-cables.mjs --from-cache` (same for
   `build-landmass.mjs`, `build-hints.mjs`); only hit the network from a
   human-run shell to refresh `scripts/data/cache/` (git-ignored).
3. Verify budgets: each dataset < 1.5 MB compressed, geometries simplified
   (VOY-N-07); `node scripts/guards/limits.guard.mjs`.
4. Update the provenance sheet `packages/data/provenance/<id>.json`:
   `retrieved_at` = today (UTC), recompute `features` and `sha256` from the
   actual file, keep `query` / `transform` pointing at the versioned scripts.
5. `node scripts/guards/data-licence.guard.mjs` must pass; `staleProvenance()`
   (90 days, VOY-N-11) must return empty for the refreshed ids.
6. Record the refresh in `KIRO_JOURNAL.md`: dataset id, feature count, date.

## 2. Refresh the gallery

1. For each slug (`ocean-crossing`, `continental`, `detour`,
   `rejected-by-light`, `anycast`, `with-gaps`): recompute
   `gallery/<slug>/journey.json` from `gallery/<slug>/trace.txt` with the
   current pipeline (CLI: `voyage read gallery/<slug>/trace.txt --json`).
2. Redaction check: `fixture-privacy-guard` must pass; all addresses are
   documentation ranges; the source is country-level at most.
3. Review the summary diff by hand. If the change is *intended* (settings or
   algorithm change), update `gallery/<slug>/expected.json` to the new locked
   numbers; if unintended, that is a regression — fix the code, not the
   expectation. Never blindly re-baseline.
4. Update `gallery/index.json` (slug, titles en/fr, family, summary) if any
   displayed number changed.
5. The non-regression test (spec §18: "the six journeys give the summary fixed
   in their expected files") must be green: `pnpm test`.

## 3. Release the site and the CLI

1. `pnpm typecheck && pnpm lint && pnpm test && node scripts/guards/run-all.mjs`
   — all green, no network needed.
2. `node apps/cli/build.mjs` → `apps/cli/dist/voyage.mjs`; smoke test:
   `node apps/cli/dist/voyage.mjs read gallery/ocean-crossing/trace.txt --json`
   validates against the schema (VOY-P-18).
3. Build the web app; `bundle-size.guard.mjs` must pass (app code < 350 kB
   compressed; datasets are JSON assets). Deploy is static (GitHub Pages,
   hash routes, no rewrite, no server) — then check in the browser console:
   **zero network request after load** (VOY-N-01, spec §18).
4. Publish `packet-voyage` to npm only from a human-run shell, after
   `voyage --version` and the README quickstart have been verified.
5. Write the release entry in `KIRO_JOURNAL.md` (what changed, which datasets
   at which date, measured bundle sizes). Numbers you did not measure stay
   `TODO(measure)`.
