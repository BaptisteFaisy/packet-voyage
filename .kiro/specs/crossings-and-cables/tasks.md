# Tasks — `crossings-and-cables`

Verify with `pnpm vitest run packages/core`; tick only when green. Ask
`geo-reviewer` to re-read before marking done.

## 1. Geometry (`src/geo`)

- [ ] 1.1 `src/geo/haversine.ts` — `EARTH_RADIUS_KM = 6371`, `haversineKm`,
  `toMiles`. Test: `haversine.test.ts` — London↔NYC ≈ 5,570 km,
  Suva↔Anchorage (antimeridian), polar pair, identical = 0.
- [ ] 1.2 `src/geo/arc.ts` — `greatCirclePoints` via Cartesian slerp,
  normalised lon. Test: `arc.test.ts` — steps count, endpoints match,
  antimeridian arc stays short.
- [ ] 1.3 `src/geo/polygon.ts` — `pointInPolygon` (with holes), `landmassAt`,
  `crossesWater`. Test: `polygon.test.ts`.
- [ ] 1.4 Property **VOY-P-12**: `geo.property.test.ts` — symmetry, zero iff
  equal, triangle inequality, longitude-shift invariance; fixed seed in
  header comment.

## 2. Segments (`src/segments`)

- [ ] 2.1 `src/segments/segments.ts` — `buildSegments`, `segmentKind`
  (`local`, `undetermined`, `sea`, `sea-or-fixed` with `fixed_link`),
  counting `skipped_hops` and computing `delta_ms`. Test: `segments.test.ts`
  covering all four kinds + VOY-F-21, VOY-F-22, VOY-F-25 + §7.14 segments.
- [ ] 2.2 Property **VOY-P-11** (segments half): `segments.property.test.ts`
  — no segment starts/ends on an unlocated hop; skipped + located balance.

## 3. Cables (`src/cables`)

- [ ] 3.1 `src/cables/score.ts` — `scoreCable` (delay 0.5, proximity 0.2,
  operator 0.3 / 0.5 unknown), band mapping (`high`/`medium`/`low`). Test:
  `score.test.ts` — bounds `[0,1]`, operator bonus, unknown-owners 0.5
  neutral (VOY-F-23).
- [ ] 3.2 `src/cables/match.ts` — `compatibleCables`: `in-service` filter at
  `tracedAt`, landing pairs, geometry-or-`cableFactor` length, delay budget
  check (`cableTolerance`), deterministic sort `(-compatibility, id)`, cap at
  `maxCablesShown` (5), exact `other_cables`. Test: `cables.test.ts` — §7.14
  Atlantic crossing (Cornwall > Bilbao), retired cable ignored, full
  `CableMatch` metadata including `source` (VOY-F-23, VOY-F-24).
- [ ] 3.3 Property **VOY-P-13**: `cables.property.test.ts` — in-service,
  landings on both sides, delay condition, score ∈ `[0,1]`, cap 5, exact
  `other_cables`, order invariant under cable-array shuffle. Fixed seed in
  header.

## 4. Finish

- [ ] 4.1 `pnpm typecheck && pnpm lint && pnpm vitest run packages/core`
  green; `node scripts/guards/limits.guard.mjs` green; `geo-reviewer`
  sign-off.
