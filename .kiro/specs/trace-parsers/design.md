# Design — `trace-parsers`

Contract: `docs/CONTRACTS.md` §5.1 (`TraceFormat`, `ParsedTrace`,
`detectFormat`, `parseTrace`, `writeTrace`, `parseAtlasResult`). Steering:
`trace-formats.md`. Hop shape: `Hop`/`Reply` from CONTRACTS §2 — the parser
fills `ttl`, `replies`, `class` (via `src/addr`), `mpls`, flags; `asn`,
`envelope_ms`, `location` stay `undefined`/`null`.

## 1. Modules

```
packages/core/src/parse/
  detect.ts        detectFormat(text): TraceFormat
  traceroute.ts    reader: Linux/macOS/BSD text
  tracert.ts       reader: Windows text, localised, delays-before-address
  mtr-text.ts      reader: --report / --report-wide columns
  mtr-json.ts      reader: { report: { hubs: [...] } }
  atlas.ts         reader: parseAtlasResult(json) (VOY-F-05)
  write.ts         writeTrace(trace, format) — round-trip (VOY-P-01)
  lines.ts         shared line helpers: splitDelays, isTimeoutToken, mplsLabel
  index.ts         parseTrace(text, options?) — dispatch, never throws
```

Each reader exports `parse(lines: string[]): ReaderResult` and stays under
120 lines; `lines.ts` holds the shared regexes so no rule is duplicated.

## 2. Data flow

```
text → normalise (strip BOM, CRLF→LF, trim blanks)
     → detectFormat (structure probes, in fixed order)
     → reader → hops[] + unknownLines[] + warnings[]
     → classify each reply ip with src/addr.classifyAddress (class per hop)
     → ParsedTrace { format, family, protocol, tool, target?, hops, unknownLines, warnings }
```

`parseTrace` wraps the dispatch in a `try/catch` that converts any internal
error into the `unknown` result — the never-throws guarantee (VOY-P-02) is
structural, not per-reader.

## 3. Detection order and signals

| Order | Format | Signal |
|---|---|---|
| 1 | `mtr-json` | text parses as JSON with `report.hubs` |
| 2 | `atlas` | JSON array/object with Atlas result keys (`prb_id`, `result[].x`…) |
| 3 | `traceroute` | first non-blank line matches `^traceroute(6)? to ` or lines are `N  addr  d ms…` with address-first shape |
| 4 | `tracert` | `Tracing route to` in **any language** ⇒ fallback: lines with 3 delays **before** the address |
| 5 | `mtr-text` | header contains `HOST:` and `Loss%` columns |
| 6 | `unknown` | nothing matched |

Localised `tracert`: never match the timeout sentence ("Request timed out.",
"Délai d'attente de la demande dépassé.", …). Match the *shape*:
`^\s*\d+\s+([\d<]+ ?ms|\*){3}\s+(.*)$`. A trailing non-address token is a
localised message ⇒ timeout flags, not a name.

## 4. Edge cases

- **Silent hops**: `*`, `???`, localised timeout text ⇒ one reply
  `{ ip: '', rtt_ms: [], flags: ['timeout'] }` per probe column.
- **`<1 ms`**: value `0.5`, flag `lt1ms` — the 0.5 is a documented
  convention; comparisons downstream must treat `lt1ms` as "≤ 1 ms".
- **Multiple replies per hop** (per-packet load balancing): traceroute prints
  several `name (addr)` groups on one ttl line; keep all, in printed order.
- **MPLS tunnels**: `[MPLS: Lbl 304100 ...]` lines attach to the previous hop
  (`mpls: ['304100', …]`); a long silent gap after an MPLS label is normal
  (§5.2), never "fixed up".
- **Anycast**: invisible at parse time; the flag comes from enrichment. The
  parser only guarantees that several addresses at one ttl are all kept.
- **No source position**: parsers never invent one — Atlas probe position is
  the only source carried here (`target`/`source` otherwise `null`).
- **IPv6 shorthand**: parsing/normalisation is delegated to
  `src/addr.parseAddress` (one implementation, VOY-P-03 territory); the parser
  must not regex-validate addresses itself.
- **Annotated hops**: `!H`, `!N`, `!X` collected into `flags`.

## 5. Writers (VOY-P-01)

`writeTrace` emits canonical text per format: traceroute-style
(`ttl  name (ip)  d ms d ms d ms`), tracert-style, mtr-text table, mtr-json
object. Round-trip is asserted on hops/addresses/delays — not byte equality
with the original input (whitespace and localised messages are not data).

## 6. Test strategy

- Unit fixtures per reader in `src/parse/__fixtures__/`: appendix B examples
  (Linux traceroute, English tracert with silent hop, mtr --json), plus a
  French tracert, a `--report-wide` mtr, an Atlas result, an IPv6 trace,
  an MPLS trace. Documentation ranges only (`privacy.md`).
- `it('VOY-F-0n …')` name for every criterion above.
- Property **VOY-P-02**: `fc.assert` over arbitrary strings (including binary
  noise, huge lines, only-newlines): `parseTrace` returns, never throws, and
  returns either hops or the structured unknown result. Fixed seed in the
  file header comment.
- Property **VOY-P-01**: generators produce hop lists (silent hops, multi-
  replies, lt1ms, IPv6 included); `parse(write(t, f), f)` deep-equals `t` on
  hops/addresses/delays for each `f`.
- §7.14 numbers: the Lyon→Ashburn fixture parses to exactly 10 hops with the
  documented envelopes' inputs.
