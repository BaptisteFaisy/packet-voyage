# Requirements — `enrichment`

Spec method (§14.1): **requirements-first**. Covers **VOY-F-08 … VOY-F-13**;
verified by properties **VOY-P-04** (nothing private leaves) and **VOY-P-19**
(warm cache offline = online). Owner: `packages/enrich` (lot L6). Contract:
`docs/CONTRACTS.md` §5.6. Steering: `privacy.md` (table 6.4),
`probing-ethics.md`.

## Introduction

Enrichment turns bare addresses into candidates: network (ASN, name, prefix),
reverse DNS, IXP membership, anycast flag, geolocation candidates from RIPE
IPmap and the local DB. It is the **only** package allowed to touch the
network, everything goes through an injected `Fetcher`, every outbound address
is logged, and the whole stage collapses gracefully to offline: cache + local
data + name hints, with the missing pieces listed.

Scope — **in**: adapters (rDNS, RIPEstat, IPmap, PeeringDB prefixes, DB-IP),
file cache, consent, orchestrator. **Out**: classification (`address-classes`
provides the gate), candidate fusion (`locator`).

---

## Requirements

### Requirement 1 — VOY-F-08 (I): network identity

**User Story:** As a user, I see which network each public hop belongs to.

#### Acceptance Criteria

1. WHEN enrichment runs for a public address, THE SYSTEM SHALL set `asn` and
   `as_name` (and `prefix`) from the local DB, else from RIPEstat
   (`ripeStat(ip, o)`), else leave them `null` and list the gap in `missing`
   — never guess.
2. THE SYSTEM SHALL record the source and date of each result in the cache
   (VOY-F-12).

### Requirement 2 — VOY-F-09 (I): reverse DNS

#### Acceptance Criteria

1. WHEN a public address has no name in the trace and the mode is not
   offline, THE SYSTEM SHALL query the system resolver (`reverseDns(ip)`) and
   store the name on the reply.
2. WHERE `offline: true` or no consent, THE SYSTEM SHALL NOT resolve (table
   6.4 lists rDNS as a per-trace send — consent covers it).

### Requirement 3 — VOY-F-10 (S): IXP marking

#### Acceptance Criteria

1. WHEN an address falls in a known IXP prefix (PeeringDB `ixpfx`, live only,
   cached), THE SYSTEM SHALL mark the hop (`ixp`) and add the IXP's site(s) as
   candidates with source `ixp-prefix`, weight 0.80 (CONTRACTS §3).
2. THE SYSTEM SHALL fetch the prefix list from the user's machine only, once
   per cache period; nothing PeeringDB is ever vendored (`data-licences.md`).

### Requirement 4 — VOY-F-11 (I) + VOY-F-13 (I): offline and consent

#### Acceptance Criteria

1. WHERE `offline: true` OR consent is absent, THE SYSTEM SHALL make **zero**
   `fetch` calls and behave identically otherwise, using cache + local DB +
   hints, listing every missing enrichment in `missing`.
2. BEFORE the first send of addresses to a third party, the CLI SHALL name
   the services and what is sent (table 6.4 — `consentPromptText()` mirrors
   it) and ask; consent is stored (`writeConsent`), displayable and revocable
   (`voyage consent`); `grantedAt` is recorded.
3. Verified by: fake-Fetcher test asserting zero calls offline/no-consent
   (VOY-F-11, VOY-F-13) and by VOY-P-19.

### Requirement 5 — VOY-F-12 (I): cache

#### Acceptance Criteria

1. THE SYSTEM SHALL store each enrichment under a key covering service +
   address, with its source and date, honouring a per-service TTL
   (`cache.set(key, value, ttlDays)`).
2. THE SYSTEM SHALL expose `cache.stats()` (`entries`, `oldest`, `newest`) for
   `voyage data status`.
3. `createFileCache(dir)` writes under the user's cache dir — never inside the
   repository.

### Requirement 6 — VOY-P-04: nothing private leaves the machine

#### Acceptance Criteria

1. THE SYSTEM SHALL skip every non-public hop (`isPublicAddress === false`)
   and the user's own address **before** any adapter call.
2. THE SYSTEM SHALL record every address it would have sent in
   `sentAddresses`, and log every outbound address through `options.log`.
3. Verified by VOY-P-04: for any generated journey, no request contains a
   non-public address nor the user's address.

### Requirement 7 — VOY-P-19: cache equivalence

#### Acceptance Criteria

1. WHEN an online run fills the cache and the same journey is recomputed
   offline with that cache, THE SYSTEM SHALL produce the same journey.
   Verified by VOY-P-19 (fake Fetcher fills a cache, then offline rerun with
   a throwing Fetcher).

### Requirement 8 — VOY-F-20 (S) support: anycast

#### Acceptance Criteria

1. WHEN IPmap reports anycast (or the address matches a known anycast
   prefix), THE SYSTEM SHALL set `hop.anycast = true` and add candidates with
   source `ipmap-anycast` (weight 0.50); the locator retains only the
   delay-compatible instance (locator spec, VOY-F-20).
