# Requirements — `cli`

Spec method (§14.1): **quick-spec**. Covers **VOY-F-41, VOY-F-42, VOY-F-43**;
carries **VOY-N-02** (one host, human-requested), **VOY-N-03** (no shell,
validated args) and **VOY-N-12** (Linux/macOS/Windows, Node LTS). Owner:
`apps/cli` (lot L8). Contract: `docs/CONTRACTS.md` §5.8. Steering:
`probing-ethics.md`, `privacy.md`.

## Introduction

`voyage` is the user's door: it wraps the system trace tool (never probing
on its own initiative), enriches with consent, computes, writes
`journey.json`, and offers the local UI. Everything else (`read`, `enrich`,
`share`, `data`, `consent`, `mcp`) works offline-first. The published npm
package is `packet-voyage`, the command `voyage`; esbuild bundles
`apps/cli/dist/voyage.mjs`, `bin/voyage.mjs` is a 3-line shim.

---

## Requirements

### Requirement 1 — VOY-F-41 (I): `voyage trace <host>`

**User Story:** As Karim, I run one command and get a journey file plus an
offer to open the local UI (P4).

#### Acceptance Criteria

1. WHEN `voyage trace <host>` runs, THE SYSTEM SHALL pick the first available
   tool: `mtr --json -n -c <cycles> <host>` if mtr exists and emits JSON,
   else `traceroute -n -q 3 <host>`, else (Windows) `tracert -d <host>`;
   spawn with an **argument array, never through a shell** (VOY-N-03).
2. THE SYSTEM SHALL never use `sudo` nor modify system capabilities; IF the
   requested mode needs missing privileges, THEN THE SYSTEM SHALL say so and
   offer the default mode (§11.6).
3. THE SYSTEM SHALL then enrich (consent/offline rules of the `enrichment`
   spec), compute via `computeJourney`, write `journey.json` (schema-valid,
   VOY-P-18) and, with `--open`, start/point at the local UI.
4. THE SYSTEM SHALL support `--ipv6`, `--proto {icmp|udp|tcp}`, `--cycles`,
   `--from <city>`, `--offline`, `--open`, `--out`, and `--json` (prints the
   journey to stdout instead of writing).
5. THE SYSTEM SHALL trace exactly **one host per command**, at the human's
   request (VOY-N-02) — no queue, no list, no loop.

### Requirement 2 — VOY-F-42 (I): safe argument

#### Acceptance Criteria

1. THE SYSTEM SHALL reject any target that is not a single hostname or IP
   address: CIDR ranges (`/`), lists (`,`, whitespace, `;`), anything
   starting with `-`, shell metacharacters — with exit code `2`.
2. THE SYSTEM SHALL pass the validated target to the trace tool as a separate
   argv element (no interpolation into a command string).
3. Verified by: `it('VOY-F-42 rejects ranges, lists and dash arguments')`
   with each rejected shape asserted (§18: exit codes recorded).

### Requirement 3 — VOY-F-43 (I): the other commands

#### Acceptance Criteria

1. THE SYSTEM SHALL provide `voyage read <file|->` (parse a recorded trace or
   stdin → journey), `voyage enrich <journey.json>` (complete an offline
   journey, consent rules apply), `voyage share <journey.json> [--level
   country|city]` (redaction preview → confirm → link or file, per the
   `share-and-redact` spec), `voyage data status|update` (cache/DB state and
   refresh with consent), `voyage consent` (show/grant/revoke), `voyage mcp`
   (start the MCP server — sometimes `mcp-power` spec).
2. EVERY command SHALL accept `--json` and print a schema-valid `Journey` or
   the documented sub-shape (VOY-P-18).
3. THE SYSTEM SHALL use the documented exit codes: `0` ok, `2` bad argument,
   `3` no trace tool found, `4` refused by consent/offline, `5` unreadable
   input (CONTRACTS §5.8) — each covered by a test.

### Requirement 4 — VOY-N-12 (I): portability

#### Acceptance Criteria

1. THE SYSTEM SHALL run on Linux, macOS and Windows under Node LTS with no
   native build step; tool detection per platform; path handling via
   `node:path`.
