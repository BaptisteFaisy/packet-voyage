# One hundred ways to go further

The backlog behind this edition, kept in the open: what was built, what is
planned, and what the specification deliberately excludes (§4, non-objectives).
Nothing here is a promise — the honesty contract applies to the roadmap too.

Legend: **[done]** shipped and tested · **[wip]** in progress · **[next]** worth
doing before the freeze · **[later]** after the contest · **[out]** excluded by
the specification.

## Honesty and teaching

1. **[wip]** Light cone on the map: the disc of positions each measured delay still allows.
2. **[wip]** A step-by-step "rejected by light" card: measurement, bound, verdict, with the arithmetic shown.
3. **[next]** A serious game: given a delay, pick which city is possible.
4. **[next]** Two columns, "what the database says" against "what the light says".
5. **[later]** Interactive glossary on hover (TTL, RTT, anycast, MPLS, IXP).
6. **[later]** Teacher mode: freeze a hop, generate a worksheet and its answer key.
7. **[later]** Printable worksheet (print CSS) for a classroom without network.
8. **[next]** Scale of the journey: the distance in everyday units (laps of the Earth, Paris–Marseille).
9. **[later]** A timeline of "what happened during these 91.7 ms" at human scale.
10. **[done]** A permanent reminder of what a traceroute cannot see (the return path).
11. **[wip]** Distance bounds: a lower *and* an upper bound, not only "at least".
12. **[wip]** Delay breakdown: propagation floor against the residual (queues, routing, processing).
13. **[wip]** Which physical medium can explain this delay: vacuum, fibre, copper, microwave, geostationary.
14. **[done]** Anycast explained: the possible instances and the one the delay keeps.

## Network analysis

15. **[next]** Severity score for a trombone, with the milliseconds the detour costs.
16. **[done]** Structured IPv4 against IPv6 comparison.
17. **[wip]** Diff of two journeys (same target, two moments).
18. **[later]** Rate-limited hop detection (suspiciously round delays).
19. **[next]** Hidden MPLS detection (a long segment with no delay step).
20. **[later]** Probable asymmetry index (envelope non-monotonic before correction).
21. **[next]** Milliseconds attributed to each AS.
22. **[next]** "Where is the bottleneck": the segment adding the most ms per km.
23. **[next]** CSV export of the roadmap for a ticket.
24. **[wip]** A redaction-safe incident report, ready to paste to a hosting provider.
25. **[later]** Merge several traces of the same host (multi-probe).
26. **[later]** A local list of known anycast prefixes, without IPmap.
27. **[done]** Show the protocol used and its limits (ICMP, UDP, TCP).
28. **[out]** Import a long `ping` series: that is continuous measurement, a non-objective.

## Data and geography

29. **[next]** Wikidata (CC0) enrichment of cable records: length, RFS year, owners.
30. **[next]** OpenStreetMap landing stations, to name the "Unnamed landing" entries.
31. **[later]** A wider hint table (500 cities and the usual operator shorthands).
32. **[later]** Adaptive geometry simplification by zoom level.
33. **[later]** An optional Natural Earth 50 m basemap.
34. **[next]** Time zones crossed: local time at each hop.
35. **[next]** Estimated fibre length next to the great-circle distance.
36. **[later]** A heat map of rejections: where the databases are wrong most often.
37. **[later]** Aggregate statistics over the gallery (most crossed countries, most compatible cables).
38. **[done]** Planned cables rendered apart ("not in service at the trace date").
39. **[next]** A data coherence guard: a cable without landings, an empty geometry.
40. **[later]** A "how to refresh this dataset" button on the sources page.
41. **[next]** Export the credits as plain text.
42. **[wip]** The same journey in 1987: which cables were in service, and compatible, that year.
43. **[next]** The age of the compatible cables (RFS) as a hint about the route.
44. **[later]** Great-circle distance against a commercial flight route, for scale.

