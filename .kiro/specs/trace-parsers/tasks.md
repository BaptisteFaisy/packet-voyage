# Tasks — `trace-parsers`

Ordered; each task names the files it touches and the test that proves it.
Tick only when the named command is green (`pnpm vitest run packages/core`).

## 1. Shared ground

- [ ] 1.1 `src/parse/lines.ts` — normalise text (BOM, CRLF), `splitDelays`,
      `isTimeoutToken`, MPLS label regex. Test: `lines.test.ts` on the shapes
      of appendix B (VOY-F-03).
- [ ] 1.2 `src/parse/detect.ts` — `detectFormat` in the order of design §3.
      Test: `detect.test.ts`, one case per format + localised tracert header
      (VOY-F-02).

## 2. Readers

- [ ] 2.1 `src/parse/traceroute.ts` — address-first lines, multiple replies,
      `*`, `!H/!N/!X`, MPLS attach, `name (addr)` and bare `-n` shapes.
      Test: `traceroute.test.ts` with the appendix B Linux fixture; asserts
      10 hops, delays, hop-4 name (VOY-F-01, VOY-F-03, VOY-F-06).
- [ ] 2.2 `src/parse/tracert.ts` — delays-before-address, `[name [addr]]`,
      `<1 ms` → 0.5 + `lt1ms`, localised timeout by shape not words.
      Test: `tracert.test.ts` with English + French fixtures incl. the silent
      hop (VOY-F-01, VOY-F-03).
- [ ] 2.3 `src/parse/mtr-text.ts` — `--report` and `--report-wide` columns,
      `???` timeouts, loss column. Test: `mtr-text.test.ts` (VOY-F-01).
- [ ] 2.4 `src/parse/mtr-json.ts` — `report.hubs` mapping (Snt/Loss%/Best/
      Avg/Last/Wrst → rtt_ms list, loss). Test: `mtr-json.test.ts` on the
      appendix B abbreviated JSON (VOY-F-01).
- [ ] 2.5 `src/parse/atlas.ts` — `parseAtlasResult`, probe position → source,
      `x` → timeout. Test: `atlas.test.ts` (VOY-F-05).
- [ ] 2.6 IPv6 fixture through every text reader: shorthand address kept
      verbatim as `ip`, `family: 6`. Test: cases inside each reader's test
      file (VOY-F-04).

## 3. Dispatch and safety

- [ ] 3.1 `src/parse/index.ts` — `parseTrace(text, options?)`: normalise,
      detect (or honour `options.format`), dispatch, classify via
      `src/addr.classifyAddress`, wrap in try/catch → `unknown` result.
      Test: `parse.test.ts` — garbage in, structured unknown out; the first
      ununderstood line is in `unknownLines` (VOY-F-02, VOY-N-10).
- [ ] 3.2 Property **VOY-P-02**: `it('VOY-P-02 parsing any text never
      throws')`, fast-check over arbitrary/unicode/binary-ish strings, fixed
      seed in header comment. Test: `parse.property.test.ts`.
- [ ] 3.3 Property **VOY-P-01**: `it('VOY-P-01 write→read round-trips per
      format')` + `src/parse/write.ts` implementations. Test: same property
      file; generators include silent hops, multi-replies, `lt1ms`, IPv6.

## 4. Finish

- [ ] 4.1 §7.14 fixture: `gallery`-shaped Lyon→Ashburn trace parses to the
      documented 10 hops. Test: `fixture-714.test.ts`.
- [ ] 4.2 `pnpm typecheck && pnpm lint && pnpm vitest run packages/core`
      green; `node scripts/guards/limits.guard.mjs` green (files < 500 lines,
      functions < 50).
- [ ] 4.3 Journal: record credits and wall time of this spec
      (`TODO(measure)` until a real Kiro session fills it — §14.6) in
      `KIRO_JOURNAL.md`.
