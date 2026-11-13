# Requirements — `mcp-power`

Spec method (§14.1): **quick-spec** (option). Covers **VOY-F-46**; carries
**VOY-N-02** (rate limits and approval). Owner: `apps/mcp` + `power/` (lot
L13). Contract: `docs/CONTRACTS.md` §5.13. Steering: `probing-ethics.md`,
`honesty.md`. Related workspace artefacts (owned by this lot's brief):
`.kiro/settings/mcp.json`, `.kiro/skills/latency-investigation/`.

## Introduction

The MCP server lets an agent (in Kiro: the user's assistant) ask Packet
Voyage to trace a host — with the user's explicit approval, one at a time —
or to explain a recorded journey. The power declaration
(`power/packet-voyage.md`) wraps the server plus the `latency-investigation`
skill so a Kiro agent answers "Why is api.example.com slow from here?" (P10)
quoting certainty levels, never inventing them.

---

## Requirements

### Requirement 1 — VOY-F-46 (O): four tools, JSON-RPC over stdio

**User Story:** As Karim in Kiro, I ask my agent about a slow host; it calls
`trace_host` (I approve), reads the structured journey back and answers with
the detour and the inflation quoted.

#### Acceptance Criteria

1. THE SYSTEM SHALL expose exactly four tools (CONTRACTS §5.13, §11.7):
   - `trace_host { host, family?, protocol? }` → summary + journey file path;
   - `read_trace { text }` → journey computed offline (no network);
   - `explain_journey { path }` → structured facts: segments, detours,
     rejections, each with its certainty level;
   - `compare_journeys { pathA, pathB }` → route and summary differences.
2. THE SYSTEM SHALL speak JSON-RPC 2.0 over stdio with no dependency beyond
   the workspace.
3. `explain_journey` and `compare_journeys` outputs SHALL carry certainty
   levels on every fact (`honesty.md`) and SHALL use the §5.4 vocabulary —
   "at least", "compatible cables", never "travelled through".

### Requirement 2 — VOY-N-02 (I): probing limits and approval

#### Acceptance Criteria

1. THE SYSTEM SHALL run **one trace at a time** (a second `trace_host` while
   one runs is refused).
2. THE SYSTEM SHALL enforce **at least 5 s between two traces** and **at
   most 20 traces per session**; over the limit ⇒ a structured error, not a
   queue.
3. EVERY `trace_host` call SHALL require an explicit approval flag honoured
   by the host agent (the tool is declared as requiring user approval); a
   call without it is refused.
4. `trace_host` SHALL reuse the CLI's target validation (VOY-F-42): one host,
   no ranges, no lists, no shell.
5. The session counter and cooldown SHALL be per-process, deterministic and
   covered by tests with an injected clock.

### Requirement 3 — power declaration and workspace wiring

#### Acceptance Criteria

1. `power/packet-voyage.md` SHALL declare the power: what it does, the four
   tools, the limits, and point at the `latency-investigation` skill
   (trace → read summary → look for a detour → compare IPv4/IPv6 → conclude
   quoting certainty levels).
2. `.kiro/settings/mcp.json` SHALL declare the server:
   `{ "mcpServers": { "packet-voyage": { "command": "npx", "args":
   ["packet-voyage", "mcp"] } } }` — exact field names to confirm against the
   Kiro documentation at write time (annexe D; see
   `.kiro/settings/README.md`).
3. THE SYSTEM SHALL be startable via `voyage mcp` and via
   `npx packet-voyage mcp` (same code path).
