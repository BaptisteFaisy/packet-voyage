# Contributing

The interface contract comes first: **`docs/CONTRACTS.md`**. If your change and
the contract disagree, the contract wins — and if the contract is wrong, change
it in the same pull request and say why.

## Setup

```bash
pnpm install          # pnpm 9, Node >= 22.6
pnpm typecheck        # tsc --noEmit over the whole workspace
pnpm lint             # eslint, zero warning allowed
pnpm test             # vitest: unit tests and the twenty properties
pnpm build            # CLI bundle + static site
node scripts/guards/run-all.mjs
```

CI runs exactly that, on self-hosted runners, and must answer in **five minutes
or less** — a hard project rule guarded by `.github/workflows/ci-budget.yml`.
Never lengthen a timeout to make a slow check pass; make the check fast.

## Layout

| Path | What lives there |
|---|---|
| `packages/core` | pure computation: no network, no clock, no randomness — every input is an argument |
| `packages/schema` | the Zod model of `journey.json`, of the provenance sheets and of the datasets |
| `packages/enrich` | Node-only adapters (rDNS, RIPEstat, IPmap, PeeringDB), cache, consent |
| `packages/data` | vendored datasets + their provenance sheets, with its own licence notice |
| `apps/web` | the static site (Vite + React + d3-geo canvas) |
| `apps/cli` | the `voyage` command |
| `apps/mcp` | the optional MCP server |
| `gallery` | the six sample journeys, computed and locked |
| `scripts/guards`, `scripts/hooks` | the rules, enforced twice: in CI and inside Kiro |
| `.kiro` | steering, specs, hooks, agents, skills |

## Rules that are checked, not suggested

- **Size**: a file stays under 500 lines, a function under 50 (blank lines and
  comments excluded). ESLint and `limits.guard.mjs` both refuse otherwise: split
  instead of growing.
- **Honesty**: no value without its certainty level; never "the packet travelled
  through cable X", always "compatible cables"; every travelled distance is
  preceded by "at least". `vocabulary.guard.mjs` scans the labels and the journey
  log; a test renders every component and checks the result.
- **No duplication**: one implementation per logic. If you need a helper that
  exists elsewhere, import it — the contract lists what each module exports.
- **No network in `packages/core` and `apps/web`**: `no-network.guard.mjs`
  refuses `fetch`, `node:http`, `node:net`, `node:dns`, `XMLHttpRequest` and
  `WebSocket` outside the allowed packages.
- **No personal data in the repository**: tests use the documentation ranges
  (RFC 5737 / RFC 3849); the gallery is redacted; `fixture-privacy.guard.mjs`
  checks both.
- **Determinism**: same inputs, same settings ⇒ byte-identical output. Inject the
  clock (`tracedAt`), sort before choosing, never rely on key order.

## Adding a dataset

1. Write the extraction under `scripts/data/` (stdlib only, runnable offline
   against `scripts/data/cache/`, idempotent, printing what it writes).
2. Emit `packages/data/datasets/<id>.json`, validated by a schema in
   `packages/schema`.
3. Write `packages/data/provenance/<id>.json`: origin, URL, licence, retrieval
   date, the query and transform that produced it, the attribution, the feature
   count and the real sha256 (`scripts/data/provenance.mjs` recomputes both).
4. Add its notice to `packages/data/LICENCE-DATA.md` and a row to
   `docs/SOURCES.md`.

A dataset without a provenance sheet fails CI. Nothing from TeleGeography or
PeeringDB may be committed: their terms forbid redistribution, so those sources
are queried live from the user's machine and cached locally.

## Regenerating the gallery

```bash
WRITE_GALLERY=1 npx vitest run gallery   # rewrite the six journeys
npx vitest run gallery                   # check the locked numbers still hold
```

The journeys are computed from `gallery/scenarios.ts`, never hand-written: the
delays are derived from the real geometry, so a sample cannot contradict the
physics the product is built on.

## Pull requests

- Mergify is the only merge pilot: open a pull request, the queue rebases and
  merges when `ci`, `ci-budget` and `couche0` are green. Do not push to `main`.
- `couche0` reads the `## Scope` section of the pull request body: one bullet per
  file or folder you touch, each with a reason. A file you changed but did not
  declare fails the check, and so does a declaration that matches nothing.
- Touching a guard file (`.github/couche0/`, `.github/ci-budget/`,
  `.github/workflows/ci.yml`, `.github/workflows/pr-auto-merge.yml`) requires the
  token `SAMVISION_ALLOW_GUARD_BUMP` in the body, with the reason.
- A conflict is resolved by the conflict agent, not by a force push.

## Testing

Colocated `*.test.ts(x)`, run by `vitest`. Property tests use `fast-check`,
carry their property id in the test name (`VOY-P-06 …`), and record their seeds in
a comment so a counter-example can be replayed. When a property finds a bug, fix
the code and keep the seed: the counter-example is the valuable part.
