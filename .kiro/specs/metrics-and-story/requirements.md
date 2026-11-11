# Requirements — `metrics-and-story`

Spec method (§14.1): **requirements-first**. Covers **VOY-F-26, VOY-F-27,
VOY-F-28, VOY-F-35** (VOY-F-36 stays out unless explicitly enabled);
verified by properties **VOY-P-14** (light floor), **VOY-P-15** (coherent
summary) and **VOY-P-20** (vocabulary). Owner: `packages/core/src/metrics` +
`packages/core/src/story` (lot L4/L5). Contracts: `docs/CONTRACTS.md` §5.4
(`summarize`, `detectDetours`, `inflationOf`) and §5.5 (`buildStory`,
`passport`, `checkVocabulary`, `FORBIDDEN_PATTERNS`). Steering: `honesty.md`
(claims-guard hook fires on saves in `src/story/**`).

## Introduction

The summary banner is the product's one-sentence answer ("At least 6,655 km ·
91.7 ms · light floor 63.6 ms · inflation 1.44"); the story turns the same
structured journey into template sentences and passport stamps. Both are pure
functions of `(journey, settings)` — no LLM, no clock — and both must satisfy
the vocabulary contract on every generated string.

---

## Requirements

### Requirement 1 — VOY-F-26 (I) + VOY-P-14/15: the summary

#### Acceptance Criteria

1. THE SYSTEM SHALL compute `Summary` (CONTRACTS §2): `distance_km_min` =
   sum of segment `geodesic_km` (displayed preceded by "at least"),
   `rtt_ms` = envelope at the destination (measured), `light_floor_ms` =
   `2 × d(S,D) / lightFibreKmPerMs`, `inflation` = `rtt_ms / light_floor_ms`,
   `countries`, `networks`, `ixps`, `detours`, `rejected_by_light`, `gaps`.
2. FOR any accepted journey with a known source and destination, THE SYSTEM
   SHALL produce `rtt_ms ≥ 2 × d(S,D) / lightVacuumKmPerMs`, i.e. the vacuum
   inflation is ≥ 1 (VOY-P-14).
3. THE SYSTEM SHALL keep the summary coherent (VOY-P-15): distance = sum of
   segments; `countries` = exactly the countries of located hops in hop order
   (deduped consecutive); `rejected_by_light` = flat count of `Rejection`
   entries with reason `light`; `gaps` = silent or unlocated hops.
4. IF source or destination is unlocated, THEN `light_floor_ms` and
   `inflation` SHALL be `null` — never estimated from a default position
   (`honesty.md`).

### Requirement 2 — VOY-F-27 (I): crossings list

#### Acceptance Criteria

1. THE SYSTEM SHALL expose, in hop order: countries of located hops, distinct
   ASNs with names (`networks` count in the summary, detail for the UI), and
   marked IXPs (`ixps` count).

### Requirement 3 — VOY-F-28 (S): detours

#### Acceptance Criteria

1. THE SYSTEM SHALL detect `country-return` (the path leaves a country and
   comes back) and `zigzag` (three located hops A, B, C with
   `d(A,B) + d(B,C) > detourRatio × d(A,C)`, ratio 3) via `detectDetours`,
   each with `ttls` and a `detail` string built from templates.
2. THE SYSTEM SHALL NOT report a detour through unlocated hops (they are
   gaps, not evidence).

### Requirement 4 — VOY-F-35 (S) + VOY-P-20: story by templates only

#### Acceptance Criteria

1. THE SYSTEM SHALL build `StoryEntry[]` (`kind: stop | crossing | gap |
   rejected | arrival`, each with `certainty` and `en`/`fr` text) from
   templates only — no LLM in this edition unless VOY-F-36 is enabled, and
   then every sentence is verified: each number and proper name must appear
   in the journey, else the template sentence is kept (CONTRACTS §5.5).
2. FOR every generated journey, THE SYSTEM SHALL produce story text with no
   forbidden pattern of §5.4 (`FORBIDDEN_PATTERNS`, `checkVocabulary`) and
   every travelled distance preceded by "at least" (VOY-P-20).
3. THE SYSTEM SHALL produce `passport(journey)`: one stamp per country,
   network and IXP with exact counts (`Stamp[]`).
4. THE SYSTEM SHALL set `certainty` on every entry: measured for delays and
   counts, inferred for cities/countries, assumed for crossings and cables
   (§5.3) — a `crossing` entry is always `assumed` wording ("Three cables are
   compatible… Nothing in the measurement says which one carried your
   packet.").
