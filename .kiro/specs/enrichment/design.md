# Design — `enrichment`

Contract: `docs/CONTRACTS.md` §5.6 — `Fetcher`, `EnrichOptions`,
`EnrichResult`, `enrichHops`, `reverseDns`, `ripeStat`, `ipmapLocate`,
`ixpPrefixes`, `Cache`, `createFileCache`, `ConsentState`, `readConsent`,
`writeConsent`, `consentPromptText`. Node-only package; nothing here runs in
the browser (the web app computes with hints only — zero requests, VOY-N-01).

## 1. Modules

```
packages/enrich/src/
  fetcher.ts      Fetcher type + a fetch-based default (the only `fetch` import)
  cache.ts        Cache interface, createFileCache(dir): JSON files, key = sha256(service+addr)
  consent.ts      ConsentState read/write/prompt text (mirrors table 6.4)
  rdns.ts         reverseDns via node:dns/promises (system resolver)
  ripestat.ts     ripeStat(ip, o) → { asn, as_name, prefix }
  ipmap.ts        ipmapLocate(ip, o) → Candidate[] (latency/rdns/ix/anycast/contribution engines)
  peeringdb.ts    ixpPrefixes(o) → IxpPrefix[] (live download, cached)
  localdb.ts      DB-IP / IPinfo Lite MMDB reader (user-downloaded, geodb candidates)
  orchestrator.ts enrichHops(hops, options): the gates, the order, missing[], sentAddresses[]
```

## 2. Orchestrator flow (the gates come first)

```
enrichHops(hops, options):
  1. gate: if options.offline || !options.consent.granted → fetch = never-called
     (wrap the Fetcher so any call throws; a test asserts zero calls)
  2. for each hop:
       if !isPublicAddress(reply.ip) → skip everything (VOY-P-04);
           record the address in sentAddresses ONLY as "would-have-sent" = not sent
       candidates = []
       network: localdb → else ripeStat (cache) → asn/as_name/prefix or missing
       name: reply.name ?? (offline ? null : reverseDns)
       ixp: inPrefix against ixpPrefixes cache → hop.ixp + ixp-prefix candidates
       anycast: ipmap flag or known prefix → hop.anycast + ipmap-anycast candidates
       location: ipmapLocate → candidates per engine (weights of CONTRACTS §3);
                 localdb → geodb candidate (0.30, never alone)
  3. every outbound address goes to options.log and sentAddresses
  4. return { hops, candidates (index-aligned), missing, sentAddresses }
```

Cache discipline: every adapter checks `cache.get` first, stores with its TTL
on success, and stores negatives too (a short-TTL "no answer" avoids
hammering). Cache keys include the service id so a service change invalidates.

## 3. Edge cases

| Case | Handling |
|---|---|
| Non-public hop | skipped before any call — the property VOY-P-04 asserts on `sentAddresses` |
| No consent | identical to offline; `missing` lists what consent would have added |
| Service down / HTTP 5xx / timeout | adapter returns null, hop keeps what it has, gap listed in `missing`; never retry-storm (one attempt per hop per service) |
| Rate limits (RIPEstat ≤ 8 concurrent) | a small semaphore in the orchestrator; sequential per hop is fine for ≤ 30 hops |
| IPmap returns several engines | each engine maps to its own candidate source id (`ipmap-latency` 0.85, `ipmap-rdns`/`-ix`/`-contribution`/`-anycast` 0.50) — fusion is the locator's job |
| Anycast address | flag set; candidates kept — only the delay-compatible instance survives the light filter (locator) |
| IPv6 shorthand address | normalized once by `parseAddress`; cache keys use the normalized form |
| Silent hop (empty ip) | no address, nothing to enrich |
| Warm cache + offline | VOY-P-19: the run must be byte-identical to the online run that filled the cache |
| DB-IP absent | geodb candidates simply missing; listed in `missing`; hints still work |

## 4. Errors and logging

No adapter throws out of `enrichHops`: errors become `missing` entries
(`'ripestat:198.51.100.9'`) and null fields. `options.log` receives one line
per outbound address (`→ stat.ripe.net 198.51.100.9`) — the CLI prints it;
the acceptance checklist (§18) greps a real log for non-public addresses.

## 5. Test strategy

- Fake `Fetcher` (scripted responses) for every adapter: hit, miss, 5xx,
  malformed JSON, cache hit (no fetch call).
- Gate tests: offline and no-consent runs assert `fetchCalls === 0`
  (VOY-F-11, VOY-F-13).
- Property **VOY-P-04**: generated journeys with private/CGNAT/link-local/
  loopback/documentation hops; assert no request URL or body contains a
  non-public address nor the declared user address. Fixed seed in header.
- Property **VOY-P-19**: fill cache online (fake Fetcher), rerun offline with
  a throwing Fetcher; journeys deep-equal. Fixed seed in header.
- Consent: `consentPromptText()` snapshot naming every service of table 6.4;
  revoke ⇒ next run behaves offline.
- Cache: TTL expiry boundary; `stats()` oldest/newest correct; negative cache.
