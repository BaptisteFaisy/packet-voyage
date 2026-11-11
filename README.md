# Packet Voyage

> A network diagnostic from 1987, stitched to geography.

You type a site address. Your request leaves your box, crosses cities, enters an
exchange point, dives under an ocean and comes out on another continent — all in
under a tenth of a second. **Packet Voyage** makes that trip visible: it takes
the output of a `traceroute`, puts every hop on a world map, lists the submarine
cables **compatible** with each crossing, and says honestly what is measured,
what is inferred and what is assumed.

Live site (no install, no account, no request): <https://baptistefaisy.github.io/packet-voyage/>

```bash
npx packet-voyage trace example.org     # trace your own route
npx packet-voyage read trace.txt        # read a trace you already have
npx packet-voyage share journey.json    # redact, then produce a shareable link
```

## Three decisions that shape everything

1. **A browser cannot trace a route.** It has no raw packets and no hop counter.
   The product is therefore two halves: a command-line tool that wraps your
   machine's `traceroute`, and a static site that displays a journey (pasted,
   dropped, or picked from the gallery). The hosted site never sends a probe.
2. **Nobody can know which cable a packet took.** No measurement says so. The
   product speaks of **compatible** cables, ranked by plausibility — never of a
   cable that was "taken". That restraint is the point, not a weakness.
3. **Light is the lie detector.** A hop answering in 9.6 ms from Lyon cannot be
   in Ashburn, whatever a geolocation database says: in 9.6 ms round trip,
   nothing travels further than 1,439 km. Every physically impossible location is
   rejected — and the rejection is shown.

## Three levels of certainty

| Level | What belongs to it | On screen |
|---|---|---|
| **Measured** | hop address, delays, loss, hop order | bold figures, solid dot |
| **Inferred** | network, city, country, exchange point, segment nature | value + its level (solid / probable / uncertain) + its sources |
| **Assumed** | the drawn path, compatible cables, real distance | dotted line, conditional wording, list of possibilities |

No value is ever displayed without its level.

## Layout

```
packages/core/     pure computation: parse, addr, hints, geo, envelope,
                   locate, segments, cables, metrics, story, redact, share
packages/schema/   Zod schemas of journey.json, provenance sheets, datasets
packages/enrich/   Node-only adapters: rDNS, RIPEstat, IPmap, PeeringDB, cache, consent
packages/data/     datasets + provenance sheets (own licence notice: ODbL, public domain)
apps/cli/          the `voyage` command (npm package `packet-voyage`)
apps/web/          the static site (Vite + React + d3-geo canvas)
apps/mcp/          optional MCP server: trace_host, read_trace, explain_journey, compare_journeys
gallery/           six redacted sample journeys
.kiro/             steering, specs, hooks, agents, skills — the build was driven from here
docs/              CONTRACTS.md (interfaces) and fr/CAHIER-DES-CHARGES.md (specification)
```

## Honesty, privacy, licences

- **Nothing leaves your machine without consent.** The tool names the services
  (system resolver, RIPE IPmap, RIPEstat, PeeringDB), says exactly what is sent
  (public addresses of the route only), and remembers, shows and revokes the
  consent. `--offline` sends nothing at all.
- **Private and access-network addresses are never located nor sent.** Anything
  shared is redacted first: your address, your box and your access network are
  removed, and the departure is coarse-grained to the country by default.
- **The hosted site makes zero network request after load.** Gallery journeys are
  pre-computed; a pasted trace is computed locally from the hints in the names.
- **Data licences are separate from the code.** Code is MIT; the data package
  carries its own notice (ODbL for OpenStreetMap-derived cables, public domain
  for Natural Earth). Every vendored dataset has a provenance sheet, and a CI
  guard refuses a dataset without one. TeleGeography and PeeringDB data are
  never redistributed here.

## Not a scanner

One host per command, no address range, no port discovery, no continuous
measurement, no return path (a traceroute only sees the way there). Through the
MCP server: one trace at a time, at least five seconds between two traces, at
most twenty per session, and your approval on every call.

## Development

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test
pnpm build            # cli bundle + static site
node scripts/guards/run-all.mjs
```

Guards are also Kiro hooks: the same rule protects the agent while it writes and
the pull request while it merges. `scripts/hooks/probe-guard.mjs` is the one worth
watching — it refuses any shell command in which an agent would probe the
Internet, because a project about measurement ethics is built under its own rule.

CI runs on self-hosted runners and answers in five minutes at most. Mergify is
the only merge pilot; a conflict is resolved by an agent, not by a human.

## Sources

See `docs/SOURCES.md` and the provenance sheets in `packages/data/provenance/`.
Thanks to OpenStreetMap contributors, Natural Earth, the RIPE NCC (IPmap,
RIPEstat, Atlas), DB-IP and PeeringDB.
