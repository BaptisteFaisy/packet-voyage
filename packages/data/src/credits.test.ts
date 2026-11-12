import { describe, expect, it } from 'vitest';
import type { Provenance } from '@packet-voyage/schema';
import { DATASET_IDS } from './datasets.ts';
import { creditsFor, loadProvenance } from './load.ts';
import { PROVENANCE_ALIASES, creditsFromSheets, resolveProvenanceId } from './credits.ts';

function sheet(id: string, attribution: string): Provenance {
  return {
    id,
    title: id,
    origin: 'test',
    url: 'https://example.invalid/',
    licence: 'CC0-1.0',
    retrieved_at: '2026-11-11',
    attribution,
    features: 1,
    sha256: 'deadbeef',
  };
}

const SHEETS = [sheet('submarine-cables', '© OpenStreetMap contributors'), sheet('hints', 'Hints table')];

describe('creditsFromSheets', () => {
  it('VOY-F-48 returns the attributions of the sheets asked for, sorted and deduplicated', () => {
    // Sorted with `localeCompare`, which puts the copyright sign first.
    expect(creditsFromSheets(SHEETS, ['hints', 'submarine-cables', 'hints'])).toEqual([
      '© OpenStreetMap contributors',
      'Hints table',
    ]);
  });

  it('VOY-F-48 accepts a source alias in place of a dataset id', () => {
    expect(creditsFromSheets(SHEETS, ['osm-cables'])).toEqual(['© OpenStreetMap contributors']);
  });

  it('VOY-F-48 ignores an unknown id instead of throwing, and says nothing on empty sheets', () => {
    expect(creditsFromSheets(SHEETS, ['nope'])).toEqual([]);
    expect(creditsFromSheets([], ['hints'])).toEqual([]);
  });

  it('VOY-F-48 every alias resolves to a sheet id that exists', () => {
    const known = new Set(loadProvenance().map((entry) => entry.id));
    for (const alias of Object.keys(PROVENANCE_ALIASES)) {
      expect(resolveProvenanceId(alias, known), alias).not.toBeNull();
    }
  });
});

describe('creditsFor — the CLI path and the pure path agree', () => {
  it('VOY-F-48 creditsFor(ids) is creditsFromSheets(loadProvenance(), ids)', () => {
    const ids = [...DATASET_IDS];
    expect(creditsFor(ids)).toEqual(creditsFromSheets(loadProvenance(), ids));
    expect(creditsFor(ids).length).toBeGreaterThan(0);
  });
});
