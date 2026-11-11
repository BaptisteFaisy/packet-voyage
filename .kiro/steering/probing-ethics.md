---
inclusion: always
---

# Packet Voyage — probing ethics steering (VOY-N-02, §14.3)

**The agent building this project never probes the Internet.** It works on
recorded traces: fixtures in `gallery/**`, the appendix B examples, and traces
the user pastes. This project is a tool that reads measurements; the workshop
that builds it must not become a source of measurements.

## Rules for agents working in this repo

1. **Never run** `traceroute`, `tracert`, `mtr`, `ping`, `nmap` or `tracepath`
   against anything that is not in `.kiro/probe-allowlist.txt` (loopback and
   documentation ranges only). The `probe-guard` hook
   (`.kiro/hooks/probe-guard.json`, PreToolUse / shell) blocks the command and
   tells you why — every block is journaled; that count is a submission fact
   (§14.6 fact 1).
2. **No range, no list, ever.** One host at a time, at a human's request. This
   applies to the product too: `voyage trace` rejects ranges, lists, anything
   starting with `-`, anything that is not a single hostname or address
   (VOY-F-42), and spawns with an argument array — never through a shell.
3. **No privilege escalation**: never `sudo`, never setcap, never raw sockets.
   If the requested mode needs privileges the user lacks, say so and offer the
   default mode (§11.6).
4. **Rate limits are product requirements, not tuning.** The MCP server: one
   trace at a time, ≥ 5 s between two traces, ≤ 20 traces per session, and
   every `trace_host` call requires an explicit user approval flag (VOY-N-02).
5. **The hosted site emits no probe and no request after load** (VOY-N-01,
   VOY-N-02). Pasted traces are computed locally in the browser.
6. **Enrichment is not probing**: rDNS/RIPEstat/IPmap/PeeringDB calls happen
   only after consent (VOY-F-13), only for public addresses (VOY-P-04), and
   stop entirely under `--offline` (VOY-F-11). Table 6.4 in `privacy.md` is
   the exhaustive list of what may leave the machine.

## Testing without probing

- Parsers, locator, segments, cables, metrics, story: fixtures and generated
  journeys, pure functions, no network — there is never a reason to probe.
- To exercise the CLI end-to-end, feed it a recorded trace file
  (`voyage read gallery/ocean-crossing/trace.txt`), not a live host.
- Enrich adapters are tested against a fake `Fetcher` (CONTRACTS §5.6).
- If a test seems to need a live probe, the test is wrong: rewrite it against
  a fixture, or report the need — do not probe.

## If you are blocked by probe-guard

Read the message, do not work around it (no renaming the binary, no piping
through `sh -c`). The allowlist stays as it is; it is owned by another lot and
contains only `localhost`, `127.0.0.1`, `::1` and the RFC 5737 / RFC 3849
documentation ranges.
