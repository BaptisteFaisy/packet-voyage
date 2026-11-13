// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { checkVocabulary, redactJourney } from '@packet-voyage/core';
import { renderWithProviders } from '../test-utils.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { ExportPanel } from './ExportPanel.tsx';

function stubDownload() {
  const create = vi.fn(() => 'blob:mock');
  const revoke = vi.fn();
  vi.stubGlobal('URL', Object.assign(globalThis.URL, { createObjectURL: create, revokeObjectURL: revoke }));
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return { create, revoke, click };
}

describe('ExportPanel (VOY-F-40)', () => {
  it('downloads the GeoJSON and states what it contains', () => {
    const { click, revoke } = stubDownload();
    renderWithProviders(<ExportPanel journey={SAMPLE_JOURNEY} />);
    fireEvent.click(screen.getByTestId('export-geojson'));
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:mock');
    const counts = screen.getByTestId('export-geojson-counts').textContent ?? '';
    expect(counts).toMatch(/hop point/);
    expect(counts).toMatch(/not drawn and listed/);
    vi.unstubAllGlobals();
    click.mockRestore();
  });

  it('refuses the report on a raw journey, shows the preview, then redacts and downloads', async () => {
    const { click } = stubDownload();
    renderWithProviders(<ExportPanel journey={SAMPLE_JOURNEY} />);
    fireEvent.click(screen.getByTestId('export-report'));
    expect(click).not.toHaveBeenCalled();
    const gate = screen.getByTestId('export-redaction');
    expect(gate.textContent).toContain('must be redacted first');
    expect(gate.querySelectorAll('li').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId('export-report-redacted'));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
    click.mockRestore();
  });

  it('downloads the report directly once the journey is redacted', () => {
    const { click } = stubDownload();
    renderWithProviders(<ExportPanel journey={redactJourney(SAMPLE_JOURNEY, 'country')} />);
    fireEvent.click(screen.getByTestId('export-report'));
    expect(click).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('export-redaction')).toBeNull();
    vi.unstubAllGlobals();
    click.mockRestore();
  });

  it('stays inside the imposed vocabulary, in both languages', () => {
    for (const language of ['en', 'fr'] as const) {
      const { container } = renderWithProviders(<ExportPanel journey={SAMPLE_JOURNEY} />, { language });
      const text = container.textContent ?? '';
      expect(checkVocabulary(text).violations, text).toEqual([]);
    }
  });
});
