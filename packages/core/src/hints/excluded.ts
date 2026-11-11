/**
 * Fragments of router names that look like city codes but never are (§7.5).
 *
 * Operators love three-letter abbreviations: `gig` is the Rio airport code and
 * a common interface prefix, `eth` an Ethernet marker, `net` a domain suffix.
 * Any token matching this list is dropped before table lookup, which removes
 * most false friends. Everything lives lower-case; tokens are lower-cased by
 * `splitRouterName` before comparison.
 */
export const EXCLUDED_TOKENS: readonly string[] = [
  'gig',
  'eth',
  'net',
  'cdn',
  'agg',
  'rtr',
  'nat',
  'core',
  'edge',
  'border',
  'peer',
  'transit',
  'host',
  'vlan',
  'ten',
  'pop',
  'gw',
  'isp',
] as const;
