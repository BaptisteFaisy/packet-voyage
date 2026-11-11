---
inclusion: always
---

# Packet Voyage — structure steering

## Workspace map (CONTRACTS §1)

```
packages/schema/    Zod schemas + inferred types (journey.json, provenance)
packages/core/      pure computation — no network, no clock, no randomness
  src/parse/        trace readers (traceroute, tracert, mtr text, mtr json, atlas) + writers
  src/addr/         IPv4/IPv6 parsing, classes (§7.3), prefix membership
  src/geo/          haversine, great-circle arcs, antimeridian, point-in-polygon
  src/hints/        router-name hints (airport codes, city names), exclusion list
  src/envelope/     delay envelope, vacuum and fibre bounds
  src/locate/       candidate fusion, light filtering, path choice (DP), confidence
  src/segments/     segments, nature (land/sea/…), skipped hops
  src/cables/       compatible cables, score, bands
  src/metrics/      summary, inflation, light floor, detours
  src/story/        journey log templates, passport stamps, vocabulary control
  src/redact/       redaction by level
  src/share/        fragment link encode/decode
  src/settings.ts   L0 — import, never edit
  src/index.ts      L0 — import, never edit
  src/pipeline.ts   L0 — computeJourney(); never edit, report if it must change
packages/enrich/    Node-only adapters: rDNS, RIPEstat, IPmap, PeeringDB, DB-IP,
                    cache, consent, enrichment orchestrator (only place with network)
packages/data/      datasets + provenance sheets + loaders + LICENCE-DATA.md
scripts/data/       extraction and build scripts (Overpass, Natural Earth) + cache/
apps/cli/           `voyage` command: trace, read, enrich, share, data, consent, mcp
apps/web/           static site: gallery, paste, map, timeline, cards, table, a11y
apps/mcp/           MCP server (4 tools, JSON-RPC over stdio)
power/              Kiro power declaration (packet-voyage.md)
gallery/            six redacted sample journeys + fixtures + expected.json
scripts/guards/     *.guard.mjs run by scripts/guards/run-all.mjs (CI)
scripts/hooks/      the same guards as Kiro hook entry points (*.mjs)
.kiro/              steering, specs, hooks, agents, skills, settings
docs/               CONTRACTS.md, fr/CAHIER-DES-CHARGES.md, SOURCES.md, VALIDATION.md
KIRO_JOURNAL.md     the build journal (§14.3, §14.6)
```

## Where code goes

- A rule that needs a **number** (a bound, a threshold, a factor) goes in
  `Settings` (`packages/core/src/settings.ts`), not in a module constant.
- A **wire shape** goes in `packages/schema`; modules import the inferred
  types, they never redefine field names.
- Anything that touches the network, the filesystem cache or the system
  resolver goes in `packages/enrich` — never in `core`, never in `web`.
- Shared web logic goes in `apps/web/src/lib/` with **no React import**;
  components keep the contracted names (CONTRACTS §5.9: `App`, `GalleryView`,
  `PasteTrace`, `JourneyView`, `SummaryBanner`, `WorldMap`, `DelayTimeline`,
  `HopList`, `HopCard`, `CrossingCard`, `RoadmapTable`, `StoryView`,
  `PassportView`, `ClassroomView`, `SourcesView`, `SettingsView`,
  `CompareView`).

## Tests are colocated

`src/<module>/<name>.test.ts`, run by `vitest run`. Property tests carry their
id in the test name: `it('VOY-P-06 no retained position violates the light
bound', …)`. Fixtures use documentation address ranges only (RFC 5737 /
RFC 3849) — see `privacy.md`.

## Pipeline order (CONTRACTS §6)

```
parseTrace → enrichHops → computeEnvelopes → locate → buildSegments
→ compatibleCables → summarize → buildStory → redactJourney → encodeShareLink
```

Each stage consumes only the previous stage's contracted output; no stage
reaches two levels back. `computeJourney(input)` in `pipeline.ts` wires them.

## Ownership discipline

Write only inside the directories your lot owns (CONTRACTS §1). No shared-file
edits, no root-config edits, no git commands from agents. `.kiro/` must stay
present and untracked-by-gitignore — `scripts/guards/kiro-tracked.guard.mjs`
checks it (§18 acceptance).
