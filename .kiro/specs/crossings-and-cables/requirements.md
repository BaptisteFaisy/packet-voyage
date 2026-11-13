# Requirements — `crossings-and-cables`

Spec method (§14.1): **requirements-first**. Covers **VOY-F-21 … VOY-F-25**;
verified by properties **VOY-P-11** (segments half), **VOY-P-12** (geometry
& antimeridian) and **VOY-P-13** (cables). Owner: `packages/core/src/geo`,
`src/segments`, `src/cables` (lots L2/L4). Contracts: `docs/CONTRACTS.md`
§5.2 (`geo`) and §5.4 (`segments`, `cables`). Steering: `geo-math.md`,
`honesty.md`.

## Introduction

Given a list of located hops, stitch them into segments, classify each
crossing (local, undetermined, sea, sea-or-fixed), and list the submarine
cables *compatible* with the crossing — never claiming which cable carried
the packet. Everything runs on spherical Earth geometry (antimeridian-safe,
pole-safe) with named constants.

---

## Requirements

### Requirement 1 — VOY-F-21 (I) + VOY-P-11: segments span located hops only

#### Acceptance Criteria

1. THE SYSTEM SHALL build a `Segment` between every pair of consecutive
   **located** hops, carrying `from_ttl`, `to_ttl`, `geodesic_km` (via
   `haversineKm`), `delta_ms` (`env_to - env_from`, or `null` if either
   envelope is `null`) and `skipped_hops` (count of silent or unlocated hops
   in between).
2. THE SYSTEM SHALL NOT start or end any segment on an unlocated hop; the
   sum of `skipped_hops` across segments + unlocated tail/head + located
   hops equals the number of hops (and for public hops, matches VOY-P-11).

### Requirement 2 — VOY-F-22 (I) + VOY-F-25 (S): segment nature and fixed links

#### Acceptance Criteria

1. THE SYSTEM SHALL classify each segment per §7.9 (`segmentKind`):
   - `local`: same city or `geodesic_km < settings.localKm` (50 km);
   - `undetermined`: same `Landmass` (different cities, ≥ `localKm`) —
     "Overland or undersea: cannot tell";
   - `sea`: different `Landmass`es, no fixed link — "Sea crossing";
   - `sea-or-fixed`: different `Landmass`es connected by a `FixedLink` in the
     table (e.g. Channel Tunnel, VOY-F-25) — `fixed_link` names it.
2. THE SYSTEM SHALL NOT invent a landmass for a point in water if none
   matches; `landmassAt` returns `null` (which behaves as distinct from any
   landmass ⇒ `sea`).

### Requirement 3 — VOY-F-23 (I) + VOY-P-13: compatible cables, never certain

#### Acceptance Criteria

1. FOR EACH `sea`, `sea-or-fixed` or `undetermined` segment, THE SYSTEM SHALL
   list compatible cables per §7.10:
   - `status === 'in-service'` at `tracedAt` (and RFS ≤ year of `tracedAt` if
     known);
   - one landing on each side (`La` near `A`, `Lb` near `B` — same landmass or
     nearest endpoint);
   - estimated length `L = landFactor * d(A,La) + cableLen + landFactor * d(Lb,B)`
     gives `t = 2 * L / lightFibreKmPerMs <= delta_ms * (1 + cableTolerance)`;
     IF `delta_ms` is `null` or `<= 0` (no usable delay budget), THEN THE
     SYSTEM SHALL list no cable rather than guess (design §3).
2. THE SYSTEM SHALL score each cable in `[0, 1]` (`delay` 0.5, `proximity`
   0.2, `operator` 0.3 with 0.5 when owners unknown), assign `band`
   (`high ≥ 0.6`, `medium ≥ 0.3`, else `low`), sort stably, keep at most
   `settings.maxCablesShown` (5), and set `other_cables` to the exact count
   of compatible cables not shown (VOY-P-13).
3. THE SYSTEM SHALL NEVER present a cable as used or a score as a
   probability (`honesty.md`).

### Requirement 4 — VOY-F-24 (I): cable detail sheet data

#### Acceptance Criteria

1. EVERY `CableMatch` SHALL carry `id`, `name`, `compatibility`, `band`,
   `landings`, `length_km`, `rfs_year`, `owners` and `source` (the
   provenance id, e.g. `osm-cables`), so the UI displays the source of each
   fact.

### Requirement 5 — VOY-P-12: spherical geometry holds everywhere

#### Acceptance Criteria

1. `haversineKm` SHALL be symmetric, zero iff points are equal, satisfy the
   triangle inequality, and be **invariant under shifting all longitudes by
   any constant angle** (antimeridian-safe). Verified by VOY-P-12.
