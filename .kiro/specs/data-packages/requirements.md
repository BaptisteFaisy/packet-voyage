# Requirements — `data-packages`

Spec method (§14.1): **design-first** — the extraction pipeline and provenance
contract were designed before requirements were frozen, because the licence
analysis (spec §6.1) dictates the shape. Covers **VOY-F-48**, **VOY-N-05**;
depends on VOY-N-07 (budgets) and VOY-N-11 (freshness).
Owner: `packages/data` + `scripts/data` (lot L7). Contracts:
`docs/CONTRACTS.md` §2 (`Provenance`, dataset shapes) and §5.7. Only the
`data-curator` agent writes here; steering `data-licences.md` auto-includes.

## Introduction

The computation is only as good as its reference data: submarine cables with
landings, landmasses for crossing nature, fixed links (Channel Tunnel), the
airport/city hint table. The repo is public and MIT; every vendored byte must
have a licence that allows it and a provenance sheet that proves where it came
from. What cannot be redistributed (TeleGeography, PeeringDB, DB-IP) is
queried live or downloaded by the user — never committed.

Scope — **in**: extraction scripts, datasets, provenance sheets, loaders,
`LICENCE-DATA.md`, credits. **Out**: live APIs (enrichment spec), geometry
maths (geo).

---

## Requirements

### Requirement 1 — VOY-N-05 (I): no dataset without a provenance sheet

**User Story:** As a maintainer, I can prove the licence and origin of every
vendored byte, so the public repo never carries unlicensed data.

#### Acceptance Criteria

1. THE SYSTEM SHALL store every dataset as `packages/data/datasets/<id>.json`
   with a sibling `packages/data/provenance/<id>.json` matching the
   `Provenance` schema (CONTRACTS §2: id, title, origin, url, licence,
   retrieved_at, query, transform, attribution, features, sha256).
2. IF a dataset has no provenance sheet, or its licence is not in the
   permitted set (ODbL-1.0, CC0, public domain, CC BY 4.0 with credit), THEN
   the build SHALL fail — `scripts/guards/data-licence.guard.mjs` and the
   `data-licence-guard` hook.
3. THE SYSTEM SHALL keep `features` and `sha256` consistent with the actual
   dataset file (the guard recomputes both).
4. THE SYSTEM SHALL NOT vendor: TeleGeography data (no written permission —
   open question 2), PeeringDB data (AUP), DB-IP/IPinfo databases (size +
   terms: downloaded to the user's cache dir instead), CLLI codes
   (proprietary), RIPE Atlas raw dumps.

### Requirement 2 — VOY-F-48 (I): credits everywhere the data shows

#### Acceptance Criteria

1. THE SYSTEM SHALL expose `loadProvenance()` and
   `creditsFor(ids): string[]` producing attribution strings from the sheets.
2. WHEN a journey is computed, THE SYSTEM SHALL fill `Journey.credits` from
   the provenance sheets of the datasets used (CONTRACTS §2) — the web
   sources page and the map footer render them (journey-ui spec).
3. THE SYSTEM SHALL carry the data package's own notice in
   `packages/data/LICENCE-DATA.md` (ODbL for OSM-derived cables, public
   domain for Natural Earth) — the MIT licence covers code only.

### Requirement 3 — extraction scripts are versioned and offline-runnable

#### Acceptance Criteria

1. THE SYSTEM SHALL version every extraction: `scripts/data/cables.overpassql`,
   `build-cables.mjs`, `build-landmass.mjs`, `build-hints.mjs`, with the
   sheet's `query`/`transform` fields pointing at them.
2. WHERE CI runs, the scripts SHALL work offline against cached responses in
   `scripts/data/cache/` (git-ignored) — no network in CI, ever.
3. WHEN a build runs, THE SYSTEM SHALL recompute `features` and `sha256` and
   set `retrieved_at` to the cache's retrieval date, not to today.

### Requirement 4 — VOY-N-11 (I) + VOY-N-07: freshness and budgets

#### Acceptance Criteria

1. THE SYSTEM SHALL expose `staleProvenance(days = 90)`: sheets older than
   90 days are listed, and the UI shows a discreet date mention.
2. THE SYSTEM SHALL keep each dataset under 1.5 MB compressed with simplified
   geometries (VOY-N-07); the build fails over budget.
3. THE SYSTEM SHALL expose the loaders of CONTRACTS §5.7: `loadCables`,
   `loadLandmasses`, `loadFixedLinks`, `loadHints` — each validating against
   the §2 shapes (`Cable`, `Landmass`, `FixedLink`, `HintCity`).
