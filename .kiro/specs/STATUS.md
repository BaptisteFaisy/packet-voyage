# Spec status — what the tree actually delivers

Generated from the tree, not from intent: a requirement counts as *proven* only
when its id appears in a test file that runs in CI. The task lists in each
`tasks.md` were written before the build; the delivered file layout differs in
places (for example `packages/core/src/parse/parse.ts` absorbed the planned
`lines.ts`), which is why this file, not the checkboxes, is the reference.

| Spec | Requirement ids | Proven by a test | Not proven |
|---|---|---|---|
| `address-classes` | 5 | 5 | — |
| `cli` | 7 | 7 | — |
| `crossings-and-cables` | 8 | 8 | — |
| `data-packages` | 4 | 4 | — |
| `enrichment` | 9 | 9 | — |
| `journey-ui` | 9 | 9 | — |
| `locator` | 14 | 14 | — |
| `mcp-power` | 3 | 3 | — |
| `metrics-and-story` | 8 | 7 | `VOY-F-36` (optional, not implemented (LLM reformulation)) |
| `name-hints` | 3 | 3 | — |
| `share-and-redact` | 9 | 9 | — |
| `trace-parsers` | 9 | 9 | — |

## Requirement ids with no test naming them

None.

## Known gaps, stated plainly

- **VOY-F-36** (LLM reformulation of the journey log): not implemented. The log
  is template-only, which the specification allows as the default.
- **VOY-F-47** (RIPE Atlas live measurements): not implemented. Reading an Atlas
  result from a file works (`parseAtlasResult`); fetching one by measurement id
  does not.
- **`voyage data update`** refreshes the exchange-point prefixes only; the
  DB-IP Lite download is not wired.
- **Calibration on thirty real traces** (open question 9) still needs a human:
  the build agent is forbidden to probe (`.kiro/hooks/probe-guard.json`).
- The **video**, the **Devpost text** and the **npm publication** are pending.
