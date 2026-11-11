# Packet Voyage Kiro Power

This directory packages the Packet Voyage MCP server and its `investigate-latency` skill for Kiro (`power/packet-voyage.md`).

## Contents

- `packet-voyage.md` — Power manifest declaring the `packet-voyage` MCP server (`npx packet-voyage mcp`), the four tools (`trace_host`, `read_trace`, `explain_journey`, `compare_journeys`), VOY-N-02 probing ethics guardrails, and the `investigate-latency` latency-investigation skill.

## Quick Verification

Start the MCP server over stdio via the CLI or package entry point:

```bash
npx packet-voyage mcp
```

Or run the MCP unit tests from the repository root:

```bash
npx vitest run apps/mcp --maxWorkers=2
```
