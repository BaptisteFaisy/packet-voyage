# Security and privacy

This tool handles one sensitive thing: **where you are**, and the shape of your
access network. Everything below follows from that.

## What the tool does with your addresses

| Data | Where it goes |
|---|---|
| Your own address, your box, your access-network hops (`10/8`, `172.16/12`, `192.168/16`, `100.64/10`, link-local, loopback) | Nowhere. Never located, never sent, removed from anything shared. |
| Public addresses of the route | To the system resolver, RIPE IPmap, RIPEstat and PeeringDB — **only after you grant consent**, and never with `--offline`. |
| The journey you share | Redacted first: your address, the non-public hops and the access network are removed, and the departure is coarse-grained to the country (city only on request). You see the list of what will be shared before confirming. |
| A share link | The whole journey travels in the URL **fragment**: it never reaches a server, never appears in a log, and no backend exists. |

The hosted site makes **zero network request after load**. This is not a promise
only: the CSP is `default-src 'none'; connect-src 'none'`, and
`docs/evidence/no-request-*.log` is a Playwright capture of a full visit showing
no external request (`node scripts/verify-no-request.mjs`).

## What the tool will never do

- Probe a range, a list or a port: one host per command, on a human's request.
- Escalate privileges: no `sudo`, no capability change; if a mode needs
  privileges you do not have, it says so and offers the default.
- Run a shell: the trace tool is spawned with an argument array, and every
  argument is validated (a dash-leading argument, a CIDR or a shell
  metacharacter is refused with exit code 2).
- Locate a person: cities at best, never a street, never a home.
- Let an agent probe while it builds: `scripts/hooks/probe-guard.mjs` refuses any
  `traceroute`, `tracert`, `mtr`, `ping`, `nmap` or `tracepath` whose target is
  not in `.kiro/probe-allowlist.txt` (loopback and the documentation ranges).

## Imported data

Every imported file is validated against a Zod schema before use
(`packages/schema`), and no imported content is ever executed or injected as
HTML: the site renders text through React, and the strict CSP blocks inline
scripts.

## Dependencies and data supply chain

- Code: MIT. Data: its own notice (`packages/data/LICENCE-DATA.md`) — ODbL for
  the OpenStreetMap cables, public domain for Natural Earth, CC0 for the
  hand-curated tables.
- No vendored TeleGeography or PeeringDB data: a CI guard
  (`scripts/guards/data-licence.guard.mjs`) refuses any dataset whose provenance
  names those origins, and refuses any dataset without a provenance sheet and a
  matching sha256.
- The local geolocation database (DB-IP Lite) is downloaded into your own cache
  directory, never committed.

## Reporting a vulnerability

Email **baptiste.faisy@gmail.com**. Please include what you ran, the version
(`git rev-parse HEAD`), and whether the issue leaks a location or an address:
that is the class of bug this project cares about most. There is no bug bounty;
you will get an answer and a fix, and credit if you want it.

## Supported versions

One branch, `main`, deployed continuously to GitHub Pages. There is no LTS: the
site and the CLI are versioned together, and `journey.json` carries `version: 1`.
