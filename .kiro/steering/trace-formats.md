---
inclusion: fileMatch
fileMatchPattern:
  - "packages/core/src/parse/**"
---

# Packet Voyage — trace formats steering (spec §7.2, VOY-F-01..06)

One reader per format, one detector, one common output (`ParsedTrace`,
CONTRACTS §5.1). Parsing is **structure-based, never word-based**: `tracert`
prints in the language of the system, so match line shapes, not English words.

## The formats (§7.2)

| Format | Origin | Traps to handle |
|---|---|---|
| `traceroute` (Linux/macOS/BSD) | text | three delays per line; several addresses on one line (load balancing — keep them all); `*`; annotations `!H !N !X`; "name (addr)" or bare addr (`-n`); MPLS label lines |
| `tracert` (Windows) | text, **localised** | delays *before* the address; `<1 ms`; localised "request timed out" messages; name in brackets `[addr]` |
| `mtr` text report | `--report`, `--report-wide` | statistics columns; `???` for a silent hop; wide hostnames shift columns |
| `mtr` JSON | `--json` (needs Jansson build) | per-hub stats: `Snt`, `Loss%`, `Last/Avg/Best/Wrst`; structure varies across mtr versions — confirm on the installed version |
| RIPE Atlas | measurement result JSON | several results per hop; `x`/missing delay when silent; the probe's **declared position is the source** (VOY-F-05) |

## Contracted behaviours (CONTRACTS §5.1)

- `parseTrace` **never throws** (VOY-N-10, VOY-P-02). Unrecognised input ⇒
  `{ format: 'unknown', hops: [], unknownLines: [firstLine] }`, and the UI
  shows the first ununderstood line + the accepted formats (VOY-F-02).
- **Nothing is dropped**: an ununderstood line is kept verbatim in
  `unknownLines` and warned about. Fidelity (VOY-F-03) covers: silent hops,
  multiple replies per hop, every delay, annotations, `<1 ms`, MPLS labels.
- `<1 ms` ⇒ `rtt_ms: [0.5]` **and** `flags: ['lt1ms']` — the flag matters:
  0.5 is a convention, not a measurement.
- `*` / `???` ⇒ hop with `replies: [{ ip: '', rtt_ms: [], flags: ['timeout'] }]`.
  Silent hops are counted gaps downstream, never placed (VOY-P-11).
- MPLS label lines attach to the **previous** hop (`mpls: [...]`): tunnels hide
  routers, two adjacent hops may be thousands of km apart — a long segment is
  not an anomaly (§5.2).
- Both families (VOY-F-04): IPv6 traces, including shorthand (`2001:db8::1`)
  and zone ids — classification is `src/addr`'s job, not the parser's.
- Hostnames are kept (VOY-F-06): they feed `src/hints` later.
- `writeTrace(trace, format)` round-trips: re-reading what was written gives
  the same hops, addresses and delays (VOY-P-01).

## Detection

`detectFormat(text)` decides from structure: JSON that parses with a `report`
key ⇒ mtr-json; JSON with Atlas result shape ⇒ atlas; header
`traceroute to` ⇒ traceroute; `Tracing route to` / `Détection du trajet` or
delays-before-address lines ⇒ tracert; `HOST:` + `Loss%` columns ⇒ mtr-text.
Detection must tolerate BOMs, CRLF and leading blank lines. Add every new
language variant of `tracert` as a fixture (at least two languages, §18).

## Test fixtures

Fixtures live next to the tests and use documentation ranges only
(`privacy.md`). Appendix B of the spec has ready examples: a Linux
`traceroute`, an English `tracert` with a silent hop, an `mtr --json`
(abbreviated). The Lyon→Ashburn numbers of §7.14 are the reference values.
