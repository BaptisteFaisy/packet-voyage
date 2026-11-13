# Design — `name-hints`

Contract: `docs/CONTRACTS.md` §5.2 — `findHints(hostName, table)`,
`EXCLUDED_TOKENS`, `splitRouterName(hostName)`. Table type: `HintCity`
(CONTRACTS §2: `{ code, city, country, position, kind }`), loaded by
`packages/data.loadHints()`. Candidate output happens in the caller
(enrichment/pipeline), which maps each `HintCity` to
`{ ...position, city, country, source: 'name-hint', weight: 0.60 }`
(CONTRACTS §3) — this module never builds candidates itself.

## 1. Modules

```
packages/core/src/hints/
  split.ts       splitRouterName(hostName): string[]   (dots, dashes, digit-strip)
  exclude.ts     EXCLUDED_TOKENS: readonly string[]
  match.ts       findHints(hostName, table): HintCity[]
  index.ts       barrel
```

`match.ts` builds a `Map<code, HintCity[]>` and `Map<cityName, HintCity[]>`
from the table **once per call** (tables are small, a few hundred entries; if
profiling ever shows otherwise, memoise by table identity — never by content
hash inside core, determinism first).

## 2. Algorithm

```
splitRouterName('ae1.par1.example.net')
  → lowercase → split on [. - _] → ['ae1','par1','example','net']
  → strip trailing digits → ['ae','par','example','net']
findHints(name, table)
  → fragments = splitRouterName(name)
  → drop fragments in EXCLUDED_TOKENS ('net', 'ae' if excluded…)
  → for each remaining fragment: exact lookup in codeMap then cityMap
  → collect matches, dedupe by (code, city, country)
  → sort by (code, city, country) → return
```

Exact lookup only: no substring matching (`'par' in 'spare-router'` must NOT
match — the fragment split already happened), no edit distance (a typo'd code
is better missed than mis-hinted; the light filter is the second net).

## 3. Edge cases (the reason this spec exists)

| Case | Handling |
|---|---|
| `par1`, `par-1`, `par_1`, `PAR1` | same fragment `par` ⇒ Paris |
| `core1.par.example` | `core` excluded; `par` still matches |
| `net-gw.lon3` | `net` excluded as fragment, `lon` matches |
| `gig0-0-0.iad3` | interface words excluded, `iad` matches |
| `example.net` only | no hint (empty result), never a throw |
| ambiguous code (two countries) | both returned, sorted; the locator decides |
| `ae1.par1.par2.example` | one hint for `par` (dedupe) |
| hostname with trailing dot (`name.`) | empty last fragment ignored |
| IPv6-literal hostname (`2001-db8--1.example`) | dashes split it; digits strip; harmless fragments, no match |
| huge/binary input | split is linear, fragments that match nothing are dropped; no throw (VOY-N-10) |
| CLLI codes | **out**: the table must not contain proprietary CLLI codes (`data-licences.md`); no special handling here |

## 4. Test strategy

- `split.test.ts`: table-driven on the cases above (VOY-F-15).
- `match.test.ts`: a 12-entry fixture table (par, lon, iad, nyc, fra, ams,
  cdg, lhr, sin, nrt, sfo, jfk) — one test per edge-case row; determinism
  test shuffles the table input order and asserts identical output.
- Robustness: `fc.assert` over arbitrary strings — `findHints` returns an
  array, never throws (supports VOY-N-10; no VOY-P id owned here).
- Integration note: the `locator` spec asserts a `name-hint` candidate at
  weight 0.60 survives fusion and is rejected when it violates the light
  bound (§7.14 hop 5: `lon` in the name).
- **Spec vs vibe coding comparison** (§14.1): implement once from this spec
  (timed), once by vibe from the one-line request "find city codes in router
  names" (timed); record both durations, round-trips and defects found in
  `KIRO_JOURNAL.md` — `TODO(measure)` until run in a real Kiro session.
