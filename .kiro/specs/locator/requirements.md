# Requirements — `locator`

Spec method (§14.1): **requirements-first**, with spec §7 (chaîne de
traitement, §7.5–7.8) as direct input. Covers **VOY-F-14, VOY-F-16 …
VOY-F-20** (VOY-F-15 lives in `name-hints`); verified by properties
**VOY-P-05 … VOY-P-11**. Owner: `packages/core/src/envelope` +
`packages/core/src/locate` (lots L2/L3). Contract: `docs/CONTRACTS.md` §5.2
(envelope) and §5.3 (locate). Steering: `geo-math.md`. This is the spec where
requirements analysis is most likely to find a contradiction (hard bounds vs
penalties vs tolerances walk all over each other, §14.1) — anything it finds
goes in `KIRO_JOURNAL.md`.

## Introduction

The heart of the product: fuse candidates per hop, filter them by the speed of
light, choose a globally consistent path by dynamic programming, and grade
each retained position. What cannot be located stays unlocated — the rejection
list is kept and shown, it *is* the demo (§7.14 hop 4: Ashburn rejected at
1,439 km allowed vs 6,496 km needed).

---

## Requirements

### Requirement 1 — VOY-F-14 (I): candidates with source and weight

**User Story:** As the pipeline, I hand each public hop a list of candidates
from every available source, each tagged with its source id and starting
weight.

#### Acceptance Criteria

1. THE SYSTEM SHALL accept `candidates: Candidate[][]` index-aligned with
   hops (empty array = none) — `LocateInput` (CONTRACTS §5.3).
2. THE SYSTEM SHALL fuse candidates from different sources closer than
   `agreeRadiusKm` (100) into one, with weight `1 − (1−p₁)(1−p₂)` and the
   union of sources (`fuseCandidates`), deterministically (sorted input,
   stable id tie-breaks).

### Requirement 2 — VOY-F-16 (I): the light constraint, hard and soft

#### Acceptance Criteria

1. THE SYSTEM SHALL compute the delay envelope `envᵢ = min(rttⱼ, j ≥ i)` —
   monotone non-decreasing with ttl, never above an observed delay
   (VOY-P-05); silent hops keep `null` and inherit nothing.
2. THE SYSTEM SHALL reject any candidate with
   `d(source, c) > lightVacuumKmPerMs × envᵢ / 2 + slackKm` (hop bound,
   VOY-P-06) and any pair `i < j` violating
   `d(S,i) + d(i,j) + d(j,S) > lightVacuumKmPerMs × envⱼ` within tolerance
   (triangle bound, VOY-P-07).
3. THE SYSTEM SHALL keep every rejected candidate in `Rejection` form with
   `reason`, `allowed_km` and `needed_km` — rejections are displayed content
   (`honesty.md`), never dropped.
4. THE SYSTEM SHALL treat the fibre budget (204 km/ms) as a **penalty**, not
   a rejection (`geo-math.md`).

### Requirement 3 — VOY-F-17 (I): deterministic global path choice

#### Acceptance Criteria

1. THE SYSTEM SHALL choose positions globally by Viterbi DP per §7.7: state
   score = fused weight; unlocated state = `unlocatedScore` (0.15);
   transitions forbidden on triangle-bound violation, penalised on fibre
   budget overflow and on zigzags > `zigzagKm`, bonused for same-network
   same-city hops < 1 ms apart.
2. THE SYSTEM SHALL give the same path for the same inputs and settings,
   independent of candidate and source order (VOY-P-08); ties break on
   candidate id.
3. THE SYSTEM SHALL never let a hard-bound-violating candidate influence the
   retained path: adding one changes only `rejected` (VOY-P-09).

### Requirement 4 — VOY-F-18 (I): confidence per hop

#### Acceptance Criteria

1. THE SYSTEM SHALL grade each located hop: `solid` ≥ 0.80, `probable` ≥ 0.50,
   `uncertain` < 0.50, from the fused weight reduced by transition penalties
   (`confidenceOf`).
2. THE SYSTEM SHALL never lower confidence when a concordant source is added
   (VOY-P-10).
3. THE SYSTEM SHALL list the founding `sources` on every `Location`.

### Requirement 5 — VOY-F-19 (I): no source position

#### Acceptance Criteria

1. WHERE the user declared a city, THE SYSTEM SHALL use it as the source
   position with source id `declared` (weight 1.00).
2. IF no source is declared and none can be deduced, THEN THE SYSTEM SHALL
   apply only the **relative** bounds between hops, set
   `relativeOnly: true`, and the UI SHALL say so (banner, §12.2) — absolute
   bounds need S and are simply not applied.

### Requirement 6 — VOY-F-20 (S): anycast

#### Acceptance Criteria

1. WHEN a hop is flagged anycast, THE SYSTEM SHALL retain only a
   delay-compatible instance (the light filter does this) and keep
   `anycast: true` on the hop for display.

### Requirement 7 — VOY-P-11: no invented position

#### Acceptance Criteria

1. THE SYSTEM SHALL mark a hop with no kept candidate
   `level: 'unlocated'`, `location: null` — never a centroid, never an
   operator HQ, never a neighbour interpolation presented as a position.
2. Verified with VOY-P-11 (segments side asserted in `crossings-and-cables`).
