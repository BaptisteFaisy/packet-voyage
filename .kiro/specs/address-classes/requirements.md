# Requirements — `address-classes`

Spec method (§14.1): **quick-spec**. Covers **VOY-F-07**; verified by
properties **VOY-P-03** (classes) and **VOY-P-04** (nothing private leaves —
this spec provides the classification the enrichment spec depends on).
Owner: `packages/core/src/addr` (lot L1). Contract: `docs/CONTRACTS.md` §5.1.

## Introduction

Every privacy and location decision starts here: an address is classified
once, and the class decides whether the hop may be located, enriched, sent to
a third party, or must stay "at home". The classes are those of spec §7.3. A
misclassification is a privacy bug (VOY-P-04) or a false location, so the
mapping is exhaustive and property-tested, including IPv6 shorthand forms.

Scope — **in**: address parsing/normalisation (IPv4, IPv6), classification
per §7.3, prefix membership, documentation-range detection. **Out**: rDNS,
ASN lookup (enrichment), hints.

---

## Requirements

### Requirement 1 — VOY-F-07 (I): classify every address into §7.3

**User Story:** As the pipeline, I get one class per address so that
downstream stages never re-decide what may be sent or located.

#### Acceptance Criteria

1. WHEN `classifyAddress(ip)` is called, THE SYSTEM SHALL return exactly one
   of `private | cgnat | link-local | loopback | documentation | multicast |
   reserved | public`.
2. THE SYSTEM SHALL classify these ranges per §7.3:
   - `private`: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC 1918),
     `fc00::/7` (RFC 4193) — "at home": never located, never sent;
   - `cgnat`: `100.64.0.0/10` (RFC 6598) — access network: never located,
     never sent;
   - `link-local`: `169.254.0.0/16`, `fe80::/10`; `loopback`: `127.0.0.0/8`,
     `::1` — ignored for location;
   - `documentation`: `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`
     (RFC 5737), `2001:db8::/32` (RFC 3849) — accepted in examples/tests,
     marked as example;
   - `multicast`: `224.0.0.0/4`, `ff00::/8`; `reserved`: `240.0.0.0/4` and
     the remaining IANA-reserved space — flagged as unexpected;
   - `public`: everything else — the only class that is enriched and located.
3. THE SYSTEM SHALL handle IPv6 shorthand (`2001:db8::1`, `::ffff:192.0.2.1`
   mapped form) and zone ids (`fe80::1%eth0`) — verified by VOY-P-03.
4. THE SYSTEM SHALL return `null` from `parseAddress` for a malformed
   address, never throw; `classifyAddress` of a malformed address is
   `reserved` (fail closed: treated as non-public, non-locatable).

### Requirement 2 — VOY-F-07 (I): non-public never located, never sent

#### Acceptance Criteria

1. THE SYSTEM SHALL expose `isPublicAddress(ip)` as
   `classifyAddress(ip) === 'public'`; every gate in enrichment (VOY-P-04),
   redaction (VOY-P-16) and the CLI uses this single predicate.
2. THE SYSTEM SHALL provide `inPrefix(ip, cidr)` for both families so that
   IXP-prefix matching (VOY-F-10) and the probe allowlist share one
   implementation.
3. THE SYSTEM SHALL provide `isDocumentationAddress(ip)` so fixtures can
   assert they stay inside RFC 5737/3849 (`privacy.md`).

### Requirement 3 — VOY-P-03: classes hold under generation

#### Acceptance Criteria

1. For any address generated inside a §7.3 range — including IPv6 shorthand
   spellings of the same address — THE SYSTEM SHALL return the class of that
   range. Verified by the VOY-P-03 fast-check test (generators emit each
   range in full, compressed and mixed-case forms).

### Requirement 4 — VOY-P-04 (dependency): the gate is total

#### Acceptance Criteria

1. For any address that is not `public`, THE SYSTEM SHALL make
   `isPublicAddress` return false — the enrichment property test asserts no
   request contains a non-public address nor the user's address, relying on
   this totality (owner of the property: `enrichment` spec).
