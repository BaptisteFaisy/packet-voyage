# Design — `locator`

Contracts: `docs/CONTRACTS.md` §5.2 (`computeEnvelopes`, `lightBudgetKm`,
`stepAllowedKm`, `triangleAllowedKm`, `lightFloorMs`) and §5.3 (`LocateInput`,
`LocateResult`, `locate`, `fuseCandidates`, `filterByLight`,
`choosePositions`, `confidenceOf`). Settings from `src/settings.ts` (§7.13
defaults). Steering: `geo-math.md` (all distances via `src/geo.haversineKm`).

## 1. Modules

```
packages/core/src/envelope/
  envelope.ts   computeEnvelopes(hops) → (number|null)[]   (VOY-P-05)
  bounds.ts     lightBudgetKm, stepAllowedKm, triangleAllowedKm, lightFloorMs
packages/core/src/locate/
  fuse.ts       fuseCandidates — radius merge, noisy-OR weights (VOY-F-14)
  filter.ts     filterByLight — kept + Rejection[] (VOY-F-16, VOY-P-06)
  dp.ts         choosePositions — Viterbi over hops (VOY-F-17, VOY-P-08)
  confidence.ts confidenceOf — thresholds 0.80/0.50 (VOY-F-18, VOY-P-10)
  index.ts      locate(input) — orchestration + triangle pass + relativeOnly
```

## 2. Data flow

```
locate(input):
  envelopes = computeEnvelopes(hops)                  # or passed in
  for each hop i with candidates:
    fused[i] = fuseCandidates(candidates[i])          # radius merge
    if source known: kept[i], rej = filterByLight(fused[i],
                       stepAllowedKm(env[i]), source) # hard bound
    else: kept[i] = fused[i]                           # relativeOnly
  located = choosePositions(kept → LocatedHop[])       # DP, triangle bound
                # transitions violating triangle(env_j) are forbidden;
                # the losing side of a forbidden transition keeps its
                # rejection entry (reason 'triangle')
  confidence per retained position; unlocated → location null
  return { hops, rejected (flat), relativeOnly }
```

## 3. Key decisions

- **Envelope**: `envᵢ = min(rttⱼ, j ≥ i)` — one backward pass over hops,
  taking `min(rtt_ms)` per hop; a hop with no reply keeps `null` and inherits
  nothing; a `null` envelope means **no bound can be computed** for that hop:
  its candidates pass unfiltered by the hop bound (only the triangle bound
  from a later located hop with an envelope constrains them). This is the
  "envelope made only of silent hops" counter-example source (§14.6): the
  code must not treat `null` as 0 or ∞.
- **Fusion**: sort candidates by `(source, city, lat, lon)`, single-linkage
  merge within `agreeRadiusKm`; weight `1−∏(1−pᵢ)`; merged sources union,
  sorted. Deterministic by construction.
- **DP**: states per hop = kept candidates + one ` there-is-no-position`
  state scored `unlocatedScore`. Maximise Σ log(score); transitions: forbidden
  if triangle violated (`triangleAllowedKm`), penalty if
  `d(a,b) > 204×(env_b−env_a)/2 + slackKm`, penalty if the path zigzags away
  from S and back by > `zigzagKm`, bonus same-ASN same-city < 1 ms. Ties on
  candidate id ⇒ VOY-P-08.
- **Rejections**: `filterByLight` fills `allowed_km` (the bound) and
  `needed_km` (haversine source→candidate); DP-forbidden transitions add
  `reason: 'triangle'`; no-candidate hops need no rejection entry.
- **Confidence**: fused weight × transition factor; clamp to [0,1]; level by
  threshold. Adding a concordant source raises fused weight (noisy-OR is
  monotone) ⇒ VOY-P-10 holds structurally; the transition factor must not
  depend on the number of sources.

## 4. Edge cases

| Case | Handling |
|---|---|
| Antimeridian source/candidates | all distances via `haversineKm` (VOY-P-12 territory); no Δlon shortcuts |
| IPv6 shorthand | normalization happened upstream (`addr`); locator sees normalized strings only |
| Silent hops | `null` envelope; hop stays candidate-free in practice (no reply ⇒ no address ⇒ no candidate); never placed (VOY-P-11) |
| MPLS tunnel (huge gap between envelopes) | long transitions are legal; fibre penalty applies but never rejection |
| Anycast | several far-apart candidates; light filter keeps the compatible instance; `hop.anycast` preserved |
| No source position | `relativeOnly = true`; hop bound skipped; triangle bound between located pairs still applies; UI banner (VOY-F-19) |
| All candidates rejected | `location: null`, `level: 'unlocated'`, rejections kept |
| Equal-weight candidates at different cities | DP tie-break on candidate id, stable across runs |

## 5. Test strategy

- Unit: envelope monotonicity fixtures (§7.14 hops 5–6: 14.9 then 13.8);
  fusion radius/noisy-OR; filter boundary at exactly `allowed_km`.
- Properties (fixed seeds recorded in file headers):
  **VOY-P-05** envelope monotone & ≤ delays; **VOY-P-06** retained ≤
  `c×env/2+slack`; **VOY-P-07** triangle perimeter; **VOY-P-08** shuffled
  candidate/source order ⇒ identical path; **VOY-P-09** injected impossible
  candidate changes only `rejected`; **VOY-P-10** adding concordant source
  never lowers confidence; **VOY-P-11** no-candidate ⇒ unlocated, no
  segment touches it (segment half in `crossings-and-cables`).
- Generators produce journeys with: antimeridian-crossing longitudes, silent
  hops (null envelopes), anycast clusters, contradictory geodb candidates
  (§7.14 hop-4 Ashburn shape), and no-source runs.
- The `light-properties` hook re-runs VOY-P-05..11 on every save under
  `envelope/` or `locate/`.
- Requirements-analysis contradictions found while writing this spec: record
  in `KIRO_JOURNAL.md` (§14.1 asks specifically for this spec).
