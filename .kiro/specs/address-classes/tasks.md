# Tasks — `address-classes`

Verify each step with `pnpm vitest run packages/core`; tick only when green.

- [ ] 1. `src/addr/ranges.ts` — the §7.3 CIDR tables as named constants, one
  array per class, with the RFC id in a comment per range (VOY-F-07).
- [ ] 2. `src/addr/parse.ts` — `parseAddress`: IPv4 dotted-quad strict (no
  leading zeros), IPv6 full parser (shorthand, mixed-case, `::ffff:` mapped,
  zone-id strip), returns `{ family, normalized } | null`. Test:
  `parse.test.ts` — shorthands, mapped, malformed, zone id (VOY-F-07,
  VOY-P-03 groundwork).
- [ ] 3. `src/addr/prefix.ts` — `inPrefix(ip, cidr)` both families; family
  mismatch and malformed input → `false`. Test: `prefix.test.ts` with /0,
  /32, /128, boundaries `100.63.255.255` vs `100.64.0.0` (VOY-F-07, VOY-F-10
  dependency).
- [ ] 4. `src/addr/classify.ts` — `classifyAddress` (fixed table order, fail
  closed to `reserved`), `isPublicAddress`, `isDocumentationAddress`. Test:
  `classify.test.ts`, one boundary pair per range of §7.3 (VOY-F-07).
- [ ] 5. Property **VOY-P-03**: `addr.property.test.ts` —
  `it('VOY-P-03 every generated address in a §7.3 range gets that class,
  shorthand included')`; generators emit full/compressed/uppercase forms and
  IPv4-mapped IPv6; fixed seed recorded in the header comment (VOY-P-03,
  VOY-P-04 dependency).
- [ ] 6. Idempotence test: `parseAddress(a.normalized)` deep-equals `a`
  (VOY-P-03).
- [ ] 7. Wire into parse: `packages/core/src/parse` imports
  `classifyAddress` for `Hop.class` — no duplicated range logic (grep:
  `rg '192\.168' packages/core/src` hits only `addr/` and tests)
  (VOY-F-07).
- [ ] 8. `pnpm typecheck && pnpm lint` green;
  `node scripts/guards/limits.guard.mjs` green.