## Interface and accessibility

45. **[later]** More projections (Robinson, Mercator) and a comparison.
46. **[later]** An optional AAA contrast mode.
47. **[done]** Adjustable animation speed and keyboard step-through.
48. **[next]** A text-only view (no map) for terminals and screen readers.
49. **[next]** An A4 print layout: roadmap plus summary on one page.
50. **[next]** Deep link to one hop (`#/journey/x?hop=4`).
51. **[later]** A context mini-map inside the crossing card.
52. **[later]** A third language (Spanish or German).
53. **[next]** A keyboard shortcut help panel (`?`).
54. **[done]** Network colours doubled by a stroke pattern in the legend.
55. **[done]** No automatic animation when the system asks for reduced motion, with a visible notice.
56. **[later]** Breadcrumbs between the views.
57. **[later]** Search inside the roadmap table.
58. **[later]** Preferences carried by the URL, so a setting can be shared.

## Sharing and diffusion

59. **[wip]** GeoJSON export of a journey: the GIS half of the chimera.
60. **[later]** SVG export of the map.
61. **[done]** PNG export in a fixed large size, credits included.
62. **[later]** A locally generated QR code of the share link.
63. **[next]** Link compression in the browser through `CompressionStream`.
64. **[later]** An exportable "passport postcard" with the stamps.
65. **[next]** Markdown export of the journey log.
66. **[done]** One-click redacted share, with a preview of what leaves the machine.
67. **[next]** A share link that preselects one hop.
68. **[next]** Publish the CLI on npm (`npx packet-voyage`) — needs a token from the maintainer.
69. **[later]** An Open Graph image generated per journey, for a blog post.
70. **[next]** TSV export of the roadmap.

## Agents and MCP

71. **[next]** An MCP tool `explain_rejection`.
72. **[next]** An MCP tool `summarize_for_ticket`.
73. **[later]** A Kiro skill "check a cable cut" against a given cable.
74. **[next]** An audit log of MCP calls.
75. **[next]** Publish the JSON Schema generated from the Zod models, for third-party agents.
76. **[done]** The MCP server is read-only by default and every trace needs approval.
77. **[later]** An MCP tool `era_compare`.
78. **[done]** The Kiro power declared with its guardrails (one host, five seconds, twenty per session).

## Quality and proof

79. **[wip]** Parser hardening: BOM, CRLF and lone CR, tabs, UTF-8 accents, truncated last line.
80. **[wip]** `tracert` in German, Spanish and Portuguese, parsed by structure not by words.
81. **[wip]** Fuzz over arbitrary bytes: never throw, never loop, never invent a delay.
82. **[done]** A performance guard: 30 hops in 30.6 ms against a 200 ms target.
83. **[next]** Measured coverage, published with a threshold.
84. **[later]** Visual non-regression of the map (capture and compare).
85. **[next]** Automated accessibility audit (axe-core) on the main views.
86. **[next]** Snapshot tests of the CLI's human-readable output: the wording is a promise.
87. **[next]** A guard against new runtime dependencies without a size justification.
88. **[done]** Property: a contradictory source never raises confidence.
89. **[next]** Property: redaction is idempotent.
90. **[wip]** Property: a GeoJSON export read back gives the same hops and segments.

## Infrastructure and misc

91. **[later]** A reusable GitHub Action "trace to journey", triggered by a human.
92. **[later]** A Docker image of the CLI.
93. **[later]** An offline PWA for a classroom without network.
94. **[next]** Detect the browser language on first visit.
95. **[done]** Datasets lazy-loaded as separate chunks, with a weight guard.
96. **[later]** An HTML dashboard of the guards.
97. **[done]** An automated merge log, through Mergify.
98. **[next]** Semantic versioning and a generated CHANGELOG.
99. **[next]** A "methods" page citing Nautilus and the state of the art.
100. **[done]** Replay the stitching animation from a share link.
