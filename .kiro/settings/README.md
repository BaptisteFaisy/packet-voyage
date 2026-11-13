# .kiro/settings — MCP declaration

`mcp.json` declares the project's own MCP server (CONTRACTS §5.11, spec
§11.7):

```json
{
  "mcpServers": {
    "packet-voyage": {
      "command": "npx",
      "args": ["packet-voyage", "mcp"]
    }
  }
}
```

**To confirm at write time** (spec §14.2 and annexe D, "Kiro: forme de
`mcp.json`"): the exact field names of this file must be checked against the
current Kiro documentation before relying on it — the shape above is the one
quoted by `docs/CONTRACTS.md` §5.11 and spec §11.7, which both note the form
is "to be confirmed". If the documentation names the keys differently (file
name, `mcpServers` vs another root key, `command`/`args` vs another shape),
update `mcp.json` accordingly and record the confirmed form in
`KIRO_JOURNAL.md`. Until then, `TODO(measure)` in the journal for the
confirmation step.

The server itself is built by the `mcp-power` spec (`apps/mcp`): four tools
(`trace_host`, `read_trace`, `explain_journey`, `compare_journeys`),
JSON-RPC 2.0 over stdio, with the VOY-N-02 limits (one trace at a time,
≥ 5 s between traces, ≤ 20 per session, explicit approval per `trace_host`).
`voyage mcp` and `npx packet-voyage mcp` are the same code path.
