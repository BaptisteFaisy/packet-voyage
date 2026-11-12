// @vitest-environment jsdom
/**
 * Importing a journey.json (§12.2): the file written by the command line opens
 * in the site, and a file that is not a journey says exactly what the schema
 * rejects. Nothing is uploaded — the File API is the only door.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { Journey } from '@packet-voyage/schema';
import { parseJourney } from '@packet-voyage/schema';
import oceanCrossing from '../../../../gallery/ocean-crossing/journey.json';
import { loadGallery } from '../lib/gallery.ts';
import { renderWithProviders } from '../test-utils.tsx';
import { HomeView } from './HomeView.tsx';
import { ImportJourney } from './ImportJourney.tsx';

/** The gallery file, as the CLI would have written it to disk. */
const OCEAN_JOURNEY = parseJourney(JSON.stringify(oceanCrossing));
const OCEAN_TEXT = JSON.stringify(oceanCrossing, null, 2);

function fileNamed(name: string, text: string): File {
  return new File([text], name, { type: 'application/json' });
}

function pickFile(file: File): void {
  fireEvent.change(screen.getByTestId('import-input'), { target: { files: [file] } });
}

afterEach(() => {
  window.location.hash = '#/';
});

describe('ImportJourney — a journey.json opens', () => {
  it('reads the gallery ocean-crossing file and hands over every hop', async () => {
    const onImported = vi.fn<(journey: Journey, name: string) => void>();
    renderWithProviders(<ImportJourney onImported={onImported} />);
    pickFile(fileNamed('journey.json', OCEAN_TEXT));

    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1));
    const [journey, name] = onImported.mock.calls[0] as [Journey, string];
    expect(name).toBe('journey.json');
    expect(journey.hops.length).toBe(OCEAN_JOURNEY.hops.length);
    expect(journey.hops.length).toBe(10);
    expect(journey.target.host).toBe(OCEAN_JOURNEY.target.host);
    expect(journey.summary.distance_km_min).toBe(OCEAN_JOURNEY.summary.distance_km_min);
    expect(screen.queryByTestId('import-error')).toBeNull();
  });

  it('accepts a dropped file as well as a picked one', async () => {
    const onImported = vi.fn<(journey: Journey, name: string) => void>();
    renderWithProviders(<ImportJourney onImported={onImported} />);
    fireEvent.drop(screen.getByTestId('import-dropzone'), {
      dataTransfer: { files: [fileNamed('ocean.json', OCEAN_TEXT)] },
    });

    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1));
    expect((onImported.mock.calls[0] as [Journey, string])[1]).toBe('ocean.json');
  });

  it('HomeView puts the import next to the paste zone and opens the journey', async () => {
    renderWithProviders(<HomeView items={loadGallery()} fromGallery />);
    expect(screen.getByTestId('paste-trace')).toBeTruthy();
    expect(screen.getByTestId('import-journey')).toBeTruthy();

    pickFile(fileNamed('journey.json', OCEAN_TEXT));
    await waitFor(() => expect(window.location.hash).toBe('#/journey/imported'));
    expect(screen.queryByTestId('import-error')).toBeNull();
  });
});

describe('ImportJourney — a file that is not a journey says why', () => {
  it('lists what the schema rejects for a JSON that is not a journey', async () => {
    const onImported = vi.fn<(journey: Journey, name: string) => void>();
    renderWithProviders(<ImportJourney onImported={onImported} />);
    pickFile(fileNamed('not-a-journey.json', '{"hello":"world","hops":3}'));

    const error = await screen.findByTestId('import-error');
    expect(error.textContent).toContain('not a journey');
    const issues = screen.getByTestId('import-issues');
    expect(issues.querySelectorAll('li').length).toBeGreaterThan(0);
    expect(issues.textContent).toContain('version');
    expect(issues.textContent).toContain('hops');
    expect(onImported).not.toHaveBeenCalled();
  });

  it('says so plainly when the file is not JSON at all', async () => {
    const onImported = vi.fn<(journey: Journey, name: string) => void>();
    renderWithProviders(<ImportJourney onImported={onImported} />);
    pickFile(fileNamed('trace.txt', 'traceroute to www.example.org (203.0.113.80)\n 1  gw  1.2 ms'));

    const error = await screen.findByTestId('import-error');
    expect(error.textContent).toContain('not readable JSON');
    expect(onImported).not.toHaveBeenCalled();
  });

  it('says the file stays on this machine, in both languages', () => {
    const onImported = vi.fn<(journey: Journey, name: string) => void>();
    renderWithProviders(<ImportJourney onImported={onImported} />);
    expect(screen.getByTestId('import-privacy').textContent).toContain('never uploaded');
    expect(screen.getByTestId('import-privacy').textContent).toContain('no network request');

    renderWithProviders(<ImportJourney onImported={onImported} />, { language: 'fr' });
    const notices = screen.getAllByTestId('import-privacy');
    expect(notices[notices.length - 1]?.textContent).toContain('jamais téléversé');
    expect(notices[notices.length - 1]?.textContent).toContain('aucune requête réseau');
  });
});
