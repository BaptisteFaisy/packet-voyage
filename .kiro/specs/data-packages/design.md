# Design — `data-packages`

Contracts: `docs/CONTRACTS.md` §2 (`Provenance`, `Cable`, `Landing`,
`Landmass`, `FixedLink`, `HintCity`) and §5.7 (loaders, `creditsFor`,
`staleProvenance`). Steering: `data-licences.md` (table 6.1 decisions).

## 1. Layout

```
packages/data/
  datasets/cables.json  landmasses.json  fixed-links.json  hint-cities.json
  provenance/cables.json  landmasses.json  fixed-links.json  hint-cities.json
  src/loaders.ts  src/credits.ts  src/staleness.ts  src/index.ts
  LICENCE-DATA.md
scripts/data/
  cables.overpassql  build-cables.mjs  build-landmass.mjs  build-hints.mjs
  build-fixed-links.mjs  cache/            # cache is git-ignored
```

Dataset ids: `submarine-cables` (OSM, ODbL), `landmasses` (Natural Earth,
public domain), `fixed-links` (Natural Earth + manual table, public
domain/CC0), `hint-cities` (source **to confirm** — OurAirports reputed
public domain, GeoNames CC BY 4.0; recorded in the sheet, open question in
annexe D).

## 2. Extraction pipeline (design-first: this drove the requirements)

```
Overpass query (cables.overpassql: communication=line + submarine=yes)
   → cache/overpass-cables.json           (human-run refresh, git-ignored)
build-cables.mjs [--from-cache]
   → normalise: id (stable slug from name+ref), geometry simplification
     (Douglas-Peucker tolerance tuned to keep < 1.5 MB compressed),
     landings from nodes tagged landing=yes, status, owners, rfs_year
   → datasets/cables.json + provenance/cables.json (features, sha256 recomputed)
```

Same shape for landmasses (Natural Earth 110m/50m coastlines → polygons,
first ring = outer), fixed links (a small hand-maintained CC0 table: Channel
Tunnel, bridges — id, name, a, b, countries), hint cities (airports + big
cities, code = IATA or lowercase city name, kind ∈ airport/city/clli-free;
**no CLLI codes**).

Offline rule: builders read `cache/` by default (`--from-cache` is the CI
mode); network refresh is a documented human step (`release.md` §1).

## 3. Loaders and credits

- Loaders `JSON.parse` + validate against Zod shapes re-exported from
  `packages/schema` (single source of truth — the §2 types). A dataset that
  fails validation throws at load with the sheet id in the message: a broken
  vendored file is a build bug, not a runtime surprise.
- `creditsFor(ids)` maps ids → sheets → attribution strings, deduped, sorted
  (deterministic, CONTRACTS §0.7). `Journey.credits` is filled by the pipeline
  from the datasets it was given.
- `staleProvenance(days = 90)` compares `retrieved_at` to an injected "now"
  (tests inject; CLI passes `Date`).

## 4. Edge cases

| Case | Handling |
|---|---|
| Cable with no usable geometry | keep with `geometry: []`; `cables` module falls back to straight-line × `cableFactor` (§7.10) |
| Cable retired after the trace date | keep in the dataset; `compatibleCables` filters by `status` at `tracedAt` — datasets are not date-filtered |
| Duplicate OSM ways for one cable | merge by normalised name; keep the longest geometry; log the merge in the build output |
| Name matching for Wikidata complements (length, rfs_year, owners) | conservative: exact or near-exact name only; unmatched ⇒ fields stay null, never guessed |
| Landmass polygon crossing the antimeridian | Natural Earth pre-splits; the builder must NOT re-split or shift longitudes (geo-math.md) |
| Hint code colliding with an exclusion token | exclusion list wins in `hints`; builder logs the collision |
| Sheet licence not permitted | guard fails the build with file + licence on stderr |
| Budget overflow | builder fails with the compressed size printed; simplify harder or drop features — never truncate silently |

## 5. Test strategy

- Loader tests: each dataset file loads and validates; a corrupted fixture
  throws naming the sheet id.
- `creditsFor`: dedupe + sort determinism; unknown id ⇒ no credit, no throw.
- `staleProvenance`: injected now; 89/90/91-day boundaries (VOY-N-11).
- Guard integration: run `node scripts/guards/data-licence.guard.mjs` in the
  test suite against a temp tree with a sheet-less dataset ⇒ non-zero exit.
- Budget test: gzip size of each dataset < 1.5 MB (VOY-N-07).
- Build determinism: same cache ⇒ byte-identical dataset output (sha256).
