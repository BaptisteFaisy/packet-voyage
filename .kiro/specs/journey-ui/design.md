# Design — `journey-ui`

Contract: `docs/CONTRACTS.md` §5.9 — component names are binding: `App`,
`GalleryView`, `PasteTrace`, `JourneyView`, `SummaryBanner`, `WorldMap`,
`DelayTimeline`, `HopList`, `HopCard`, `CrossingCard`, `RoadmapTable`,
`StoryView`, `PassportView`, `ClassroomView`, `SourcesView`, `SettingsView`,
`CompareView`; shared logic in `apps/web/src/lib/` (**no React import
there**). Screens/states: spec §12.1–12.4. Art direction §12.3: the route is
a **stitch** — thread per network, solid/dashed/dotted per certainty.

## 1. Structure

```
apps/web/src/
  main.tsx  App.tsx            # hash router (no react-router dependency needed)
  views/    GalleryView  JourneyView  StoryView  PassportView  ClassroomView
            SourcesView  SettingsView  CompareView  PasteTrace
  map/      WorldMap.tsx (canvas d3-geo)  MapInteraction.tsx (SVG layer)
            projections.ts (geoOrthographic / geoEqualEarth)  arc-split.ts
  panels/   SummaryBanner  DelayTimeline  HopList  HopCard  CrossingCard
            RoadmapTable
  lib/      journey-load.ts  highlight.ts (shared focus state)  format.ts
            certainty-style.ts  i18n/{en,fr}.ts  motion.ts (reduced-motion)
  state/    store.ts (selected hop, playing, language, units, projection)
```

Data flow: `gallery/index.json` → `Journey` JSON assets →
`parseJourney` (schema validation on load, VOY-N-03) → components. Paste
flow: text → `parseTrace` → `computeJourney` (core, in-browser, datasets as
JSON assets) → same components. **No network after load**: assets are fetched
once at first paint from the same origin; nothing else — no font CDN, no
analytics (VOY-N-01, §18 console check).

## 2. Map rendering

- Canvas draws landmasses, cable watermark, the stitched route; an SVG layer
  holds hit targets per hop/segment for pointer + keyboard focus.
- Certainty → stroke: solid / dashed `[6 4]` / dotted `[2 4]`, plus a text
  label in card and table (never colour alone, VOY-N-08). Network → colour +
  legend pattern.
- **Antimeridian**: `arc-split.ts` cuts any great-circle arc at ±180° into
  two polylines before projecting (uses `greatCirclePoints` from core — no
  local geo maths; `geo-math.md`).
- Animation: requestAnimationFrame stepping hop-by-hop, duration ∝ segment
  `delta_ms` × constant factor; fully disabled under
  `matchMedia('(prefers-reduced-motion: reduce)')` (VOY-F-34).

## 3. Interaction model

One shared focus state (`state/store.ts`): `focusedTtl`. `WorldMap`,
`DelayTimeline`, `HopList`, `RoadmapTable` all read it ⇒ hover/focus sync is
free (VOY-F-31). Keyboard: `←/→` move focus, `Enter` opens `HopCard` /
`CrossingCard`, `Escape` closes; hop changes announced through an
`aria-live="polite"` region.

## 4. Edge cases (§12.2, all get a designed empty state)

| Case | Rendering |
|---|---|
| Unreadable trace | first `unknownLines[0]` verbatim + accepted formats + example snippet |
| All-private trace | "This trace never left the local network" + explanation card |
| No located hop | timeline + table still rendered; map shows a caption, no fake pins |
| `relativeOnly` (no source) | `SummaryBanner` shows relative-bounds notice + "declare your city" |
| Silent hops | gap glyphs on the timeline; `skipped_hops` shown on segments |
| Anycast hop | badge on `HopCard`; only the retained instance drawn |
| Rejected candidate | struck-through pin animation (reduced-motion: static strikethrough) |
| Stale dataset (> 90 d) | discreet date mention in `SourcesView` + map footer |
| Huge journey (> 64 hops) | timeline scrolls; map fits bounds; table paginates by 30 |

## 5. Test strategy

- `lib/` is pure: unit tests for `arc-split` (antimeridian case),
  `certainty-style` mapping, `format` ("at least 6,655 km"), i18n key-set
  parity between `en.ts` and `fr.ts`.
- Component tests (vitest + testing-library): gallery loads six slugs; hop
  card shows rejection line with allowed/needed km; empty states table-driven
  per design §4; keyboard walk visits every hop (VOY-F-34).
- `roadmap-parity.guard.mjs` (§18): every hop and segment of each gallery
  journey appears in `RoadmapTable` output.
- Bundle: `bundle-size.guard.mjs` < 350 kB compressed; datasets excluded from
  the JS bundle (grep the built assets for `datasets/`).
- Manual/E2E (recorded, §18): browser console shows **zero** requests after
  load; full keyboard tour recorded.
- `claims-reviewer` pass over all label files (i18n + panels) — the
  `claims-guard` hook already blocks forbidden phrasing on save.
