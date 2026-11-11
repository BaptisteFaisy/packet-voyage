# Design — `metrics-and-story`

Contracts: `docs/CONTRACTS.md` §5.4 (`summarize`, `detectDetours`,
`inflationOf`) and §5.5 (`buildStory`, `passport`, `checkVocabulary`,
`FORBIDDEN_PATTERNS`). Inputs: `LocatedHop[]`, `Segment[]`, `Summary`,
`StoryEntry`, `Stamp` shapes of CONTRACTS §2. Steering: `honesty.md`.

## 1. Modules

```
packages/core/src/metrics/
  summary.ts    summarize(hops, segments, settings): Summary
  detours.ts    detectDetours(hops, settings): Detour[]
  inflation.ts  inflationOf(rttMs, lightFloorMs), light floor via envelope.lightFloorMs
packages/core/src/story/
  templates.ts  EN/FR template tables per StoryEntry.kind (the ONLY prose in core)
  build.ts      buildStory(journey, settings): StoryEntry[]
  passport.ts   passport(journey): Stamp[]
  vocabulary.ts checkVocabulary(text), FORBIDDEN_PATTERNS (shared with the guard)
```

`FORBIDDEN_PATTERNS` is the single source used by `checkVocabulary`, by
`scripts/guards/vocabulary.guard.mjs` and by the `claims-guard` hook — the
guard imports or mirrors it exactly; a pattern added in one place must land
in the other (task 4.2 checks parity).

## 2. Summary rules

- `distance_km_min`: Σ `segment.geodesic_km`, rounded to integer km at the
  end only (float drift kept out of displayed sums); UI prepends "at least".
- `rtt_ms`: envelope at the destination hop (last located hop with an
  envelope); `null` if none.
- `light_floor_ms`: `lightFloorMs(haversineKm(S, D), settings)` — needs both
  endpoints located; else `null`. `inflation = rtt / floor`, `null` if either
  is `null`. VOY-P-14 asserts `rtt ≥ 2d/c_vacuum` ⇒ vacuum inflation ≥ 1 on
  every *physically consistent* generated journey (generators must respect
  the envelope physics; a generator that violates physics is a generator bug
  — see design of `locator`).
- `countries`: located hops' countries in hop order, consecutive duplicates
  collapsed (a detour's return produces two entries — that is intended, the
  detour detector explains it).
- `rejected_by_light`: count of `Rejection.reason === 'light'` across hops
  (flat `LocateResult.rejected` is the source when available).
- `gaps`: hops with `replies` all timeout OR `location === null`.

## 3. Detours

Two passes over located hops: (1) country sequence — a country appearing
again after a different country ⇒ `country-return` with the ttls; (2)
sliding triple window — `d(A,B) + d(B,C) > detourRatio × d(A,C)` ⇒ `zigzag`.
All distances via `haversineKm` (antimeridian-safe — a Fiji→Tokyo→HK trip
must not look like a zigzag because of a Δlon bug). `detail` strings come
from templates in `story/templates.ts`, never inline prose.

## 4. Story templates (§7.12)

Per kind, EN + FR, with slots: `{ttl}`, `{city}`, `{country}`, `{level}`,
`{sources_n}`, `{km}`, `{ms}`, `{cables_n}`:

- `stop`: "Stop {ttl} — {city}, {country} ({level}). Network: {as_name}.
  {ms} ms after departure."
- `crossing`: "Crossing — {sea}. {km} km as the crow flies, {ms} ms later.
  {cables_n} cables are compatible with this crossing. Nothing in the
  measurement says which one carried your packet." (distance slot rendered
  with the "at least" prefix — VOY-P-20)
- `gap`: "{n} silent or unlocated hop(s) between stop {a} and stop {b}."
- `rejected`: "{city}, {country} — rejected by light: {ms} ms allows {km}
  km at most; {needed} km needed."
- `arrival`: "Arrival at {target} — {ms} ms, {countries_n} countries where a
  hop was located."

`certainty` per kind: `stop` inferred (city) / measured (ms) ⇒ the entry
takes the weakest: `inferred`; `crossing` and `arrival` distance ⇒ `assumed`;
`gap` and counts ⇒ `measured`.

VOY-F-36 (LLM rewrite) is **not implemented** this edition; `buildStory`
carries an optional verified-rewrite seam documented but inert.

## 5. Test strategy

- Unit: §7.14 summary numbers locked (6,655 / 91.7 / 63.6 / 1.44 / 3 / 3 /
  1 / 1 / 0); detour fixtures (P5 Singapore→Tokyo→HK); template snapshots EN
  + FR; `checkVocabulary` on each forbidden phrase of §5.4 ⇒ violations
  listed; on each allowed phrase ⇒ ok.
- Property **VOY-P-14**: generated physically-consistent journeys ⇒
  inflation ≥ 1 in vacuum terms; fixed seed.
- Property **VOY-P-15**: distance = Σ segments; countries = located hops';
  rejections = flat count; fixed seed.
- Property **VOY-P-20**: for every generated journey, every story sentence
  passes `checkVocabulary` and every `{km}` distance slot is preceded by
  "at least"; fixed seed.
- Guard parity test: `FORBIDDEN_PATTERNS` vs the vocabulary guard's pattern
  list — assert the same phrases fail in both.
- `claims-reviewer` re-reads `templates.ts` (the only prose file).
