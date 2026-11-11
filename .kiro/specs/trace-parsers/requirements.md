# Requirements — `trace-parsers`

Spec method (§14.1): **requirements-first**. Requirements analysis ran on this
file before design. Covers **VOY-F-01 … VOY-F-06**, **VOY-N-10**; verified by
properties **VOY-P-01** (round-trip) and **VOY-P-02** (robustness).
Owner: `packages/core/src/parse` (lot L1). Contract: `docs/CONTRACTS.md` §5.1.
Steering: `trace-formats.md` (auto-included on this path).

## Introduction

A journey starts as text pasted by a human or captured by the CLI. The parser
turns that text into `ParsedTrace` — hops with replies, flags and MPLS labels,
**no location yet** — and loses nothing: every ununderstood line is kept
verbatim. This is also the spec used to measure the real cost of a full
requirements-first spec in credits (§14.6: `TODO(measure)` on `trace-parsers`).

Scope — **in**: format detection, readers for `traceroute`, `tracert` (all
languages), `mtr` text, `mtr` JSON, RIPE Atlas JSON; writers for round-trip;
IPv4 and IPv6. **Out**: address classes (`address-classes` spec), hints,
enrichment, anything downstream.

---

## Requirements

### Requirement 1 — VOY-F-01 (I): supported inputs

**User Story:** As a user, I paste a trace or drop a file, and I get the hop
list back, whatever the supported tool that produced it.

#### Acceptance Criteria

1. WHEN the input is `traceroute`, `tracert`, `mtr --report(-wide)` text or
   `mtr --json` output, THE SYSTEM SHALL produce the list of hops with ttl,
   replies (address, optional name, list of delays), loss and annotations.
2. THE SYSTEM SHALL accept the input as pasted text or as file content
   (reading the file is the caller's job; the parser takes a string).
3. Verified by: unit tests per format + VOY-P-01, VOY-P-02.

### Requirement 2 — VOY-F-02 (I): format detection without user input

**User Story:** As a user, I never have to say which tool produced my trace.

#### Acceptance Criteria

1. THE SYSTEM SHALL detect the format from the text structure alone
   (`detectFormat`), tolerating BOM, CRLF and leading blank lines.
2. IF no format is recognised, THEN THE SYSTEM SHALL return
   `{ format: 'unknown', hops: [], unknownLines: [firstLine] }` and the UI
   SHALL display the first ununderstood line and the accepted formats.
3. THE SYSTEM SHALL NOT throw on any input (VOY-N-10). Verified by VOY-P-02.

### Requirement 3 — VOY-F-03 (I): fidelity

**User Story:** As a network engineer, I need every detail of my trace
preserved, because the details are the diagnosis.

#### Acceptance Criteria

1. THE SYSTEM SHALL keep silent hops (`*`, `???`) as
   `replies: [{ ip: '', rtt_ms: [], flags: ['timeout'] }]`.
2. THE SYSTEM SHALL keep multiple replies per hop (load balancing) and every
   delay value of each reply.
3. THE SYSTEM SHALL keep annotations `!H`, `!N`, `!X` in `flags`.
4. WHEN a delay is `<1 ms`, THE SYSTEM SHALL record `rtt_ms: [0.5]` **and**
   `flags: ['lt1ms']`.
5. WHEN MPLS label lines follow a hop, THE SYSTEM SHALL attach them to the
   previous hop as `mpls: [...]` with flag `'mpls'`.
6. THE SYSTEM SHALL keep every ununderstood line verbatim in `unknownLines`
   and add a warning.

### Requirement 4 — VOY-F-04 (I): both address families

#### Acceptance Criteria

1. THE SYSTEM SHALL parse IPv4 and IPv6 traces, including IPv6 shorthand
   (`2001:db8::1`) and bracketed forms; `family` on `ParsedTrace` is 4 or 6.
2. IF a trace mixes families, THEN THE SYSTEM SHALL report the majority
   family and a warning (never throw).

### Requirement 5 — VOY-F-05 (S): RIPE Atlas results

#### Acceptance Criteria

1. WHEN the input is the JSON result of an Atlas traceroute measurement,
   THE SYSTEM SHALL parse it via `parseAtlasResult(json)` into the same
   `ParsedTrace`, with `tool: 'atlas'`.
2. THE SYSTEM SHALL take the probe's declared position as the journey source
   (`Source.declared = true`) when present.
3. IF a hop result carries `x` or no delay, THEN THE SYSTEM SHALL mark it
   silent (same shape as `*`).

### Requirement 6 — VOY-F-06 (I): hostnames are kept

#### Acceptance Criteria

1. THE SYSTEM SHALL keep every hostname present in the trace on its reply
   (`name`), for both `name (addr)` and `name [addr]` shapes — they feed the
   `name-hints` spec downstream.
2. WHEN `-n` / numeric output gives no name, THE SYSTEM SHALL leave
   `name: null` (enrichment may fill it later — not here).

### Requirement 7 — VOY-P-01: writers round-trip

#### Acceptance Criteria

1. WHEN a `ParsedTrace` is written with `writeTrace(trace, format)` and
   re-parsed, THE SYSTEM SHALL return the same hops, addresses and delays.
2. Verified by the VOY-P-01 fast-check test over generated journeys.
