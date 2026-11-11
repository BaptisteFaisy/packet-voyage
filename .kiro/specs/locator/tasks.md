# Tasks — `locator`

Verify with `node scripts/hooks/light-properties.mjs` or
`pnpm vitest run packages/core -- -t "VOY-P-(0[5-9]|1[01])"`; tick only when
green. Ask `geo-reviewer` to re-read before marking done.

## 1. Envelope and bounds

- [ ] 1.1 `src/envelope/envelope.ts` — `computeEnvelopes(hops)`: backward min
  pass; silent hops stay `null` and inherit nothing. Test: `envelope.test.ts`
  with §7.14 hops 5–6 (14.9 → 13.8) and an all-silent tail.
- [ ] 1.2 Property **VOY-P-05**: `it('VOY-P-05 envelope is monotone and <=
  each hop delay')` over generated hop sequences including all-silent tails;
  fixed seed in header.
- [ ] 1.3 `src/envelope/bounds.ts` — `lightBudgetKm`, `stepAllowedKm`
  (`c*env/2 + slackKm`), `triangleAllowedKm`, `lightFloorMs`. All constants
  from `Settings`, zero magic numbers. Test: `bounds.test.ts` (§7.14 hop 4:
  9.6 ms → 1,439 km + slack).

## 2. Fusion, filter, DP, confidence

- [ ] 2.1 `src/locate/fuse.ts` — `fuseCandidates`: deterministic sort,
  single-linkage merge within `agreeRadiusKm`, noisy-OR weight, sorted
  source union. Test: `fuse.test.ts` (VOY-F-14).
- [ ] 2.2 `src/locate/filter.ts` — `filterByLight`: kept + `Rejection[]` with
  `allowed_km`/`needed_km`. Test: `filter.test.ts` (§7.14 hop 4: Ashburn
  rejected at 6,496 km vs 1,439 km; Paris kept at 391 km) (VOY-F-16).
- [ ] 2.3 `src/locate/dp.ts` — `choosePositions`: Viterbi over hops,
  unlocated state (`unlocatedScore`), triangle forbidden, fibre penalty,
  zigzag penalty, same-ASN bonus, deterministic id tie-break. Test:
  `dp.test.ts` incl. `relativeOnly` and anycast (VOY-F-17, VOY-F-19,
  VOY-F-20).
- [ ] 2.4 `src/locate/confidence.ts` — `confidenceOf`: thresholds 0.80/0.50;
  penalty reduction independent of source count. Test: `confidence.test.ts`
  (VOY-F-18).
- [ ] 2.5 `src/locate/index.ts` — `locate(input)`: wires fusion, filter, DP,
  confidence, flat `rejected`, `relativeOnly` flag.

## 3. Properties VOY-P-06 .. VOY-P-11

- [ ] 3.1 `src/locate/arbitraries.ts` — journey generators including
  antimeridian longitudes, silent-only envelopes, anycast clusters, no-source
  runs, impossible candidates.
- [ ] 3.2 **VOY-P-06**: `it('VOY-P-06 no retained position exceeds c*env/2 +
  slackKm')`.
- [ ] 3.3 **VOY-P-07**: `it('VOY-P-07 triangle perimeter S-i-j-S <= c*env_j
  with tolerance')`.
- [ ] 3.4 **VOY-P-08**: `it('VOY-P-08 shuffled candidate and source order
  yields identical path')`.
- [ ] 3.5 **VOY-P-09**: `it('VOY-P-09 impossible candidate never changes
  retained path, only rejected')`.
- [ ] 3.6 **VOY-P-10**: `it('VOY-P-10 adding a concordant source never lowers
  confidence')`.
- [ ] 3.7 **VOY-P-11** (locator half): `it('VOY-P-11 hop with no kept
  candidate is unlocated with null location')`.

## 4. Finish

- [ ] 4.1 §7.14 worked example integration test: Lyon → Paris → London → NY →
  Ashburn produces 1 rejection (Ashburn at hop 4) and exact positions.
- [ ] 4.2 `node scripts/hooks/light-properties.mjs` + `pnpm typecheck &&
  pnpm lint` green; `geo-reviewer` sign-off.
- [ ] 4.3 Journal entry: note any contradiction found during requirements
  analysis (especially triangle tolerance vs hop slack — §14.1) and any
  shrunk counter-examples found (§14.6 fact 2).
