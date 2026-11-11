# Design — `address-classes`

Contract: `docs/CONTRACTS.md` §5.1 — `parseAddress`, `classifyAddress`,
`isPublicAddress`, `inPrefix`, `isDocumentationAddress`. Types: `HopClass`
from `packages/schema` (CONTRACTS §2). Steering: `privacy.md`.

## 1. Modules

```
packages/core/src/addr/
  parse.ts      parseAddress(ip) → { family, normalized } | null  (v4 + v6, zone id strip)
  prefix.ts     inPrefix(ip, cidr) — bitwise on 32/128-bit views, both families
  classify.ts   classifyAddress(ip), isPublicAddress, isDocumentationAddress
  ranges.ts     the §7.3 tables as named CIDR constants (single source of truth)
  index.ts      barrel
```

`ranges.ts` holds one array per class, e.g.
`const PRIVATE_V4 = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']`,
`const CGNAT_V4 = ['100.64.0.0/10']`, `const DOC_V6 = ['2001:db8::/32']`.
`classifyAddress` walks the tables in a fixed order (loopback → link-local →
private → cgnat → documentation → multicast → reserved → public) so the result
never depends on table iteration accidents.

## 2. Decisions

- **No `node:net` in core.** `packages/core` has no Node APIs; parsing is
  hand-rolled on strings + `BigInt`/typed arrays. (`enrich` may use the
  system resolver; that is its lot.)
- **IPv6 normalisation**: expand shorthand once in `parseAddress`; downstream
  comparisons only ever see the normalized form (lowercase, longest form for
  v4-in-v6 mapped kept as `::ffff:a.b.c.d`). This is exactly where VOY-P-03's
  "IPv6 shorthand" counter-example would live (§14.6 fact 2).
- **Mapped addresses** `::ffff:192.168.1.1`: classify by the embedded v4 range
  (private here) — fail closed.
- **Malformed input**: `parseAddress` → `null`; `classifyAddress` → `reserved`
  (non-public ⇒ never sent, never located). No exceptions (VOY-N-10).
- **`inPrefix`**: parse both sides, compare family, mask to prefix length,
  compare bytes. Rejects family mismatch with `false`, not a throw.

## 3. Edge cases

| Case | Handling |
|---|---|
| `fe80::1%eth0` zone id | strip at `parseAddress`, keep out of `normalized` |
| `::1` vs `::0001` vs `0:0:0:0:0:0:0:1` | same normalized form ⇒ `loopback` |
| `2001:DB8::1` uppercase | lowercased ⇒ `documentation` |
| `100.64.0.0` vs `100.63.255.255` | boundary of `/10` — fixtures on both sides |
| `224.0.0.1` in a trace (IGMP leaking) | `multicast` ⇒ flagged unexpected, kept in the hop |
| `240.0.0.1`, `255.255.255.255` | `reserved` |
| v4 with leading zeros (`010.1.1.1`) | reject as malformed (ambiguous octal) ⇒ `reserved` |
| Empty reply ip (`''` from a timeout) | never classified: timeout replies carry no address |

## 4. Test strategy

- Table tests per class with boundary addresses on both sides of every CIDR
  edge (`classify.test.ts`, VOY-F-07).
- `inPrefix` across families, /0, /128, malformed cidr → false.
- Property **VOY-P-03** (`addr.property.test.ts`): generators produce a class
  range + random address inside it, in full/shorthand/mixed-case spellings;
  assert `classifyAddress === expected`. Fixed seed list in the header
  comment. This property is the VOY-P-04 gate's foundation.
- Round-trip: `parseAddress(normalized)` is idempotent.
- Determinism: classification order fixed; a test asserts `reserved` for a
  fuzzed invalid string corpus.
