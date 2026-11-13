/**
 * Provenance presentation helpers for SourcesView (VOY-F-48, VOY-N-11).
 * Pure logic, no React (§5.9).
 */
import type { Provenance } from '@packet-voyage/schema';

export const STALE_DAYS = 90;

export interface ProvenanceRow {
  id: string;
  title: string;
  origin: string;
  url: string;
  licence: string;
  retrievedAt: string;
  attribution: string;
  features: number;
  stale: boolean;
  ageDays: number;
}

/** Build display rows; `nowMs` is injected (no clock in pure logic). */
export function provenanceRows(sheets: Provenance[], nowMs: number): ProvenanceRow[] {
  return sheets
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((sheet) => {
      const retrieved = Date.parse(sheet.retrieved_at);
      const ageDays = Number.isNaN(retrieved)
        ? 0
        : Math.max(0, Math.floor((nowMs - retrieved) / 86_400_000));
      return {
        id: sheet.id,
        title: sheet.title,
        origin: sheet.origin,
        url: sheet.url,
        licence: sheet.licence,
        retrievedAt: sheet.retrieved_at,
        attribution: sheet.attribution,
        features: sheet.features,
        stale: !Number.isNaN(retrieved) && ageDays > STALE_DAYS,
        ageDays,
      };
    });
}

/** Fallback sheet describing the bundled sample while L7 is pending. */
export function placeholderProvenance(): Provenance[] {
  return [];
}
