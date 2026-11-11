---
inclusion: always
---

# Packet Voyage — product steering

Packet Voyage turns a ten-line traceroute into an honest map of where a click
probably went: hops located by crossing several sources, filtered by the speed
of light, sea crossings listed with their *compatible* cables, a summary that
always says "at least", and a story told in three certainty levels. Kiroween
2026, category **Frankenstein**. Public repo, MIT for the code; the data
package carries its own notice (`packages/data/LICENCE-DATA.md`).

## The problem

A traceroute measures exactly two things: an interface address per hop and a
round-trip delay. Everything else — city, country, cable, distance — is
reconstruction, and most tools present that reconstruction as fact. This
product never does. The physics (light in vacuum: 299.79 km/ms; in fibre:
~204 km/ms) is used as a filter: a geolocation database that puts a hop at
6,496 km when the delay allows 1,439 km is **rejected by light**, and the
rejection is kept and shown — it is the demo (spec §7.14, VOY-F-16).

## Personas

- **The judges** — open the hosted site, click a gallery journey
  (`ocean-crossing`), watch the route get stitched hop by hop. Zero install,
  zero network request after load (VOY-N-01, VOY-F-44).
- **Karim — network engineer.** Runs `npx packet-voyage trace api.example.com`
  on a Tuesday morning, wants the detour and the inflation, not a picture
  (P4, P5, P10).
- **Inès — teacher.** Cannot install anything in the classroom; pastes a
  `tracert` output copied at home, gets a journey located from name hints
  alone (P8, P9, classroom mode VOY-F-45).

## What we promise

| Promise | Requirement |
|---|---|
| No value displayed without its certainty level | VOY-N-04, `honesty.md` |
| Nothing personal leaves the machine or enters the repo | VOY-P-04, VOY-P-16, `privacy.md` |
| The agent building this never probes the Internet | VOY-N-02, `probing-ethics.md` |
| Every vendored dataset has a provenance sheet and a permitted licence | VOY-N-05, `data-licences.md` |
| The site works offline; the CLI degrades gracefully offline | VOY-F-11, VOY-N-01 |

## Non-objectives — do not build these

- No continuous monitoring, no return-path inference, no cable-cut simulation.
- No probing from the hosted site, ever (VOY-N-02).
- No user accounts, no server, no database behind the site (§11.9).
- No LLM in the story pipeline unless VOY-F-36 is explicitly enabled, and even
  then every sentence is verified against the journey or the template wins.
- No sound anywhere (VOY-N-14); no Halloween decoration — the Frankenstein
  chimera shows in the stitched seams (§12.3).

## How to talk about the product

- "Compatible cables for this crossing", never "your packet crossed via".
- "At least 6,655 km", never a bare distance for a travelled path.
- "Likely in Paris (2 sources agree)", never "located in Paris" without level.
- A silent hop is a counted gap, never an invented position.

The full vocabulary table lives in `honesty.md` and is enforced by
`scripts/guards/vocabulary.guard.mjs` and the `claims-guard` hook.

## Demo numbers (spec §7.14 — Lyon → Ashburn worked example)

At least 6,655 km · 91.7 ms measured · light floor 63.6 ms · inflation 1.44 ·
1 location rejected by light (Ashburn at hop 4: 9.6 ms allows 1,439 km,
6,496 km needed) · 3 countries · 3 networks · 1 IXP · 0 gaps. Every test and
fixture that needs a "real" journey uses these numbers.
