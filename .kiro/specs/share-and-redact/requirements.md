# Requirements — `share-and-redact`

Spec method (§14.1): **requirements-first**. Covers **VOY-F-37, VOY-F-38,
VOY-F-39** (VOY-F-40 image export is optional and rides on the same
redaction); verified by properties **VOY-P-16** (redaction), **VOY-P-17**
(share link) and **VOY-P-18** (schema round-trip). Owner:
`packages/core/src/redact` + `src/share`, with `packages/schema` (lot L1/L5).
Contract: `docs/CONTRACTS.md` §5.5. Steering: `privacy.md`, `honesty.md`.

## Introduction

Sharing is where the product is most dangerous: a journey contains the user's
box, ISP and city. Redaction is therefore mandatory *before* any share, the
user previews exactly what leaves, and the share link is a pure URL fragment
— no server, no storage, no third party. Import validates against the Zod
schema; a malformed file is a structured error, never a crash (VOY-N-03,
VOY-N-10).

---

## Requirements

### Requirement 1 — VOY-F-37 (I) + VOY-P-18: journey file

**User Story:** As a user, I export my journey to `journey.json` and can
re-import it later, on another machine, without loss.

#### Acceptance Criteria

1. THE SYSTEM SHALL export a `Journey` serialising exactly the CONTRACTS §2
   shape (snake_case fields, version 1, UTC `traced_at`).
2. WHEN importing, THE SYSTEM SHALL validate with `parseJourney(text)`; on
   failure THE SYSTEM SHALL throw a structured `JourneyParseError` carrying
   the Zod issues — never a raw parse crash (VOY-N-10).
3. FOR every journey, export ∘ import SHALL be identity (deep-equal), and
   every CLI `--json` output SHALL validate against the schema (VOY-P-18).

### Requirement 2 — VOY-F-38 (I) + VOY-P-16: redaction before sharing

#### Acceptance Criteria

1. BEFORE any share, THE SYSTEM SHALL apply `redactJourney(journey, level)`
   which removes: the user's address/source coordinates finer than `level`,
   every non-public hop (private, CGNAT, link-local, loopback) and every
   access-network hop, and coarsens `source` to the requested level
   (`country` default, `city` on request).
2. THE SYSTEM SHALL set `redaction: { level, applied: true }` on the result.
3. THE SYSTEM SHALL produce `redactionPreview(journey, level)`: the list of
   what will be shared, shown to the user **before** confirmation (P7).
4. FOR any journey and any level, the redacted result SHALL contain no
   non-public address, no access-network hop, no user address, and no source
   coordinate finer than the level (VOY-P-16).
5. Redaction SHALL keep the journey coherent: ttls renumbered or gaps
   recounted consistently, summary recomputed or marked stale — the shared
   journey must still validate against the schema (VOY-P-18).

### Requirement 3 — VOY-F-39 (I) + VOY-P-17: serverless share link

#### Acceptance Criteria

1. THE SYSTEM SHALL encode the **redacted** journey into a URL fragment via
   `encodeShareLink(journey, baseUrl)` (compression + base64url in `#`), and
   decode it back exactly via `decodeShareLink(url)` (VOY-P-17).
2. THE SYSTEM SHALL enforce `MAX_FRAGMENT_BYTES = 60_000`; IF the encoded
   journey exceeds it, THEN THE SYSTEM SHALL signal the caller to offer the
   file download instead (never truncate silently).
3. `encodeShareLink` SHALL refuse (throw a typed error) a journey whose
   `redaction.applied` is not `true` — defence in depth: the only way to get
   a link is through redaction.
4. Decoding an altered/corrupted fragment SHALL produce a structured
   `JourneyParseError`, never arbitrary code execution or HTML injection
   (VOY-N-03).

### Requirement 4 — VOY-F-40 (S) support: image export

#### Acceptance Criteria

1. WHEN the map is exported as an image, THE SYSTEM SHALL include the data
   credits and SHALL render only redacted data (the export consumes the same
   redacted journey).
