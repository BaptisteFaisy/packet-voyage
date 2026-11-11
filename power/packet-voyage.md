---
name: packet-voyage
version: 0.1.0
description: Follow the physical route of a traceroute, bounded by the speed of light, with explicit certainty levels and probing ethics guardrails.
mcpServers:
  packet-voyage:
    command: npx
    args:
      - packet-voyage
      - mcp
---

# Packet Voyage — Kiro Power

Packet Voyage maps network traceroutes onto geography using speed-of-light constraints, subsea cable compatibility, and honest certainty labels (`measured`, `inferred`, `assumed`).

## MCP Server Configuration

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

Transport: pure JSON-RPC 2.0 over stdio (newline-delimited JSON).

## Tools

| Tool | Inputs | Purpose |
|---|---|---|
| `trace_host` | `host`, `approved`, `family?` (`4\|6`), `protocol?` (`icmp\|udp\|tcp`), `from?` | Run a single-host probe under VOY-N-02 ethics guardrails; returns summary, optional file path, and Journey |
| `read_trace` | `text`, `from?` | Parse a traceroute/tracert/mtr/RIPE Atlas text offline using router-name hints only (zero network) |
| `explain_journey` | `journey` or `journey_path` | Return structured stops, segments, detours, and light rejections, each with its certainty level and honest §5.4 wording |
| `compare_journeys` | `a`, `b` | Return side-by-side summary differences (`distance_km_min`, `rtt_ms`, `inflation`, `countries`, `networks`, `detours`, `rejected_by_light`) |

## Probing Ethics & Guardrails (VOY-N-02)

`trace_host` enforces these non-negotiable rules on every call:

1. **Explicit user approval**: `approved: true` is required for every call; otherwise the server returns a structured refusal (`approval_required`).
2. **Single host only**: exactly one valid hostname or IP address per call. Ranges (`192.0.2.0/24`, `192.0.2.1-10`), lists (`a,b`), wildcards, and leading dashes (`-n`) are refused (`invalid_host`).
3. **One trace at a time**: concurrent calls are refused (`trace_in_progress`).
4. **Cooldown (5 s)**: at least 5 seconds must elapse between two traces (`cooldown_active`, with `retryAfterSeconds`).
5. **Session cap (20)**: at most 20 traces may start in a single MCP session (`session_cap_reached`).

## Honesty Contract (§5.3 & §5.4)

Every fact returned by `explain_journey` and `compare_journeys` carries a certainty level:

- **measured**: hop addresses, RTT delays, packet loss, hop order, light rejection thresholds (`allowed_km` vs `needed_km`).
- **inferred**: ASN, city/country candidates, IXP membership, segment nature (`local` / `sea` / `undetermined`), detours.
- **assumed**: drawn path between located hops, compatible subsea cables, minimum geodesic distance ("at least N km"), vacuum inflation factor.

Never say "the packet travelled through cable X" or "countries your data crossed". Say "compatible cables for this crossing", "at least N km", and "countries where a hop was located".

---

## Skill: `investigate-latency`

Use this skill when a user asks why a host is slow or asks to inspect a path between two endpoints.

### Workflow

1. **Obtain explicit approval & trace**
   - Ask the user for confirmation before probing a live host.
   - Call `trace_host` with `{ host, approved: true, family?, protocol?, from? }`, or call `read_trace` if the user pasted an existing trace.
2. **Read the summary**
   - Call `explain_journey` on the resulting `journey`.
   - Note the measured destination RTT (`rtt_ms`), assumed minimum geodesic distance ("at least `distance_km_min` km"), vacuum light floor (`light_floor_ms`), assumed `inflation` factor, and gap count (`gaps`).
3. **Check detours & light rejections**
   - Inspect `detours` (`country-return` or `zigzag`) to see whether the inferred path doubled back geographically.
   - Inspect `light_rejections` to see where measured RTT ruled out a misleading geolocation hint (`allowed_km` < `needed_km`).
   - For sea crossings, list `compatible_cables` with their band (`high`/`medium`/`low`) and state that nothing in the measurement proves which cable carried the packet.
4. **Compare IPv4 vs IPv6 (when relevant)**
   - With user approval (and respecting the 5 s cooldown), trace the alternate address family (`family: 4` vs `family: 6`) or load a second recorded trace via `read_trace`.
   - Call `compare_journeys` with `{ a: ipv4Journey, b: ipv6Journey }` to compare minimum geodesic distance, measured RTT, inflation, inferred countries, distinct networks, detours, and light rejections.
5. **Conclude with explicit certainty levels**
   - Separate what was **measured** (RTT, hop replies, light-bound exclusions), what was **inferred** (cities, countries, ASNs, detours), and what is **assumed** (path geometry, minimum "at least N km" distance, compatible cables, inflation).
   - If hops are unlocated or silent, state the gaps explicitly rather than guessing.
