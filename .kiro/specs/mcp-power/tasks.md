# Tasks — `mcp-power`

Verify with `pnpm vitest run apps/mcp`; tick only when green. No test may
probe the network (`probing-ethics.md`) — fake spawn and fixtures only.

- [ ] 1. `apps/mcp/src/protocol.ts` + `server.ts` — newline-delimited
  JSON-RPC 2.0 over stdio: `initialize`, `tools/list`, `tools/call`,
  structured errors; logs to stderr only. Test: `protocol.test.ts` over a
  memory stream (VOY-F-46).
- [ ] 2. `src/limits.ts` — one-at-a-time lock, 5 s cooldown, 20/session cap,
  injected clock. Test: `limits.test.ts` boundaries 4.999/5.000 s, 20/21,
  concurrent refusal (VOY-N-02).
- [ ] 3. `src/tools/trace-host.ts` — shared `validateTarget` from the CLI,
  `approval: true` requirement, limits gate, fake-spawn trace →
  `computeJourney` → `{ summary, journey_path, certainty_note }`. Test:
  `trace-host.test.ts` — refused without approval, bad targets, exit-3
  mirror (VOY-F-46, VOY-N-02, VOY-F-42 reuse).
- [ ] 4. `src/tools/read-trace.ts` — offline parse + compute. Test:
  `read-trace.test.ts` — gallery fixture in, journey out; garbage →
  structured error (VOY-F-46).
- [ ] 5. `src/tools/explain.ts` + `compare.ts` — structured facts with
  certainty levels; diff of two journeys. Test: `explain.test.ts`,
  `compare.test.ts` on `detour` vs `continental`; every emitted string
  passes `checkVocabulary` (VOY-F-46, VOY-N-04).
- [ ] 6. CLI hookup: `voyage mcp` imports `server.ts` (same code path).
  Verify: `node apps/cli/dist/voyage.mjs mcp` answers `initialize` on stdin
  (echo-piped fixture transcript in the test, no network).
- [ ] 7. `power/packet-voyage.md` — declare the power: purpose, four tools,
  limits (one at a time, 5 s, 20/session, approval), pointer to the
  `latency-investigation` skill; record the exact MCP annotation name used
  for approval once confirmed against the MCP spec version (annexe D:
  `TODO(measure)` → replace with the confirmed name).
- [ ] 8. `.kiro/settings/mcp.json` check: `python3 -m json.tool <
  .kiro/settings/mcp.json` parses; content matches CONTRACTS §5.11;
  `.kiro/settings/README.md` carries the "field names to confirm" note.
- [ ] 9. `.kiro/skills/latency-investigation/SKILL.md` exists and matches
  the power declaration (trace → summary → detour → IPv4/IPv6 compare →
  conclusion with levels). Cross-read both files; fix any drift.
- [ ] 10. `pnpm typecheck && pnpm lint` green; limits guard green; journal
  entry with the tools/list transcript attached as evidence.
