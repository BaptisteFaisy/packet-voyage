# Requirements — `journey-ui`

Spec method (§14.1): **design-first** — the screen map and component contract
(CONTRACTS §5.9) were fixed before these requirements were written. Covers
**VOY-F-30 … VOY-F-34, VOY-F-44**; carries **VOY-N-01** (zero request after
load), **VOY-N-07** (350 kB), **VOY-N-08** (AA accessibility). Owner:
`apps/web` (lot L9). The `claims-guard` hook fires on saves in
`apps/web/src/**`; steering `honesty.md` applies to every label.

## Introduction

The static site: gallery of six precomputed journeys, paste-a-trace with
local-only computation, the stitched map, the delay timeline, hop and crossing
cards, the roadmap table, story/passport, classroom, sources, settings,
compare. Hash routes only (`#/`, `#/journey/<id>`, `#/compare`, `#/story`,
`#/classroom`, `#/sources`, `#/settings`) — GitHub Pages, no rewrite, no
server, no WebGL requirement.

---

## Requirements

### Requirement 1 — VOY-F-30 (I): the map

**User Story:** As a judge, I click a gallery journey and watch the route get
stitched hop by hop.

#### Acceptance Criteria

1. THE SYSTEM SHALL draw the journey on a world map (`WorldMap`, `d3-geo`
   canvas + SVG interaction layer; `geoOrthographic` globe and
   `geoEqualEarth` flat) with a stroke style per certainty level — solid
   (measured/solid), dashed (inferred), dotted (assumed) — and a colour per
   network, doubled with a pattern in the legend (VOY-N-08).
2. THE SYSTEM SHALL animate the stitching at a pace proportional to real
   delays (constant slowdown factor), and SHALL run no automatic animation
   when `prefers-reduced-motion` is set (VOY-F-34).
3. THE SYSTEM SHALL draw antimeridian-crossing arcs as split segments (no
   wrap-around line across the whole map) and render rejected candidates
   briefly, then struck through (§12.3).

### Requirement 2 — VOY-F-31 (I): delay timeline

#### Acceptance Criteria

1. THE SYSTEM SHALL render hops on a millisecond axis (`DelayTimeline`)
   synchronised with the map: hovering or focusing either highlights the
   other; the envelope is drawn as the monotone curve, raw per-hop minima as
   points (the §7.14 hop-5 inversion must be visible).

### Requirement 3 — VOY-F-32 (I): hop card

#### Acceptance Criteria

1. WHEN a hop is opened (`HopCard`), THE SYSTEM SHALL show: address, name,
   network, delays, envelope, retained position **with its level and
   sources**, and every rejected candidate with reason and
   "allowed {n} km / needed {m} km" (P2). Unlocated hops show "Not located"
   and the gap explanation — never an empty slot, never a guess.

### Requirement 4 — VOY-F-33 (I) + VOY-N-08: roadmap table

#### Acceptance Criteria

1. THE SYSTEM SHALL provide `RoadmapTable` containing **all** information the
   map shows, in hop order, screen-reader accessible; parity is enforced by
   `scripts/guards/roadmap-parity.guard.mjs` (§18).
2. THE SYSTEM SHALL support full keyboard navigation: arrows move between
   hops, Enter opens a card, Escape closes it; every hop change is announced
   (aria-live).
3. THE SYSTEM SHALL carry certainty by stroke style **and** text label, never
   colour alone.

### Requirement 5 — VOY-F-34 (I): step-by-step and states

#### Acceptance Criteria

1. THE SYSTEM SHALL let the user walk the journey hop by hop from the
   keyboard alone.
2. THE SYSTEM SHALL handle every state of §12.2: nothing loaded (gallery +
   paste zone), unreadable trace (first unknown line + accepted formats +
   example), all-private trace ("This trace never left the local network"),
   no located hop (table and timeline still useful; the map explains why it
   is empty), no source position (relative-bounds banner + invite to declare
   a city), offline/no consent (list of what is missing), stale data (dataset
   date mention).

### Requirement 6 — VOY-F-44 (I): gallery

#### Acceptance Criteria

1. THE SYSTEM SHALL offer the six precomputed redacted journeys
   (`ocean-crossing`, `continental`, `detour`, `rejected-by-light`,
   `anycast`, `with-gaps`) loaded in one click from `gallery/index.json` and
   `gallery/<slug>/journey.json` (local JSON assets — **not** bundled into
   the JS, VOY-N-07; fetched same-origin at load, then zero requests,
   VOY-N-01).
2. WHEN a gallery journey shows numbers, THE SYSTEM SHALL show exactly the
   locked `expected.json` values (non-regression test).

### Requirement 7 — VOY-N-01/N-07/N-09: site-wide constraints

#### Acceptance Criteria

1. THE SYSTEM SHALL make **zero network requests after load** (no analytics,
   no fonts from a CDN, no API) — verified by a browser-console check (§18).
2. THE SYSTEM SHALL keep app code under 350 kB compressed
   (`bundle-size.guard.mjs`).
3. THE SYSTEM SHALL ship `i18n/{en,fr}.ts` with the same key set; English
   default; km/ms with optional miles; dates displayed from UTC instants.
