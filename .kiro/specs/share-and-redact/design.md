# Design — `share-and-redact`

Contracts: `docs/CONTRACTS.md` §5.5 — `redactJourney(journey, level)`,
`redactionPreview(journey, level)`, `encodeShareLink(journey, baseUrl)`,
`decodeShareLink(url)`, `MAX_FRAGMENT_BYTES = 60_000`; §2 for
`Journey`/`RedactionLevel`; `packages/schema` for `parseJourney` +
`JourneyParseError`. Steering: `privacy.md`.

## 1. Modules

```
packages/core/src/redact/
  redact.ts     redactJourney — the removals + coarsening + redaction flag
  preview.ts    redactionPreview — human-readable list of what will be shared
packages/core/src/share/
  codec.ts      compress/decompress (deterministic, stdlib: gzip via fflate-style
                pure impl or JSON+base64url; chosen in task 1.1 — must run in
                browser AND node without deps)
  link.ts       encodeShareLink / decodeShareLink / MAX_FRAGMENT_BYTES
```

## 2. Redaction algorithm (`redact.ts`)

```
redactJourney(journey, level):
  1. hops: drop every hop whose class ∈ {private, cgnat, link-local, loopback}
     (documentation-range hops are kept — they are fixtures, not personal)
  2. source: level 'country' → keep country, drop lat/lon/city (or replace
     with null — NEVER a centroid, honesty.md); level 'city' → keep city +
     country, drop exact coordinates
  3. strip reply names that embed the user's box/ISP hostname pattern? NO —
     names of dropped hops vanish with the hops; kept hops are public infra
  4. renumber: keep original ttls (they are measured facts); segments that
     referenced dropped hops are rebuilt by re-running buildSegments/
     summarize — redaction returns a *recomputed* journey, not a patched one
  5. set redaction = { level, applied: true }
```

Recomputing (step 4) is the key decision: a hand-patched journey drifts out
of sync with its summary and fails VOY-P-15/P-18. `redactJourney` therefore
takes the datasets from the journey's own located hops (positions are already
in the file) — no external data needed, still pure.

`redactionPreview` renders the diff: which hops disappear (ttl + class),
what the source becomes, the resulting summary numbers — exactly what P7
shows before the user confirms.

## 3. Share codec

- Payload: canonical JSON of the redacted journey (keys sorted —
  determinism, CONTRACTS §0.7) → DEFLATE (raw, deterministic level) →
  base64url → `baseUrl + '#j=' + payload`.
- `encodeShareLink` throws `ShareTooLargeError` when the fragment exceeds
  `MAX_FRAGMENT_BYTES` (caller offers the file — VOY-F-39.2) and
  `ShareUnredactedError` when `redaction.applied !== true` (defence in
  depth).
- `decodeShareLink`: split on `#j=`, base64url-decode, inflate,
  `parseJourney` — every failure mode maps to the structured
  `JourneyParseError` (never `eval`, never HTML — VOY-N-03).
- Codec must work in browser and Node with **no dependency** beyond the
  workspace (CONTRACTS §5.13 spirit): implement raw DEFLATE/inflate via
  `CompressionStream` when available with a stored-block fallback, or vendor
  a tiny pure implementation — decided and recorded in task 1.1.

## 4. Edge cases

| Case | Handling |
|---|---|
| Journey already fully private | redaction drops all hops; result keeps target + summary zeros; preview says so; link still valid |
| Source undeclared (`source: null`) | nothing to coarsen; level recorded anyway |
| City-level share with a one-hop trace | hop 1 is usually the box (private) → dropped; preview shows the empty result honestly |
| Corrupted fragment (truncated base64, bad gzip) | `JourneyParseError` with the stage that failed |
| Fragment > 60 kB (huge journey, many cables) | typed error → UI offers file download; cables list is already capped at 5 per segment, story is optional — trimming `story` first is the documented escalation, never silent truncation |
| Non-ASCII city names | base64url over UTF-8 bytes; round-trip property covers it |
| Double redaction | idempotent: `redact(redact(j)) == redact(j)` (tested) |

## 5. Test strategy

- Property **VOY-P-16**: generated journeys (all classes present, declared
  source at city precision) ⇒ redacted output contains no non-public address,
  no access hop, no user address, source no finer than level; both levels;
  fixed seed.
- Property **VOY-P-17**: `decodeShareLink(encodeShareLink(redacted, base))`
  deep-equals `redacted`; byte length ≤ 60 000 for journeys up to 64 hops;
  fixed seed.
- Property **VOY-P-18**: every fixture journey (gallery ×6 + generated)
  survives `JSON.stringify → parseJourney` deep-equal; `--json` CLI outputs
  validated (asserted in the `cli` spec too).
- Unit: preview content (P7 wording), idempotence, unredacted-encode refusal,
  corrupted fragments (truncated, flipped bits, empty).
- `fixture-privacy-guard` covers gallery fixtures; this spec's generators use
  documentation ranges + synthetic private ranges.
