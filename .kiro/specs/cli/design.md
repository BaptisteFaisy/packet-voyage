# Design — `cli`

Contract: `docs/CONTRACTS.md` §5.8 — command list, tool selection order,
exit codes (`0/2/3/4/5`), esbuild bundle (`apps/cli/build.mjs` →
`apps/cli/dist/voyage.mjs`, `bin/voyage.mjs` 3-line shim), npm package
`packet-voyage`, command `voyage`. Steering: `probing-ethics.md` (the CLI is
a probe *wrapper* used by a human — one host, no ranges), `privacy.md`
(consent + what leaves the machine).

## 1. Modules

```
apps/cli/src/
  main.ts        argv parse (hand-rolled, no dep), dispatch, exit codes
  validate.ts    validateTarget(host): hostname|ip or reject (VOY-F-42)
  tools.ts       detectTraceTool(): mtr-json → traceroute → tracert; spawnArgv()
  trace.ts       runTrace(host, opts): spawn, capture stdout, timeout
  commands/      read.ts enrich.ts share.ts data.ts consent.ts mcp.ts trace.ts
  output.ts      --json printing (schema-valid), human rendering, exit codes
apps/cli/build.mjs   esbuild bundle
apps/cli/bin/voyage.mjs   3-line shim
```

## 2. Target validation (VOY-F-42 — security boundary)

```
validateTarget(s):
  reject if: empty | startsWith('-') | contains any of / , ; | & $ ` ( ) < > space
             | parseAddress(s) === null AND !hostnameRe.test(s)
  hostnameRe: ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9](...))*\.?$
              length ≤ 253, labels ≤ 63
  accept otherwise → return normalized string
```

The validated string is passed as one argv element to `spawn(tool, args)` —
**never** `exec`, never a template into a shell string. Tests assert the
spawned argv array directly (fake spawn injected).

## 3. Tool detection and spawn

`detectTraceTool()` probes `--version`/existence in order: mtr (then checks
its output really is JSON — some builds lack Jansson), traceroute, tracert
(Windows). None found ⇒ exit `3` with the install hint. Privilege errors from
the tool (ICMP socket) ⇒ message + offer UDP/default mode, never `sudo`.
Spawn with `stdio: ['ignore','pipe','pipe']`, kill after a timeout
(`--cycles`-scaled), capture stderr for the log.

## 4. Command flows

- `trace`: validate → detect → spawn → `parseTrace` → consent gate (interactive
  unless `--offline`/`--json` non-tty) → `enrichHops` → `computeJourney` →
  write `journey.json` (or stdout with `--json`) → `--open` serves
  `apps/web` dist locally and opens the browser at the journey hash.
- `read <file|->`: file or stdin → `parseTrace` → offline `computeJourney`
  (hints only) → journey. Unreadable ⇒ exit `5`.
- `enrich <journey.json>`: consent gate → `enrichHops` on the stored hops →
  recompute → rewrite. Refused ⇒ exit `4`.
- `share <journey.json> [--level]`: `redactionPreview` printed → confirm →
  `redactJourney` → `encodeShareLink`; oversize ⇒ write the file instead
  (share-and-redact spec).
- `data status|update`: `cache.stats()` + `staleProvenance()` table; update
  downloads DB-IP/IXP prefixes with consent (never into the repo).
- `consent`: show / `--grant` / `--revoke` via `packages/enrich` consent API.
- `mcp`: hand off to `apps/mcp` stdio server (mcp-power spec).

## 5. Edge cases

| Case | Handling |
|---|---|
| `voyage trace 198.51.100.0/24` | exit 2, "one host at a time, no ranges" |
| `voyage trace --ipv6 evil` | `-` prefix rejected before flag parsing consumes it; flags only in known positions |
| mtr present but no JSON support | fall through to traceroute; log the reason |
| No trace tool at all | exit 3 + per-OS install hint |
| stdin is a TTY on `read` | usage text, exit 2 |
| Trace output empty/garbled | `parseTrace` unknown result → exit 5 with `unknownLines[0]` shown |
| Consent refused / `--offline` | exit 4 on `enrich`; `trace` proceeds offline with hints only, `missing` listed |
| Windows `tracert` localised | parser concern (trace-formats.md); CLI just captures bytes |
| Huge `--cycles` | clamped to a documented max with a warning |

## 6. Test strategy

- `validate.test.ts`: every rejected shape of §18 (ranges, lists, dash args,
  metacharacters) + accepted hostnames/IPv4/IPv6 (VOY-F-42).
- Fake-spawn tests: argv arrays asserted exactly; tool fallback order; exit
  codes 0/2/3/4/5 each covered (VOY-F-41/43).
- `--json` outputs piped through `parseJourney` (VOY-P-18, shared with
  share-and-redact task 1.7).
- End-to-end offline: `voyage read gallery/ocean-crossing/trace.txt --json`
  reproduces `expected.json` numbers — **no probing in tests, ever**
  (`probing-ethics.md`).
- Build smoke: `node apps/cli/build.mjs && node apps/cli/dist/voyage.mjs
  --help`; shim is 3 lines (`wc -l bin/voyage.mjs`).
