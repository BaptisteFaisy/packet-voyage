# Design — `crossings-and-cables`

Contracts: `docs/CONTRACTS.md` §5.2 (`EARTH_RADIUS_KM`, `haversineKm`,
`greatCirclePoints`, `pointInPolygon`, `landmassAt`, `crossesWater`,
`toMiles`) and §5.4 (`buildSegments`, `segmentKind`, `compatibleCables`,
`scoreCable`). Steering: `geo-math.md`, `honesty.md`.

## 1. Modules

```
packages/core/src/geo/
  haversine.ts    EARTH_RADIUS_KM = 6371, haversineKm, toMiles, clamp[-1,1]
  arc.ts          greatCirclePoints(a, b, steps) — slerp on unit sphere, normalise lon
  polygon.ts      pointInPolygon, landmassAt, crossesWater (Natural Earth rings)
packages/core/src/segments/
  segments.ts     buildSegments, segmentKind, fixed-link lookup
packages/core/src/cables/
  match.ts        compatibleCables — filter, landing pair selection, sort, cap 5 + other_cables
  score.ts        scoreCable — delay(0.5) + proximity(0.2) + operator(0.3), band
```

## 2. Geometry rules (`geo-math.md`)

- **Haversine** works on `sin(Δφ/2)² + cos(φ₁)cos(φ₂)sin(Δλ/2)²`, clamping
  the square root to `[0, 1]` before `2 * R * asin(...)`. Because `sin(Δλ/2)`
  is periodic in `2π`, shifting both longitudes by `+θ` leaves the result
  invariant up to IEEE-754 ULP (VOY-P-12).
- **Great-circle arc** converts `(lat, lon)` to unit Cartesian `(x, y, z)`,
  interpolates with `sin((1-t)Ω)/sin(Ω)` + `sin(tΩ)/sin(Ω)`, converts back
  to `(lat, lon)` with `atan2` and normalises longitude to `(−180, 180]`.
  Degenerates smoothly to linear when `Ω < 1e-9` (near-identical points) and
  never fails near ±90° latitude or ±180° longitude.
- **`pointInPolygon`**: ray-casting in `(lon, lat)` over Natural Earth rings
  (outer ring index 0, holes index 1..k: inside outer ∧ ¬inside any hole).
  Natural Earth landmasses are already split at ±180° — no unwrapping needed.

## 3. Edge cases

| Case | Handling |
|---|---|
| Antimeridian segment (Suva → Anchorage) | `haversineKm` gives ~7,700 km, not 25,000 km; `greatCirclePoints` crosses ±180° cleanly (UI handles wrap split) |
| Poles (lat ±89.99) | `cos(lat)` near zero handled via Cartesian slerp; `asin` clamped |
| Unlocated hops in the middle | skipped; `skipped_hops` incremented; never start/end a segment |
| All hops unlocated or ≤ 1 located hop | `buildSegments` returns `[]` |
| `delta_ms === null` or `<= 0` (noise / silent envelope) | cannot tighten by delay: `compatibleCables` returns `[]` (honesty: with no delay delta we cannot rank cables; `other_cables: 0`) |
| `undetermined` segment (Marseille → Singapore, same Afro-Eurasia landmass) | `compatibleCables` still runs and returns matches if any exist (§7.9) |
| Fixed link (London → Paris across Channel Tunnel) | `segmentKind` sees distinct landmasses (GB vs Afro-Eurasia) + matching `FixedLink` ⇒ `sea-or-fixed`, `fixed_link: 'Channel Tunnel'` |
| Cable retired before `tracedAt` | excluded; `status === 'in-service'` checked, plus `rfs_year <= year(tracedAt)` when present |
| Cable with empty `geometry` | length between `La` and `Lb` uses `haversineKm(La, Lb) * settings.cableFactor` (§7.10) |
| Tie in compatibility score | sort by `(-compatibility, id)` — deterministic (CONTRACTS §0.7) |

## 4. Test strategy

- Unit tests: `haversine.test.ts` (antimeridian Suva↔Anchorage, pole, identical
  points = 0); `polygon.test.ts` (outer + hole, GB vs continental Europe);
  `segments.test.ts` (London↔Paris = `sea-or-fixed`, Paris↔Lyon =
  `undetermined`, London↔NYC = `sea`, same city = `local`, unlocated hop
  skipped); `cables.test.ts` (§7.14 London→NYC: Cornwall cable scores higher
  than Bilbao cable; retired cable excluded; max 5 shown + exact
  `other_cables`).
- Property **VOY-P-12**: `geo.property.test.ts` — symmetry, `d(a,b)=0 ⇔ a=b`,
  triangle inequality, longitude shift invariance across ±180° wrap. Fixed
  seed in header.
- Property **VOY-P-13**: `cables.property.test.ts` — every listed cable is
  in-service, has two landings, passes the delay budget, score ∈ `[0,1]`,
  `cables.length <= maxCablesShown`, `cables.length + other_cables ===
  allCompatible.length`, order stable across input shuffle. Fixed seed.
- Property **VOY-P-11** (segments half): `segments.property.test.ts` — no
  segment touches an unlocated hop; hop accounting balances.
- `geo-reviewer` reads the diff against `geo-math.md`.
