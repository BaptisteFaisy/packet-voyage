---
name: latency-investigation
description: Investigate why a host is slow from here with Packet Voyage — trace one host (with approval), read the summary, look for a detour, compare IPv4 and IPv6, and conclude quoting certainty levels. Use when a user asks "why is X slow", when a route looks inflated, or when the mcp-power tools are available in the session.
---

# Latency investigation

The skill declared by `power/packet-voyage.md` (VOY-F-46, P10). It turns "why
is api.example.com slow from here?" into a structured answer where every
claim carries its certainty level. Tools: the Packet Voyage MCP server
(`trace_host`, `read_trace`, `explain_journey`, `compare_journeys`) or the
CLI (`voyage`).

## 0. Ground rules — before anything

- **One host at a time, always at the user's explicit request** — never a
  range, never a list, never a sweep (`probing-ethics.md`, VOY-N-02). The
  server enforces it: one trace at a time, ≥ 5 s between traces, ≤ 20 per
  session, approval flag on every `trace_host`.
- If the user already has a trace text or a `journey.json`, prefer
  `read_trace` / `explain_journey` — **zero probing needed**.
- Enrichment sends public hop addresses to rDNS/IPmap/RIPEstat only after
  consent; without consent or with `--offline`, work with cache + name hints
  and say what is missing (table 6.4 in `privacy.md`).

## 1. Trace (or read)

```
trace_host { host: "api.example.com", approval: true }     # user approves
# or, no probing at all:
read_trace { text: "<pasted traceroute/tracert/mtr output>" }
```

Note the tool used and the family. If `trace_host` is refused (cooldown,
session limit, no approval), report the refusal — do not retry around it.

## 2. Read the summary

From the journey's `summary`, quote exactly, with levels:

| Figure | Certainty | How to phrase it |
|---|---|---|
| `rtt_ms` (envelope at destination) | measured | "91.7 ms measured" |
| `distance_km_min` | inferred | "**at least** 6,655 km" — never bare |
| `light_floor_ms` | inferred | "light alone would need 63.6 ms" |
| `inflation` | inferred | "inflation 1.44" |
| `countries` | inferred | "countries where a hop was located: FR, GB, US" |
| `rejected_by_light` | measured count | "1 location rejected by light" |
| `gaps` | measured count | "n silent or unlocated hops" |

An inflation near 1 means the route is close to physical optimum — say so,
and stop there. A high inflation (> 2) justifies steps 3–4.

## 3. Look for the detour

Call `explain_journey` and inspect `summary.detours` and per-hop rejections:

- **country-return** or **zigzag** entries: quote the ttls and the geography
  ("the route leaves Singapore, climbs to Tokyo (ttl 5), comes back through
  Hong Kong (ttl 7) — a detour, inferred").
- **Rejections by light**: they show *wrong* geolocation, not a network
  problem — explain them as such ("the database says Ashburn; 9.6 ms allows
  1,439 km at most; Ashburn needs 6,496 km — rejected, measured bounds").
- **Gaps and MPLS**: a long segment with silent hops is often a tunnel, not
  an anomaly (§5.2) — do not over-claim.

## 4. Compare IPv4 and IPv6 (when relevant)

```
trace_host { host: "api.example.com", family: 6, approval: true }  # 2nd trace, after cooldown
compare_journeys { pathA: "journey-v4.json", pathB: "journey-v6.json" }
```

Report route differences (different countries, detour present in one only),
summary differences (rtt, inflation), and which family avoids the problem —
as *inferred* findings: two traces minutes apart are two samples, not a law.

## 5. Conclude — quoting certainty levels

Structure the answer in three blocks, mirroring §5.3:

1. **Measured**: the rtt, the hop count, the gaps, the rejection counts.
2. **Inferred**: countries where hops were located, networks, the detour, the
   minimum distance ("at least …"), the inflation.
3. **Assumed**: any statement about the actual path or cables — always as
   "compatible cables for this crossing; nothing in the measurement says
   which one carried your packet".

Never write: "your packet travelled through", "took the cable", "is located
in", a bare travelled distance. If a claim cannot carry a level, drop the
claim (`honesty.md`; the `claims-guard` hook enforces the same vocabulary in
the product).

End with what would improve the answer and its cost: declaring the source
city (turns relative bounds into absolute ones, VOY-F-19), consent for
enrichment (better candidates), or an mtr run with more cycles (tighter
envelope).
