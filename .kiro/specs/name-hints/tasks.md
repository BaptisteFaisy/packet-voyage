# Tasks — `name-hints`

Verify each step with `pnpm vitest run packages/core`; tick only when green.

- [ ] 1. `src/hints/exclude.ts` — `EXCLUDED_TOKENS` (role words `core`,
  `edge`, `border`, `peer`; interface/tech words `gig`, `eth`, `net`, `cdn`,
  `agg`, `rtr`, `nat`, plus the §7.5 list), exported `readonly` (VOY-F-15).
- [ ] 2. `src/hints/split.ts` — `splitRouterName`: lowercase, split on
  `. - _`, strip trailing digits, drop empty fragments. Test: `split.test.ts`
  on the design §3 table rows (VOY-F-15).
- [ ] 3. `src/hints/match.ts` — `findHints`: build code/city maps, exclusion
  filter, exact lookups, dedupe by `(code, city, country)`, sort by
  `(code, city, country)`. Test: `match.test.ts` — par1/par-1/PAR1, excluded
  `core1.par`, ambiguous code returns both, duplicates collapse (VOY-F-15).
- [ ] 4. Determinism test: shuffled table input ⇒ identical sorted output
  (VOY-F-15, supports VOY-P-08 downstream).
- [ ] 5. Robustness property: `fc.assert` over arbitrary strings — returns
  array, never throws (VOY-N-10). Fixed seed in header comment.
- [ ] 6. Contract check: a `HintCity` → `Candidate` mapping helper in the
  pipeline/enrich caller uses `source: 'name-hint'`, weight from CONTRACTS §3
  (0.60) — assert in `locate` integration test of the `locator` spec; no
  candidate construction inside `src/hints` (grep: `rg "source:" src/hints`
  empty) (VOY-F-15).
- [ ] 7. `pnpm typecheck && pnpm lint` green; limits guard green.
- [ ] 8. Journal: run and record the **spec vs vibe coding** comparison for
  this feature (both durations, round trips, defects) — `TODO(measure)` in
  `KIRO_JOURNAL.md` until measured (§14.1, §14.6).
