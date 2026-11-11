/**
 * Tokenizer for router host names (§7.5, VOY-F-15).
 *
 * Real-world names look like `ae3.par1.transit.example.net` or
 * `xe-0-1-0.lon4.core.example.com`: fragments are separated by dots, dashes
 * and underscores, and carry trailing digits (`par1`, `nyc2`, `lon4`) that
 * must be stripped before a table lookup.
 */

/** Characters that separate fragments of a router name. */
const SEPARATORS = /[.\-_]/;

/** Strips the trailing digits of a fragment: `par1` → `par`, `10g` stays `10g`. */
export function stripTrailingDigits(fragment: string): string {
  return fragment.replace(/\d+$/, '');
}

/**
 * Splits a router host name into comparable, lower-cased tokens: separators
 * are dots, dashes and underscores; trailing digits are removed from each
 * fragment. Fragment order is preserved, duplicates kept (the caller
 * deduplicates). Empty fragments (from `..` or `-`) are dropped.
 */
export function splitRouterName(hostName: string): string[] {
  const tokens: string[] = [];
  for (const fragment of hostName.split(SEPARATORS)) {
    const token = stripTrailingDigits(fragment.trim().toLowerCase());
    if (token.length > 0) tokens.push(token);
  }
  return tokens;
}
