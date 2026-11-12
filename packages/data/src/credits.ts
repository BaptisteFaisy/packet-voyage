/**
 * credits.ts — attribution lines, computed from provenance sheets alone.
 *
 * Pure on purpose, and free of any dataset import: the CLI reaches it through
 * `creditsFor` (which loads the sheets from the bundled JSON) and the site
 * reaches it with the sheets it already lazy-loads, so both produce exactly the
 * same credits. One implementation, two callers — the alternative was the site
 * re-deriving them, which is how a pasted trace ended up with no credits at all.
 */
import type { Provenance } from '@packet-voyage/schema';

/**
 * Alias map: the `source` ids used inside the datasets (CONTRACTS §2/§3, e.g.
 * `CableMatch.source: 'osm-cables'`) resolve to provenance sheet ids here, so
 * both vocabularies are accepted.
 */
export const PROVENANCE_ALIASES: Record<string, string> = {
  'osm-cables': 'submarine-cables',
  'curated-sample': 'submarine-cables',
  'natural-earth': 'landmasses',
  'natural-earth-110m': 'landmasses',
  'hand-curated': 'hints',
};

/** Resolve a dataset id or a source alias against the sheets actually present. */
export function resolveProvenanceId(id: string, known: ReadonlySet<string>): string | null {
  if (known.has(id)) return id;
  const alias = PROVENANCE_ALIASES[id];
  return alias !== undefined && known.has(alias) ? alias : null;
}

/**
 * Attribution strings for the given dataset ids (or source aliases). Duplicates
 * collapse; unknown ids are ignored — credits degrade gracefully in the UI
 * rather than crash a journey page (VOY-F-48).
 */
export function creditsFromSheets(sheets: Provenance[], ids: string[]): string[] {
  const byId = new Map(sheets.map((sheet) => [sheet.id, sheet]));
  const known = new Set(byId.keys());
  const credits = new Set<string>();
  for (const id of ids) {
    const resolved = resolveProvenanceId(id, known);
    const sheet = resolved ? byId.get(resolved) : undefined;
    if (sheet) credits.add(sheet.attribution);
  }
  return [...credits].sort((a, b) => a.localeCompare(b));
}
