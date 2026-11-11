# Tasks — `enrichment`

Verify with `pnpm vitest run packages/enrich`; tick only when green.
Reminder: this package is the **only** place `fetch`/`dns`/`net` imports are
allowed (`no-network.guard.mjs`).

- [ ] 1. `src/fetcher.ts` + `src/cache.ts` — `Fetcher` default, `Cache`
  interface, `createFileCache(dir)` with TTL and negative entries. Test:
  `cache.test.ts` — set/get, TTL boundary, `stats()` (VOY-F-12).
- [ ] 2. `src/consent.ts` — read/write/prompt. Test: `consent.test.ts`;
  prompt snapshot names DNS + IPmap + RIPEstat + PeeringDB per table 6.4
  (VOY-F-13).
- [ ] 3. `src/rdns.ts`, `src/ripestat.ts`, `src/ipmap.ts`, `src/peeringdb.ts`,
  `src/localdb.ts` — adapters behind the Fetcher, each cache-first, errors →
  null. Tests: one `<name>.test.ts` per adapter with scripted responses
  (VOY-F-08, VOY-F-09, VOY-F-10).
- [ ] 4. `src/orchestrator.ts` — `enrichHops` with the gates in design §2:
  non-public skip, offline/no-consent zero-call wrapper, per-address logging,
  `missing`, `sentAddresses`, engine→source-id mapping with CONTRACTS §3
  weights. Test: `orchestrator.test.ts` — mixed hop classes; a private hop
  produces no call and no candidate (VOY-F-08…13, VOY-F-20 support).
- [ ] 5. Gate property **VOY-P-04**: `it('VOY-P-04 no request ever contains a
  non-public address')` over generated journeys incl. private/CGNAT/loopback/
  documentation hops and a declared user address; fixed seed recorded.
  Test: `orchestrator.property.test.ts`.
- [ ] 6. Property **VOY-P-19**: warm-cache offline run deep-equals the online
  run that filled it (throwing Fetcher offline). Test: same property file.
- [ ] 7. Determinism: candidates index-aligned with hops, sorted per
  CONTRACTS §3 order within a hop; shuffled adapter completion order gives
  identical output (supports VOY-P-08). Test: `orchestrator.test.ts`.
- [ ] 8. `no-network` guard scope check: `node scripts/guards/no-network.guard.mjs`
  green — fetch imports exist only in `packages/enrich` (and cli/mcp/scripts
  where allowed).
- [ ] 9. `pnpm typecheck && pnpm lint` green; limits guard green; journal
  entry with the number of adapters and property seeds.
