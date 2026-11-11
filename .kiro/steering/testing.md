---
inclusion: always
---

# Packet Voyage — testing steering

## Commands

```
pnpm test                                  # whole workspace (vitest run)
pnpm vitest run packages/core              # one package
pnpm vitest run packages/core -- -t "VOY-P-06"   # one property
node scripts/guards/run-all.mjs            # all CI guards, no network needed
pnpm typecheck && pnpm lint                # must be green before claiming done
```

## Rules

1. **Colocated tests**: `src/<module>/<name>.test.ts`. A module without a test
   file is unfinished.
2. **Every requirement id appears in a test name.** Example:
   `it('VOY-F-16 rejects a candidate beyond the vacuum bound', …)`.
   Acceptance (CONTRACTS §7) greps for this.
3. **Every property id has a `fast-check` test** whose name starts with the id
   (`VOY-P-nn …`), a **fixed seed** recorded in a comment at the top of the
   test file, and an explicit `numRuns`. When a property fails: fix the code,
   keep the property; never weaken a property to make it pass. Keep the shrunk
   counter-example as a named regression test (see the `property-hunt` skill).
4. **No network, no clock, no randomness** in core tests: inject `tracedAt`,
   inject the datasets, use a fake `Fetcher` (CONTRACTS §5.6) for enrich tests.
5. **Fixtures use documentation ranges only** — RFC 5737 (`192.0.2.0/24`,
   `198.51.100.0/24`, `203.0.113.0/24`) and RFC 3849 (`2001:db8::/32`).
   `scripts/guards/fixture-privacy.guard.mjs` fails the build otherwise.
6. **Determinism is tested, not assumed**: byte-identical output for identical
   input, including after shuffling candidate order (VOY-P-08).

## The twenty properties (spec §13)

| Id | Statement (abridged) | Owner spec |
|---|---|---|
| VOY-P-01 | write → re-read round-trip per format preserves hops | trace-parsers |
| VOY-P-02 | parsing any text terminates, never throws | trace-parsers |
| VOY-P-03 | address classes correct incl. IPv6 shorthand | address-classes |
| VOY-P-04 | no non-public address ever leaves the machine | enrichment |
| VOY-P-05 | envelope is monotone and ≤ each hop's delay | locator |
| VOY-P-06 | retained position ≤ c × env / 2 + slackKm from source | locator |
| VOY-P-07 | triangle perimeter ≤ c × envⱼ (with tolerance) | locator |
| VOY-P-08 | path choice independent of candidate/source order | locator |
| VOY-P-09 | an impossible candidate only lands in `rejected` | locator |
| VOY-P-10 | a concordant source never lowers confidence | locator |
| VOY-P-11 | no invented position; unlocated hops spanned, never placed | locator |
| VOY-P-12 | distance metric: symmetric, triangle inequality, antimeridian-stable | crossings-and-cables |
| VOY-P-13 | listed cables in service, landings both sides, ≤ 5 shown, exact other count | crossings-and-cables |
| VOY-P-14 | rtt ≥ 2 d(S,D)/c ⇒ vacuum inflation ≥ 1 | metrics-and-story |
| VOY-P-15 | summary = sum of segments / located countries / rejection count | metrics-and-story |
| VOY-P-16 | redaction removes all non-public + access hops, coarsens source | share-and-redact |
| VOY-P-17 | share link decodes to exactly the redacted journey, size-bounded | share-and-redact |
| VOY-P-18 | every `--json` output validates against the schema; import ∘ export = id | share-and-redact |
| VOY-P-19 | warm cache offline = the online run that filled it | enrichment |
| VOY-P-20 | no story sentence contains forbidden vocabulary; distances say "at least" | metrics-and-story |

## Likely counter-example sources (§14.6 fact 2)

The antimeridian, an envelope made only of silent hops, IPv6 shorthand
addresses. Generators must produce these on purpose, not by luck. Record every
counter-example found in `KIRO_JOURNAL.md`.

## Non-regression

The six gallery journeys are locked: `gallery/<slug>/expected.json` holds the
summary numbers and a test asserts the recomputed journey matches (§18). The
worked example of spec §7.14 (at least 6,655 km, 91.7 ms, floor 63.6 ms,
inflation 1.44, one light rejection) is a named fixture.
