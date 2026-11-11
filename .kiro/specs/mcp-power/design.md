# Design — `mcp-power`

Contract: `docs/CONTRACTS.md` §5.13 — tools `trace_host`, `read_trace`,
`explain_journey`, `compare_journeys`; JSON-RPC 2.0 over stdio; no dependency
beyond the workspace; VOY-N-02 limits. Steering: `probing-ethics.md`.

## 1. Modules

```
apps/mcp/src/
  server.ts      stdio JSON-RPC loop: initialize, tools/list, tools/call
  tools/
    trace-host.ts      validateTarget (shared with CLI) → approval check →
                       rate-limit gate → runTrace → compute → { summary, path }
    read-trace.ts      text → parseTrace → computeJourney (offline) → journey
    explain.ts         journey → structured facts, each with certainty
    compare.ts         two journeys → diff (route, summary, countries)
  limits.ts      one-at-a-time lock, 5 s cooldown, 20/session, injected clock
  protocol.ts    JSON-RPC framing over stdin/stdout (newline-delimited),
                 error objects with codes
power/packet-voyage.md     power declaration (+ skill pointer)
```

`voyage mcp` (cli spec) imports `apps/mcp/src/server.ts` — one code path.

## 2. Protocol decisions

- Newline-delimited JSON-RPC 2.0 on stdio; logs go to **stderr only**
  (stdout is the protocol channel).
- `tools/list` advertises the four tools with input schemas and an
  `requiresApproval: true` annotation on `trace_host` (exact annotation name
  to confirm against the MCP spec version at write time — recorded in
  `power/packet-voyage.md`).
- Errors: structured `{ code, message }` — invalid target (mirrors exit 2),
  refused without approval, rate-limited (with the retry-after seconds),
  unreadable journey file.

## 3. Limits (VOY-N-02) — the ethics core

`limits.ts` holds a small state machine with an **injected clock**
(`now: () => number`, deterministic tests):

```
acquireTrace():
  if running          → refuse 'trace already running'
  if now - lastEnd < 5000 → refuse 'cooldown, retry in Ns'
  if count >= 20      → refuse 'session limit reached'
  running = true; count++
```

`trace_host` additionally requires `approval: true` in the arguments; the
power declaration tells the host agent this maps to a user confirmation.
No approval ⇒ structured refusal; the refusal is cheap, a probe is not.

## 4. Tool outputs and honesty

- `trace_host` → `{ summary: Summary, journey_path, certainty_note }`; the
  note repeats the honesty rule ("distances are lower bounds; cables are
  compatible, not identified").
- `explain_journey` → per segment: kind, `at_least_km`, `delta_ms`, cables
  with bands; per rejection: reason + allowed/needed km; per hop: level +
  sources. Every field name spells its certainty (§5.3).
- `compare_journeys` → side-by-side summaries + structural diff (hops in
  common by ASN sequence, country lists, detours present in one only) —
  powers the IPv4-vs-IPv6 detour story (P6, latency-investigation skill).

## 5. Edge cases

| Case | Handling |
|---|---|
| `trace_host` with a range/list/`-`-prefixed arg | shared `validateTarget` refuses (VOY-F-42) |
| Two `trace_host` in parallel | second refused (lock), no queue |
| 21st trace in a session | refused with the count stated |
| No trace tool on the machine | structured error mirroring CLI exit 3 |
| `read_trace` with garbage | `parseTrace` unknown result → structured error with `unknownLines[0]` |
| Journey file missing/corrupt | `JourneyParseError` mapped to a JSON-RPC error |
| Agent tries to use the server to sweep a network | limits + one-host validation make it useless for that; the refusal text says why (`probing-ethics.md`) |

## 6. Test strategy

- `protocol.test.ts`: initialize/tools/list/tools/call round-trips over a
  memory stream; malformed JSON-RPC → error object, never a crash.
- `limits.test.ts`: injected clock — cooldown boundary at 4.999/5.000 s,
  session cap at 20/21, concurrent refusal.
- `trace-host.test.ts`: fake spawn (no probing!); approval missing → refuse;
  bad targets refused with the CLI table.
- `explain/compare.test.ts`: gallery journeys — facts carry levels; compare
  of `detour` vs `continental` shows the zigzag only in one.
- Vocabulary: run `checkVocabulary` over every string the tools emit for the
  six gallery journeys (VOY-P-20 spirit; `claims-reviewer` re-reads the
  templates).
- Power file: lint the JSON of `.kiro/settings/mcp.json`
  (`python3 -m json.tool`) and check `power/packet-voyage.md` names the four
  tools and the limits.
