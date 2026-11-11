---
inclusion: always
---

# Packet Voyage — honesty steering (spec §5, VOY-N-04)

**No value is ever displayed without its certainty level.** This file is the
contract; `scripts/guards/vocabulary.guard.mjs` (CI) and the `claims-guard`
hook (on save in `apps/web/src/**` and `packages/core/src/story/**`) enforce
it; the `claims-reviewer` agent re-reads labels and templates against it.

## The three certainty levels (§5.3)

| Level | What belongs to it | Rendering |
|---|---|---|
| **measured** | hop address, delays, loss, hop order | bold figures, solid dot |
| **inferred** | network (ASN), city, country, IXP, segment nature | value + its confidence level (solid / probable / uncertain) + its sources; solid or dashed stroke |
| **assumed** | the drawn path between hops, compatible cables, real distance | dotted stroke; conditional wording; a list of possibilities |

An inferred value opens onto **its sources**. An assumed value opens onto **the
explanation of what prevents knowing more**. A level with no value is a bug; a
value with no level is a blocking bug.

## Imposed vocabulary (§5.4)

| Write | Never write |
|---|---|
| "Compatible cables for this crossing" | "Your packet travelled through cable X" |
| "Likely in Paris (2 sources agree)" | "Located in Paris" without a level |
| "At least 6,655 km" | "6,655 km" for a travelled distance |
| "Countries where a hop was located" | "Countries your data crossed" |
| "Not located" | Any default position (country centroid, operator HQ) |

Forbidden patterns in any user-facing string (the guard list):
"travelled through", "took the cable", "your packet crossed", "went through
cable", "located in {city}" without a level, a bare "{n} km" for a travelled
distance, "countries your data crossed".

## Rules that follow

1. **Every travelled distance is preceded by "at least"** — in UI, story, CLI
   output, MCP output and exported images (VOY-P-20).
2. **Never invent a position.** An unlocated hop stays unlocated
   (`level: 'unlocated'`, `location: null`); a silent hop stays a counted gap
   (VOY-P-11). No country centroid, no operator headquarters fallback.
3. **Rejections are content, not trash.** A candidate rejected by light is
   kept with `allowed_km` / `needed_km` and shown ("rejected by light: 9.6 ms
   allows 1,439 km at most; 6,496 km needed", VOY-F-16).
4. **A cable compatibility score is never a probability.** Bands are "high /
   medium / low" — the top band is called *strong*, never *certain*; every
   crossing card carries the sentence "Nothing in the measurement says which
   one carried your packet" (VOY-F-23).
5. **Certainty is never carried by colour alone** — stroke style *and* a text
   label (VOY-N-08).
6. **Story templates only** (§7.12): `buildStory` uses templates, no LLM,
   unless VOY-F-36 is enabled — and then every returned sentence is verified:
   each number and proper name must appear in the journey, else the template
   is used.
7. **When the tool knows less, it says less**: no source position ⇒ relative
   bounds only and a banner saying so (VOY-F-19); offline ⇒ the list of
   missing enrichments (VOY-F-11).

## Before shipping any label

Ask the `claims-reviewer` agent to re-read it, or run:
`node scripts/guards/vocabulary.guard.mjs`. A violation is blocking, whatever
the deadline (§14.6 fact 3: the steering changes the words — keep a
before/after example for the submission text).
