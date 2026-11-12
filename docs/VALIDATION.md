# Validation plan — every claim proven by a log or a file

The specification (§18) requires that each acceptance point is proven by a log or
a file, never by eye or by ear. This table maps each point to the command that
proves it and to the artefact it leaves behind.

| # | Acceptance point (§18) | Command | Artefact |
|---|---|---|---|
| 1 | The six gallery journeys reproduce the summary locked in their reference files | `npx vitest run gallery` | test run log |
| 2 | The worked example of §7.14 gives: at least 6,655 km, 91.7 ms, floor 63.6 ms, inflation 1.44, one light rejection | `npx vitest run packages/core/src/pipeline.test.ts` | test run log |
| 3 | The twenty properties pass and their seeds are recorded | `npx vitest run packages/core packages/enrich` | seeds in the test file headers |
| 4b | The **deployed** site is reachable by everyone and works end to end | `node scripts/verify-live-site.mjs` (anonymous headless Chromium against the public URL) | `docs/evidence/live-site-*.log`: 9 screens rendered, a journey opened, the light cone drawn, 0 request outside the origin |
| 4c | The **deployed** site computes a visitor's own trace exactly like the command line does | `node scripts/verify-user-data.mjs` (anonymous headless Chromium against the public URL, `voyage read --offline` as the oracle) | `docs/evidence/user-data-*.log`: the nine banner numbers equal the oracle, the catalogue names the data it demonstrates, 0 request outside the origin |
| 4 | The site makes no request after load | `node scripts/verify-no-request.mjs` (real Chromium, full visit) and `node scripts/guards/no-network.guard.mjs` | `docs/evidence/no-request-2026-11-11.log`: "0 external request(s) after load — 12 loopback asset(s)", CSP recorded |
| 5 | `--offline` opens no outbound connection | `node packages/enrich/src/offline.test.ts` via vitest | test asserting zero `fetch` calls |
| 6 | No enrichment request carries a non-public address | `npx vitest run packages/enrich` (VOY-P-04) | test log |
| 7 | `voyage trace` refuses a range, a list, an argument starting with a dash | `node apps/cli/bin/voyage.mjs trace 192.0.2.0/24; echo $?` | exit code 2 recorded in the test log |
| 8 | A shared journey holds no private address, no access network, no departure finer than the country | `node scripts/guards/fixture-privacy.guard.mjs` | guard log |
| 9 | The vocabulary check finds no forbidden wording in labels or in the journey log | `node scripts/guards/vocabulary.guard.mjs` | guard log |
| 10 | Every vendored dataset has a provenance sheet and the sources page lists them all | `node scripts/guards/data-licence.guard.mjs` | guard log + `docs/SOURCES.md` |
| 11 | The public repository holds no TeleGeography or PeeringDB data | `node scripts/guards/data-licence.guard.mjs` (refuses those origins) | guard log |
| 12 | `traceroute`, `tracert` (two languages at least) and `mtr` traces are read without loss | `npx vitest run packages/core/src/parse` | test log over the Annexe B fixtures |
| 13 | The roadmap table contains every hop and every segment of the map | `node scripts/guards/roadmap-parity.guard.mjs` + `npx vitest run apps/web` | guard log + test log |
| 14 | The whole journey can be walked with the keyboard | `npx vitest run apps/web` (keyboard navigation test) | test log |
| 15 | The `probe-guard` hook blocked at least one attempt during the build | `KIRO_JOURNAL.md` entry + `scripts/hooks/probe-guard.mjs` self-test | journal line |
| 16 | `.kiro` is present at the root and not git-ignored; the MIT licence is detected | `node scripts/guards/kiro-tracked.guard.mjs` | guard log |
| 17 | A file stays under 500 lines and a function under 50 lines | `node scripts/guards/limits.guard.mjs` | guard log |
| 18 | The site stays inside its weight budget | `node scripts/guards/bundle-size.guard.mjs` (after `pnpm build`) | guard log with measured sizes |

## One command for everything

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && node scripts/guards/run-all.mjs
```

CI runs exactly this on the self-hosted runners, inside a five-minute budget
(`.github/workflows/ci.yml`, guarded by `.github/workflows/ci-budget.yml`).

## Numbers to record before the freeze

| Measure | Target | Measured | How it is measured |
|---|---|---|---|
| Parse + compute a 30-hop journey | < 200 ms | **30.6 ms** | `npx vitest run packages/core/src/pipeline.perf.test.ts` (asserts the bound, prints the number) |
| Site application code, compressed | < 350 kB | **191.5 kB** (JS + CSS, gzip) | `node scripts/guards/bundle-size.guard.mjs` after `pnpm build` |
| Vendored data, compressed | < 1.5 MB | **116 kB** (736 kB raw) | same guard; `packages/data` provenance sheets |
| The §7.14 worked example | at least 6,655 km · 91.7 ms · 63.6 ms · 1.44 · 1 rejection | **6,654 km · 91.7 ms · 63.7 ms · 1.44 · 1 rejection** | `npx vitest run packages/core/src/pipeline.test.ts` |
| The same trace, offline, from the router names alone | most hops located | **8 hops located out of 10, 1 gap** | `voyage read docs/examples/lyon-ashburn.txt --from Lyon --offline` |
| The twenty properties | all green, seeds recorded | **VOY-P-01 … VOY-P-20 green** | `npx vitest run packages apps` |
| Enrichment with a warm cache | < 3 s | `TODO(measure)` — needs a live consent and the RIPE services; the offline equality is proven instead by VOY-P-19 | `npx vitest run packages/enrich` |
| Public hops located at `solid` or `probable` level on the gallery | ≥ 70 % | **76.7 %** (33 of 43; `with-gaps` deliberately drags it down at 42.9 %) | `node scripts/calibrate.mjs` |
| The same ratio on thirty real traces | ≥ 70 % | `TODO(measure)` — needs traces run by a human: the build agent is forbidden to probe (§14.3) | `node scripts/calibrate.mjs ~/traces/*.json` |
| The trace tool is detected and wrapped, never through a shell | `mtr --json`, else `traceroute`, else `tracert` | **`tool: mtr-json`** on a loopback trace; ranges refused with exit 2, missing tool with exit 3, unreadable input with exit 5 | `node apps/cli/bin/voyage.mjs trace 127.0.0.1 --out /tmp/j.json` and `npx vitest run apps/cli/src/probe.test.ts` |
| False locations rejected by the light | counted per journey | shown in every journey summary and on each hop card | gallery journeys |
