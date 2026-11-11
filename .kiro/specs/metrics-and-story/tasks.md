# Tasks — `metrics-and-story`

Verify with `pnpm vitest run packages/core`; tick only when green. The
`claims-guard` hook fires on every save under `src/story/**`.

## 1. Metrics (`src/metrics`)

- [ ] 1.1 `src/metrics/inflation.ts` — `inflationOf(rttMs, lightFloorMs)`
  with null handling; floor via `envelope.lightFloorMs`. Test:
  `inflation.test.ts` — §7.14: 91.7 / 63.6 → 1.44; null floor → null
  (VOY-F-26).
- [ ] 1.2 `src/metrics/summary.ts` — `summarize`: distance sum, rtt at
  destination, countries (consecutive dedupe), networks, ixps,
  rejected_by_light, gaps; nulls when endpoints unlocated. Test:
  `summary.test.ts` locking all §7.14 numbers (VOY-F-26, VOY-F-27).
- [ ] 1.3 `src/metrics/detours.ts` — `detectDetours`: country-return and
  zigzag (> detourRatio × direct), located hops only, all distances via
  `haversineKm`. Test: `detours.test.ts` — P5 fixture (Singapore→Tokyo→HK),
  antimeridian triple not flagged (VOY-F-28).
- [ ] 1.4 Properties **VOY-P-14** and **VOY-P-15**: `metrics.property.test.ts`
  — `it('VOY-P-14 rtt >= 2 d(S,D)/c in vacuum')`, `it('VOY-P-15 summary
  equals its parts')`; generators from `locate/arbitraries.ts`; fixed seeds
  in header.

## 2. Story (`src/story`)

- [ ] 2.1 `src/story/vocabulary.ts` — `FORBIDDEN_PATTERNS` (every phrase of
  §5.4) + `checkVocabulary`. Test: `vocabulary.test.ts` — each forbidden
  phrase flagged, each allowed phrase clean (VOY-N-04).
- [ ] 2.2 `src/story/templates.ts` — EN/FR templates per kind with the slots
  of design §4; "at least" baked into distance slots. Test: snapshot per
  kind per language (VOY-F-35).
- [ ] 2.3 `src/story/build.ts` — `buildStory(journey, settings)`: entries in
  hop order, `certainty` per design §4, inert VOY-F-36 seam documented.
  Test: `build.test.ts` on the §7.14 journey — one `rejected` entry for
  Ashburn, `crossing` entries for the Atlantic (VOY-F-35).
- [ ] 2.4 `src/story/passport.ts` — `passport(journey)`: stamps per country /
  network / ixp with counts. Test: `passport.test.ts` — §7.14: 3+3+1 stamps.
- [ ] 2.5 Property **VOY-P-20**: `story.property.test.ts` — `it('VOY-P-20 no
  story sentence contains forbidden vocabulary and every travelled distance
  says at least')` over generated journeys; fixed seed in header.

## 3. Parity and finish

- [ ] 3.1 Guard parity test: the phrases rejected by `checkVocabulary` are
  exactly those rejected by `node scripts/guards/vocabulary.guard.mjs`
  (run the guard on a temp file containing each pattern).
- [ ] 3.2 `claims-reviewer` pass over `templates.ts`; fix or justify every
  finding.
- [ ] 3.3 `pnpm typecheck && pnpm lint` green; limits guard green; journal
  entry with the before/after label example for §14.6 fact 3 ("Your packet
  crossed the Atlantic via…" → the template sentence).
