---
name: property-hunt
description: Run, read and reduce a fast-check property test of Packet Voyage (VOY-P-01..20), from stating the property to shrinking a counter-example, keeping the scar as a regression test and recording the seed in KIRO_JOURNAL.md. Use when a property fails, when a new invariant appears, or when a bug should become a generated test.
---

# Property hunt

Twenty properties carry the physics and the promises of this project
(`.kiro/steering/testing.md` has the full table). The light-speed ones
(VOY-P-05..11) even run on save via the `light-properties` hook. This skill
is how to work with them without breaking the contract: **never weaken a
property to make it pass.**

## 1. Run one property

```
pnpm vitest run packages/core -- -t "VOY-P-06"
node scripts/hooks/light-properties.mjs        # VOY-P-05..11 in one shot
```

Test names start with the id, so `-t` selects exactly one. Every property
test file records its fixed seeds in a header comment — a run without the
recorded seed is not the run CI does.

## 2. State the property before writing it

One sentence, universal and falsifiable: "for any generated journey, no
retained position is farther from the source than `c × env / 2 + slackKm`".
Check the owner (one package owns each id — see `testing.md`), and whether
the generators can actually reach the interesting space:

- **Antimeridian**: longitudes near ±180 on both sides.
- **Silent hops**: envelopes that are `null`, tails that are all-`null`.
- **IPv6 shorthand**: `2001:db8::1` spellings, mapped forms, zone ids.
- **Anycast**: far-apart candidates for one address.
- **No source position**: `relativeOnly` runs.

These are the declared likely counter-examples (§14.6 fact 2). A generator
that never produces them finds nothing.

## 3. Read the failure

fast-check prints the shrunk counter-example. Decide in one sentence **which
side is wrong**:

| Wrong side | Symptom | Action |
|---|---|---|
| implementation | the counter-example is a legitimate journey/address | fix the code, keep the property |
| generator | the value is not physically/structurally valid (e.g. rtt below the light floor of its own distance) | fix the generator, re-run |
| property statement | the claim was too strong (a tolerance was missing, a `null` case unthought) | correct the statement explicitly, note it in the journal — never silently |

## 4. Reduce it

Shrink by hand to the minimal reproducer:

1. Take the shrunk journey; delete hops from the end while it still fails.
2. Round delays to 1 decimal; keep the smallest candidate set that fails.
3. Name the shape: "hop 5, envelope null, candidate at +179.9° longitude".

## 5. Keep the scar

Add the minimal case as an explicit example test next to the property:

```ts
it('VOY-P-06 regression: antimeridian candidate at env=42ms (seed 20261115)', () => {
  const input = { /* the reduced journey, documentation addresses only */ };
  const result = locate(input);
  expect(result.hops.every((h) => h.location === null || withinBound(h))).toBe(true);
});
```

The property catches the next variant; the example documents the one that
happened. Fixtures use documentation ranges only (`privacy.md` — the
`fixture-privacy-guard` hook checks on save).

## 6. Record it

One journal line per counter-example found (this is submission fact 2,
§14.6): date, property id, the one-sentence shape, the seed, the fix commit's
files, and `TODO(measure)` for any duration you did not actually time. Seeds
go in the test file header comment **and** in the journal entry.
