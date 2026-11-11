---
inclusion: fileMatch
fileMatchPattern:
  - "packages/core/src/geo/**"
  - "packages/core/src/envelope/**"
  - "packages/core/src/locate/**"
  - "packages/core/src/cables/**"
---

# Packet Voyage — geometry & bounds steering (VOY-P-06/07/12)

Everything here is spherical geometry on Earth and arithmetic on delays. One
wrong formula silently moves a city or breaks the light bound. Read before
touching `geo`, `envelope`, `locate` or `cables`; the `geo-reviewer` agent
re-reads your diff against this file.

## Units and named constants

- Distances in **km**, delays in **ms**, angles in radians internally
  (degrees only at the `Position` boundary: `lat`, `lon`).
- Use the named constants — never re-declare a number:
  `EARTH_RADIUS_KM = 6371` (src/geo), `settings.lightVacuumKmPerMs = 299.79`
  (hard bound), `settings.lightFibreKmPerMs = 204` (plausibility bound, floor,
  cable delays), `settings.slackKm = 50` (tolerance: a city is not a point).
- No flat-degree maths: never `(lat2-lat1)² + (lon2-lon1)²`, never
  "1° ≈ 111 km" applied to longitude, never averaging longitudes naively.
  Longitude degrees shrink by cos(lat); at the poles they mean nothing.

## The bounds (spec §7.6) — vacuum is hard, fibre is soft

```
hop bound:      d(S, pᵢ) ≤ c × envᵢ / 2 + slackKm          (hard, rejects)
triangle bound: d(S,pᵢ) + d(pᵢ,pⱼ) + d(pⱼ,S) ≤ c × envⱼ    (hard, i < j, tolerance included)
fibre budget:   204 × (env_b − env_a) / 2 + slackKm          (soft: penalised, never rejected)
light floor:    2 × d(S,D) / lightFibreKmPerMs               (VOY-P-14: rtt ≥ 2d/c in vacuum)
```

- A hard-bound violation **rejects**: the candidate goes to `rejected` with
  `allowed_km` and `needed_km`, and never changes the retained path
  (VOY-P-09).
- A fibre-budget violation only **penalises** the DP transition — radio and
  satellite links legitimately beat fibre.
- The envelope (`computeEnvelopes`, §7.6) is `envᵢ = min(rttⱼ, j ≥ i)`:
  monotone non-decreasing with ttl, never above any observed delay (VOY-P-05).
  Silent hops keep `null` and inherit nothing — an all-silent tail must not
  produce a bound from thin air.

## Antimeridian and poles

- `haversineKm` must be antimeridian-safe: work on Δλ through
  `atan2`/`haversin` of the angle difference — never `Math.abs(lon1 - lon2)`
  (Fiji ↔ Alaska is 5° apart, not 355°). VOY-P-12 explicitly tests shifting
  all longitudes by a constant angle: distances must not change.
- Great-circle interpolation (`greatCirclePoints`) must not produce a jump
  across ±180°: normalise each interpolated longitude into (−180, 180].
- Near the poles: cos(lat) → 0, bearing formulas degenerate; clamp arguments
  of `asin`/`acos` to [−1, 1] against float drift. `pointInPolygon` uses
  longitude-ray casting — pick a convention and document it for rings crossing
  the antimeridian (Natural Earth landmasses are pre-split, do not re-split).
- Test fixtures must include an antimeridian case (e.g. Suva ↔ Anchorage) and
  a polar case.

## Cables (spec §7.10)

```
L = landFactor × d(A,La) + cableLength(La→Lb) + landFactor × d(Lb,B)
t = 2 × L / lightFibreKmPerMs        compatible if t ≤ Δ × (1 + cableTolerance)
```

`cableLength` follows the cable geometry when usable, else straight-line ×
`cableFactor`. Score components: delay 0.5, proximity 0.2, operator 0.3
(0.5 when owners unknown). Score ∈ [0,1], banded high ≥ 0.6 / medium ≥ 0.3 /
low; **never presented as a probability** (`honesty.md`). Only cables
`in-service` at `tracedAt` with a landing on each side.

## Determinism

`choosePositions` is a Viterbi DP over hops; ties break on candidate id
(VOY-P-08). Sort candidate lists with an explicit total comparator before any
selection. Cost: hops × candidates² — fine; do not "optimise" with hashmaps
whose iteration order leaks into results.

## Checklist before commit

1. No magic numbers — every constant has a name and a spec reference.
2. No degree-plane arithmetic anywhere in the diff.
3. Antimeridian + pole fixture covered; VOY-P-05..13 still green.
4. `node scripts/hooks/light-properties.mjs` passes (runs VOY-P-05..11).
5. Ask `geo-reviewer` to re-read the diff.
