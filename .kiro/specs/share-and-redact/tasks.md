# Tasks — `share-and-redact`

Verify with `pnpm vitest run packages/core`; tick only when green.

- [ ] 1.1 `src/share/codec.ts` — canonical JSON (sorted keys), compress/
  decompress (browser + Node, no external dep), base64url. Record the codec
  choice in the file header. Test: `codec.test.ts` round-trip incl.
  non-ASCII (VOY-F-39).
- [ ] 1.2 `src/redact/redact.ts` — `redactJourney`: drop non-public +
  access-network hops, coarsen source per level (never a centroid),
  recompute segments/summary from the journey's own located positions, set
  `redaction` flag. Test: `redact.test.ts` — mixed-class fixture; both
  levels; idempotence (VOY-F-38).
- [ ] 1.3 `src/redact/preview.ts` — `redactionPreview`: what disappears, what
  the source becomes, resulting summary. Test: preview snapshot on the P7
  fixture (VOY-F-38).
- [ ] 1.4 `src/share/link.ts` — `encodeShareLink` (typed errors:
  `ShareTooLargeError`, `ShareUnredactedError`), `decodeShareLink` (all
  failures → `JourneyParseError`), `MAX_FRAGMENT_BYTES = 60_000`. Test:
  `link.test.ts` — unredacted refusal, corrupted fragments, oversized
  journey (VOY-F-39, VOY-N-03).
- [ ] 1.5 Property **VOY-P-16**: `redact.property.test.ts` — `it('VOY-P-16
  redaction removes every non-public and access element')` over generated
  journeys, both levels; fixed seed in header.
- [ ] 1.6 Property **VOY-P-17**: `share.property.test.ts` — `it('VOY-P-17
  decode(encode(redacted)) === redacted and fits the fragment budget')`;
  fixed seed in header.
- [ ] 1.7 Property **VOY-P-18**: schema round-trip on gallery ×6 + generated
  journeys; export ∘ import identity. Test: `schema.property.test.ts`
  (shared with the `cli` spec's `--json` assertion).
- [ ] 1.8 CLI/web hookup check: `voyage share` uses preview → confirm →
  encode (see `cli` spec tasks); web share button refuses unredacted
  journeys. Grep: no `encodeShareLink` call site without a preceding
  `redactJourney`.
- [ ] 1.9 `pnpm typecheck && pnpm lint` green; limits guard green; journal
  entry (codec choice + property seeds).
