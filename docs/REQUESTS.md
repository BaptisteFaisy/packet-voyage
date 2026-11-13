# Two letters to write before the submission

Two data providers are on the project's **no** list in
`.kiro/steering/data-licences.md`: nothing of theirs is embedded in the
repository, and nothing will be, until they answer. Both answers are worth
having, and both are the owner's to send — this file holds the two drafts,
ready to copy, with the facts the project can prove.

The project: **Packet Voyage** — an open-source command line and web tool that
puts a `traceroute` on a world map, lists the submarine cables *compatible*
with each crossing, and compares the measured delay with the speed of light.
Code MIT, public repository <https://github.com/Tradoooo/packet-voyage>, live
site <https://tradoooo.github.io/packet-voyage/>. The data it ships today:
OpenStreetMap cable geometry (ODbL-1.0), Natural Earth landmasses (public
domain), Wikidata (CC0), and a small hand-made city/airport table. The
consumer is a developer or a curious person running a command on their own
machine; nothing is sold, and the tool never probes anything without the
user's consent.

---

## 1. To TeleGeography (Submarine Cable Map)

> Subject: Permission to use the Submarine Cable Map data in an open-source tool
>
> Dear TeleGeography team,
>
> I am the author of Packet Voyage (<https://tradoooo.github.io/packet-voyage/>),
> an open-source command line tool (MIT) that takes the output of a
> `traceroute`, places every hop on a map, and lists the submarine cables
> *compatible* with each crossing — never claiming which cable carried a given
> packet. The repository is public: <https://github.com/Tradoooo/packet-voyage>.
>
> Today the tool uses cable geometry extracted from OpenStreetMap under ODbL-1.0,
> with the attribution "© OpenStreetMap contributors". OSM's cable data is
> incomplete and slowly updated, and the project would be measurably better
> with the Submarine Cable Map: more cables, their owners, their ready-for-
> service dates, and the landing points that decide whether a crossing is
> even possible.
>
> May I embed a derived extract of the Submarine Cable Map in the repository
> and redistribute it under the same terms as the code (MIT, with a clear
> attribution to TeleGeography and a link to the source)? The extract would
> contain geometry only — cable identifiers, coordinates, and the public
> attributes needed for the "compatible cables" list — with no subscriber or
> commercial fields.
>
> In return, the project would: credit TeleGeography in the data notice, in
> every export and every screen where the cables are shown, and in the
> repository; keep the extract in a versioned file with its provenance (URL,
> retrieval date, SHA-256) so it can be audited; and remove the extract
> promptly if you ask.
>
> The project is registered for the contest "Kiroween" and the code and the
> site are public, so the attribution will be visible to everyone.
>
> Thank you for your time.
>
> Baptiste Faisy — <baptiste.faisy@gmail.com>

---

## 2. To PeeringDB

> Subject: Agreement for live IXP prefix queries from users' machines
>
> Dear PeeringDB team,
>
> I am the author of Packet Voyage (<https://tradoooo.github.io/packet-voyage/>),
> an open-source command line tool (MIT) that maps a `traceroute` and lists the
> submarine cables compatible with each crossing. One of its steps asks whether
> a hop sits inside an Internet Exchange Point's address space.
>
> The tool queries the PeeringDB IXP prefix list **from the user's own
> machine**, at run time, only after the user has granted explicit consent, and
> only for the public hop addresses of their own route. Nothing is stored in
> the repository: the list is cached locally in the user's cache directory, it
> is never redistributed, and it is never sent to a third party. No route
> address is transmitted to PeeringDB — the queries return the prefix
> directory, and the comparison happens on the user's machine.
>
> Your Acceptable Use Policy forbids storing or transmitting PeeringDB data
> without an agreement, which is exactly why I am writing rather than shipping
> it. Would a short agreement covering this use — live queries from end-user
> machines, local cache, no redistribution, attribution shown in the interface —
> be acceptable to you? I am happy to sign whatever form you require.
>
> If an agreement is not possible, the tool already degrades honestly: the
> interface says that the exchange points cannot be shown, and the command
> line documents the limitation rather than guessing.
>
> Thank you for your time.
>
> Baptiste Faisy — <baptiste.faisy@gmail.com>

---

## What happens when they answer

| answer | what changes in the repository |
|---|---|
| TeleGeography says yes | a `scripts/data/build-cables-telegeography.mjs` extraction, a new dataset with its provenance sheet, and the attribution in `creditsFor()` — the credits are never hand-typed, they come from the sheet |
| TeleGeography says no | nothing changes: OSM stays the source, and the licence sheet keeps the line it has today |
| PeeringDB signs | the agreement is quoted in `docs/` and the live-query clause of the licence sheet is updated |
| PeeringDB says no | the IXP prefix download stops, the tool says so in the interface, and the product keeps its "what the site cannot do" panel honest |
