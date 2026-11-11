// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { SourcesView } from './SourcesView.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { provenanceRows, STALE_DAYS } from '../lib/provenance.ts';
import type { Provenance } from '@packet-voyage/schema';
import { EN_KEYS } from '../i18n/en.ts';
import { FR_KEYS } from '../i18n/fr.ts';

const SHEET: Provenance = {
  id: 'submarine-cables',
  title: 'Submarine telecommunication cables',
  origin: 'OpenStreetMap contributors',
  url: 'https://www.openstreetmap.org/copyright',
  licence: 'ODbL-1.0',
  retrieved_at: '2026-11-01',
  attribution: '© OpenStreetMap contributors',
  features: 424,
  sha256: 'deadbeef',
};

describe('SourcesView (VOY-F-48, VOY-N-11)', () => {
  it('VOY-F-48 shows the journey credits at the foot of the site', async () => {
    renderWithProviders(<SourcesView journey={SAMPLE_JOURNEY} />);
    const credits = await screen.findByTestId('journey-credits');
    expect(credits.textContent).toContain('© OpenStreetMap contributors');
    expect(credits.textContent).toContain('Natural Earth');
  });

  it('VOY-F-48 renders the provenance sheets, or says they are pending — never invents any', async () => {
    renderWithProviders(<SourcesView journey={SAMPLE_JOURNEY} />);
    await waitFor(() => {
      const table = screen.queryByTestId('provenance-table');
      const notice = screen.queryByTestId('sources-not-built');
      expect(table !== null || notice?.textContent?.toLowerCase().includes('provenance') === true).toBe(true);
    });
    const table = screen.queryByTestId('provenance-table');
    if (table) {
      // The sheets come from packages/data/provenance with their dates.
      expect(screen.queryByTestId('provenance-submarine-cables')).toBeTruthy();
      expect(table.textContent).toMatch(/20\d\d/);
    }
    expect(screen.getByTestId('sources-zero-network').textContent).toContain('zero');
  });

  it('VOY-N-11 a sheet older than 90 days is flagged stale', () => {
    const now = Date.parse('2026-11-01T00:00:00Z') + (STALE_DAYS + 2) * 86_400_000;
    const rows = provenanceRows([SHEET], now);
    expect(rows.length).toBe(1);
    expect(rows[0]?.stale).toBe(true);
    const fresh = provenanceRows([SHEET], Date.parse('2026-11-10T00:00:00Z'));
    expect(fresh[0]?.stale).toBe(false);
  });

  it('VOY-N-11 the stale warning over 90 days is worded in both languages', () => {
    expect(EN_KEYS['sources.staleWarning']).toContain('90');
    expect(FR_KEYS['sources.staleWarning']).toContain('90');
  });
});
