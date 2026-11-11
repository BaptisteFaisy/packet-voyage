# Tasks — `journey-ui`

Verify with `pnpm vitest run apps/web` (+ guards where named); tick only when
green. The `claims-guard` hook fires on every save under `apps/web/src/**`.

## 1. Shell and data

- [ ] 1.1 `src/main.tsx`, `src/App.tsx` — hash router over the seven routes;
  `src/state/store.ts` focus/playing/language/units/projection state. Test:
  route navigation test per hash (VOY-F-44 groundwork).
- [ ] 1.2 `src/lib/journey-load.ts` — fetch `gallery/index.json` +
  `journey.json` assets once, validate with `parseJourney`; error surface for
  invalid files (VOY-N-03). Test: loads the six slugs; corrupted fixture →
  structured error (VOY-F-44).
- [ ] 1.3 `src/lib/i18n/{en,fr}.ts` — same key set, English default. Test:
  key-parity snapshot (VOY-N-09).

## 2. Map and timeline

- [ ] 2.1 `src/map/projections.ts` + `arc-split.ts` — globe/flat projections;
  antimeridian arc splitting using core `greatCirclePoints`. Test:
  `arc-split.test.ts` — Suva↔Anchorage arc splits into two polylines
  (VOY-F-30, VOY-P-12 consumer).
- [ ] 2.2 `src/map/WorldMap.tsx` + `MapInteraction.tsx` — canvas render
  (landmasses, cable watermark, stitched route with certainty strokes,
  network colours + patterns), SVG hit layer, rejected-candidate
  strike-through. Test: certainty→stroke mapping unit test; render smoke
  (VOY-F-30).
- [ ] 2.3 `src/lib/motion.ts` + stitching animation ∝ `delta_ms`; disabled
  under `prefers-reduced-motion`. Test: mock matchMedia both ways (VOY-F-34).
- [ ] 2.4 `src/panels/DelayTimeline.tsx` — ms axis, envelope curve, raw
  minima points, focus sync via store. Test: §7.14 hop-5 inversion visible
  (envelope 13.8 under raw 14.9) (VOY-F-31).

## 3. Panels and table

- [ ] 3.1 `src/panels/SummaryBanner.tsx` — "At least {km} km · {ms} ms ·
  floor {ms} · inflation {n} · {countries} countries where a hop was located
  · {n} rejected by light"; relative-bounds banner when `relativeOnly`
  (VOY-F-26/27 consumer, `honesty.md`). Test: §7.14 strings exactly.
- [ ] 3.2 `src/panels/HopCard.tsx` — measured/inferred/assumed sections,
  sources, rejections with allowed/needed km, "Not located" state, anycast
  badge (VOY-F-32). Test: P2 scenario snapshot.
- [ ] 3.3 `src/panels/CrossingCard.tsx` — nature label, "at least" distance,
  compatible cables ranked with bands + `other_cables`, the "Nothing in the
  measurement says which one" sentence (VOY-F-23 consumer). Test: P3
  scenario.
- [ ] 3.4 `src/panels/RoadmapTable.tsx` + `HopList.tsx` — full-parity table,
  keyboard nav (arrows/Enter/Escape), aria-live announcements. Test:
  keyboard walk visits every hop; `node scripts/guards/roadmap-parity.guard.mjs`
  green on gallery journeys (VOY-F-33, VOY-F-34, VOY-N-08).
- [ ] 3.5 Empty states of design §4, one component test each (VOY-F-34,
  §12.2).

## 4. Views and budgets

- [ ] 4.1 `GalleryView`, `PasteTrace` (paste → `computeJourney` in-browser),
  `StoryView`, `PassportView`, `ClassroomView`, `SourcesView` (provenance
  sheets + dataset dates + stale mention), `SettingsView`, `CompareView`
  (two journeys, one map, side-by-side summaries). Tests: one per view
  (VOY-F-44, VOY-F-35/29 consumers, VOY-N-11).
- [ ] 4.2 `node scripts/guards/bundle-size.guard.mjs` green (< 350 kB
  compressed; datasets not in the JS bundle) (VOY-N-07).
- [ ] 4.3 Zero-request check: build, serve `dist/`, load a journey, record
  the console/network log — no request after load (VOY-N-01, §18). Paste the
  log path in the journal.
- [ ] 4.4 `claims-reviewer` pass over labels; `pnpm typecheck && pnpm lint`
  green; journal entry.
