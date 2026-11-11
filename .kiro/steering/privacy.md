---
inclusion: always
---

# Packet Voyage — privacy steering (spec §6.4, VOY-N-13, VOY-P-04/16)

**Nothing personal in the repository, and nothing leaves the user's machine
except what table 6.4 authorises.** The first kilometre of a trace belongs to
the user: it reveals their box, their ISP, their city. Redaction happens
*before* any trace is recorded, shared or committed.

## What may be sent, to whom, when (table 6.4 — exhaustive)

| Service | What is sent | When |
|---|---|---|
| System DNS resolver | the route's **public** addresses, for reverse names | every trace, unless `--offline` |
| RIPE IPmap, RIPEstat | the route's **public** addresses | after consent, unless `--offline` |
| PeeringDB | nothing route-specific: download of the IXP prefix list | after consent, once per cache period |
| LLM (option VOY-F-36) | the **already redacted** journey, no addresses | only if the option is enabled |

Nothing else, ever. Private addresses (RFC 1918 / RFC 4193), CGNAT
(`100.64.0.0/10`), access-network hops and the user's address are **never**
sent (VOY-P-04): `enrichHops` skips every non-public hop before any call and
records what it *would* have sent in `sentAddresses` so the property test can
assert on it. Every outbound address goes through `options.log`.

## Consent (VOY-F-13)

Before the first send: name the services, say what is sent, ask. Consent is
stored (`readConsent` / `writeConsent`), displayable and revocable
(`voyage consent`). Without consent the tool behaves exactly as `--offline`.
The prompt text (`consentPromptText()`) mirrors table 6.4 — update both
together.

## Redaction before recording (VOY-F-38, VOY-P-16)

`redactJourney(journey, level)` removes the user's address, every non-public
hop and every access-network hop, and coarsens the source to the requested
level (`country` by default, `city` on request). The user sees
`redactionPreview` **before** confirming any share.

## Repository hygiene

1. Test and gallery fixtures use **documentation ranges only**: RFC 5737
   (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`) and RFC 3849
   (`2001:db8::/32`), or are fully redacted (VOY-N-13, CONTRACTS §5.10).
2. `scripts/guards/fixture-privacy.guard.mjs` (CI) and the
   `fixture-privacy-guard` hook (on save in `gallery/**` and test folders)
   reject: private addresses, CGNAT, access-network hops, a source finer than
   country.
3. Never commit your own live trace unredacted — not in a test, not in an
   issue, not in `KIRO_JOURNAL.md`.
4. Gallery departures: redacted to country, or public RIPE Atlas probes
   (open question 7 — no individual's address either way).
5. The video and screenshots show gallery journeys with example names only;
   no logo, no real owner names on screen (risk table §16).

## Classes that trigger this (spec §7.3)

`private`, `cgnat`, `link-local`, `loopback` ⇒ never located, never sent.
`documentation` ⇒ accepted in examples/tests, marked as example. `multicast`,
`reserved` ⇒ flagged as unexpected. Only `public` is enriched and located.
Classification itself is spec `address-classes` (VOY-F-07, VOY-P-03).
