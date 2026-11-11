# Tasks — `cli`

Verify with `pnpm vitest run apps/cli`; tick only when green. No test may
probe the network — fixtures and fake spawns only (`probing-ethics.md`).

- [ ] 1. `src/validate.ts` — `validateTarget`: hostname/IP only; reject
  ranges, lists, leading `-`, metacharacters; normalize. Test:
  `validate.test.ts` with every §18 shape and exit code 2 assertions
  (VOY-F-42).
- [ ] 2. `src/tools.ts` — `detectTraceTool()` (mtr-json → traceroute →
  tracert), `spawnArgv()` wrapper (never a shell), timeout + kill,
  privilege-error message without sudo. Test: fake-spawn argv assertions,
  fallback order, exit 3 when none (VOY-F-41, VOY-N-03).
- [ ] 3. `src/output.ts` — `--json` printing (schema-valid via `parseJourney`
  round-trip), human rendering, exit-code map 0/2/3/4/5. Test: each code
  produced by its scenario (VOY-F-43, VOY-P-18).
- [ ] 4. `src/commands/read.ts` — file/stdin → `parseTrace` → offline
  `computeJourney`. Test: `voyage read gallery/ocean-crossing/trace.txt
  --json` reproduces `expected.json` summary; unreadable input → exit 5
  (VOY-F-43).
- [ ] 5. `src/commands/trace.ts` — validate → detect → spawn → parse →
  consent gate → enrich → compute → write/`--out`/`--json` → `--open`;
  flags `--ipv6 --proto --cycles --from --offline`. Test: fake-spawn
  end-to-end, consent refusal → exit 4 (VOY-F-41).
- [ ] 6. `src/commands/enrich.ts`, `share.ts`, `data.ts`, `consent.ts`,
  `mcp.ts` — per design §4; share uses preview → confirm → redact → encode
  (refuses unredacted). Tests: one per command incl. exit codes (VOY-F-43).
- [ ] 7. `apps/cli/build.mjs` + `bin/voyage.mjs` (3-line shim). Verify:
  build then `node apps/cli/dist/voyage.mjs --help`; `wc -l bin/voyage.mjs`
  = 3; `limits.guard.mjs` green.
- [ ] 8. Portability pass: platform branches (`process.platform`) covered by
  tests for linux/darwin/win32 detection logic (VOY-N-12).
- [ ] 9. `pnpm typecheck && pnpm lint` green; record exit-code transcript in
  the journal (§18 acceptance); journal entry.
