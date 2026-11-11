# Requirements — `name-hints`

Spec method (§14.1): **requirements-first**. Covers **VOY-F-15**. No property
id of its own; its output feeds the locator's candidate list (source id
`name-hint`, weight 0.60, CONTRACTS §3) and is filtered there by the light
bound. This spec is the declared **candidate for the "spec vs vibe coding"
comparison** (§14.1): small, well-bounded, full of edge cases — the journal
records both durations (`TODO(measure)`).

Owner: `packages/core/src/hints` (lot L2). Contract: `docs/CONTRACTS.md` §5.2.

## Introduction

Router names carry place codes: `ae1.par1.example.net` says Paris,
`xe0.iad3.host.example.com` says Ashburn (IAD). The hint table (airports +
big cities, built by the `data-packages` spec from a licence-confirmed
source) is matched against name fragments. A hint is weak evidence —
conventions differ per operator, codes are ambiguous — so it only ever
becomes a *candidate*, and the light bound eliminates most false friends
(§7.5).

Scope — **in**: name splitting, fragment matching against `HintCity[]`, the
exclusion list. **Out**: building the hint table (data-packages), candidate
fusion and filtering (locator).

---

## Requirements

### Requirement 1 — VOY-F-15 (I): recognise table codes in hostnames

**User Story:** As a classroom user with no network access, I still get most
hops located because the names in my pasted trace are enough (P8).

#### Acceptance Criteria

1. WHEN `findHints(hostName, table)` is called, THE SYSTEM SHALL return every
   `HintCity` whose code or city name matches a fragment of the hostname.
2. THE SYSTEM SHALL split the hostname on dots and dashes
   (`splitRouterName`), and strip trailing digits from each fragment
   (`par1` → `par`) before matching.
3. THE SYSTEM SHALL match case-insensitively; a 3-letter fragment matches an
   airport code; a longer fragment matches a city name exactly (no substring
   matching inside fragments).
4. THE SYSTEM SHALL discard any fragment present in `EXCLUDED_TOKENS`
   (`core`, `edge`, `border`, `peer`, `gig`, `eth`, `net`, `cdn`, `agg`,
   `rtr`, `nat`, interface and role words) **before** table lookup.
5. THE SYSTEM SHALL return at most one `HintCity` per matching fragment, and
   duplicates of the same code (e.g. `par1` and `par2` in one name) collapse
   to one hint.
6. THE SYSTEM SHALL NOT invent a position for an unmatched name: no hint, no
   candidate — an unhinted hop stays a candidate-free hop for the locator
   (VOY-P-11 downstream).

### Requirement 2 — VOY-F-15 (I): ambiguity is surfaced, not resolved silently

#### Acceptance Criteria

1. IF a fragment matches several table entries (e.g. a code valid in two
   countries), THEN THE SYSTEM SHALL return all matches and let the locator's
   fusion/light filter decide — never pick one silently.
2. THE SYSTEM SHALL keep the match deterministic: results sorted by
   `(code, city, country)`.

### Requirement 3 — robustness (VOY-N-10 dependency)

#### Acceptance Criteria

1. For any input string (empty, huge, binary-ish, pure punctuation),
   `findHints` and `splitRouterName` SHALL return empty arrays, never throw.
2. THE SYSTEM SHALL ignore a hostname that is `null`/empty (timeout replies
   carry no name — `trace-parsers` spec).
