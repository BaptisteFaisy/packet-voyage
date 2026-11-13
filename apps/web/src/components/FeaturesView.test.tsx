// @vitest-environment jsdom
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { Journey } from '@packet-voyage/schema';
import { renderWithProviders } from '../test-utils.tsx';
import { loadGallery } from '../lib/gallery.ts';
import { useJourneyState } from '../state/journey.tsx';
import { FeaturesView } from './FeaturesView.tsx';

const items = loadGallery();

/** Every block the catalogue promises; the point of the page is that none is missing. */
const BLOCKS = [
  'map', 'timeline', 'hop', 'insights', 'roadmap', 'export', 'story',
  'compare', 'classroom', 'sources', 'paste', 'cli', 'limits',
];

/** A journey whose numbers are nothing like the gallery sample's. */
const CONTINENTAL = items.find((item) => item.slug === 'continental')?.journey as Journey;
const OCEAN_ITEM = items.find((item) => item.slug === 'ocean-crossing');
const OCEAN = OCEAN_ITEM?.journey as Journey;

/** Puts a journey in the shared state, the way pasting, importing or a link does. */
function WithLoadedJourney({ journey, children }: { journey: Journey; children: ReactNode }) {
  const { setJourney } = useJourneyState();
  useEffect(() => {
    setJourney(journey);
  }, [journey, setJourney]);
  return <>{children}</>;
}

/** The map of the catalogue's map block — the compare block draws one too. */
function mapLabel(): string {
  const canvas = screen
    .getByTestId('feature-map')
    .querySelector('[data-testid="world-map-canvas"]');
  return canvas?.getAttribute('aria-label') ?? '';
}

function timelineLabel(): string {
  const svg = screen.getByTestId('feature-timeline').querySelector('[data-testid="delay-timeline"]');
  return svg?.getAttribute('aria-label') ?? '';
}

function roadmapRowCount(): number {
  return screen.getByTestId('feature-roadmap').querySelectorAll('[data-testid^="roadmap-row-"]').length;
}

function expectEveryBlock(): void {
  for (const block of BLOCKS) {
    expect(screen.getByTestId(`feature-${block}`), `feature-${block}`).toBeTruthy();
  }
}

describe('FeaturesView — every capability is on one page', () => {
  it('shows a block for each capability of the product', () => {
    renderWithProviders(<FeaturesView items={items} />);
    for (const block of BLOCKS) {
      expect(screen.getByTestId(`feature-${block}`), `feature-${block}`).toBeTruthy();
    }
  });

  it('demonstrates the blocks on a real journey, not on a placeholder', () => {
    renderWithProviders(<FeaturesView items={items} />);
    expect(screen.getByTestId('feature-map').querySelector('[data-testid="world-map-canvas"]')).toBeTruthy();
    expect(screen.getByTestId('feature-timeline').querySelector('[data-testid="delay-timeline"]')).toBeTruthy();
    expect(screen.getByTestId('feature-roadmap').querySelector('[data-testid="roadmap-table"]')).toBeTruthy();
    expect(screen.getByTestId('feature-insights').querySelector('[data-testid="journey-insights"]')).toBeTruthy();
    expect(screen.getByTestId('feature-export').querySelector('[data-testid="export-panel"]')).toBeTruthy();
    expect(screen.getByTestId('feature-hop').querySelector('[data-testid="hop-city"]')).toBeTruthy();
  });

  it('links to the views that live on their own page', () => {
    renderWithProviders(<FeaturesView items={items} />);
    expect(screen.getByTestId('feature-open-classroom').getAttribute('href')).toBe('#/classroom');
    expect(screen.getByTestId('feature-open-sources').getAttribute('href')).toBe('#/sources');
    expect(screen.getByTestId('feature-open-paste').getAttribute('href')).toBe('#/');
  });

  it('gives the command line for tracing your own route, and never claims to probe', () => {
    renderWithProviders(<FeaturesView items={items} />);
    const cli = screen.getByTestId('cli-commands');
    expect(cli.textContent).toContain('pnpm voyage trace');
    expect(cli.textContent).toContain('export');
    const text = screen.getByTestId('feature-cli').textContent ?? '';
    expect(text.toLowerCase()).toMatch(/never probes|ne sonde jamais/);
  });

  it('shows the image export and says what the site deliberately cannot do', () => {
    renderWithProviders(<FeaturesView items={items} />);
    expect(screen.getByTestId('feature-export').querySelector('[data-testid="export-image-button"]')).toBeTruthy();
    const limits = screen.getByTestId('feature-limits-list');
    expect(limits.querySelectorAll('li').length).toBe(4);
    expect(limits.textContent).toMatch(/sends nothing|n\u2019envoie rien/);
    expect(screen.getByTestId('cli-commands').textContent).toContain('pnpm voyage mcp');
  });

  it('reads in French too', () => {
    renderWithProviders(<FeaturesView items={items} />, { language: 'fr' });
    expect(screen.getByTestId('features-view').textContent).toContain('Tout ce que sait faire');
  });
});

describe('FeaturesView — the command line it shows is a command that exists', () => {
  it('never advertises a command that does not exist: npx is not published yet', () => {
    renderWithProviders(<FeaturesView items={items} />);
    const cli = screen.getByTestId('cli-commands');
    const copied = Array.from(cli.querySelectorAll('code')).map((c) => c.textContent ?? '');
    expect(copied.length).toBeGreaterThan(0);
    for (const command of copied) {
      expect(command, command).not.toMatch(/^npx /);
    }
    expect(cli.textContent).toMatch(/not published|n'est pas encore publié/);
  });

  it('reads in French too', () => {
    renderWithProviders(<FeaturesView items={items} />, { language: 'fr' });
    const cli = screen.getByTestId('cli-commands');
    expect(cli.textContent).toMatch(/pas encore publié/);
    expect(Array.from(cli.querySelectorAll('code')).every((c) => !(c.textContent ?? '').startsWith('npx '))).toBe(true);
  });
});

describe('FeaturesView — on the journey you loaded, not on the sample', () => {
  it('shows the loaded journey’s own numbers on the map, the timeline and the table', async () => {
    renderWithProviders(
      <WithLoadedJourney journey={CONTINENTAL}>
        <FeaturesView items={items} />
      </WithLoadedJourney>,
    );

    await waitFor(() => expect(mapLabel()).toContain('793'));
    expect(mapLabel()).not.toContain('6656');
    expect(timelineLabel()).toContain('6.1 ms');
    expect(timelineLabel()).not.toContain('83.6 ms');
    expect(roadmapRowCount()).toBe(CONTINENTAL.hops.length + CONTINENTAL.segments.length);
    expect(roadmapRowCount()).not.toBe(OCEAN.hops.length + OCEAN.segments.length);
    expectEveryBlock();
  });

  it('names the data on screen, and offers the way back to the gallery demo', async () => {
    renderWithProviders(
      <WithLoadedJourney journey={CONTINENTAL}>
        <FeaturesView items={items} />
      </WithLoadedJourney>,
    );

    await waitFor(() => expect(screen.getByTestId('feature-source-label').textContent).toContain('Your data'));
    expect(screen.getByTestId('feature-source-label').textContent).toContain(CONTINENTAL.target.host);

    fireEvent.click(screen.getByTestId('feature-source-switch'));
    expect(screen.getByTestId('feature-source-label').textContent).toContain('Gallery journey');
    expect(screen.getByTestId('feature-source-label').textContent).toContain(OCEAN_ITEM?.en ?? '');
    await waitFor(() => expect(mapLabel()).toContain('6656'));
    expectEveryBlock();

    fireEvent.click(screen.getByTestId('feature-source-switch'));
    await waitFor(() => expect(screen.getByTestId('feature-source-label').textContent).toContain('Your data'));
    await waitFor(() => expect(mapLabel()).toContain('793'));
    expectEveryBlock();
  });

  it('reads in French too, on your own journey', async () => {
    renderWithProviders(
      <WithLoadedJourney journey={CONTINENTAL}>
        <FeaturesView items={items} />
      </WithLoadedJourney>,
      { language: 'fr' },
    );
    await waitFor(() => expect(screen.getByTestId('feature-source-label').textContent).toContain('Vos données'));
    expect(screen.getByTestId('feature-source-switch').textContent).toContain('démo de la galerie');
  });
});

describe('FeaturesView — with no journey loaded, the gallery demo as before', () => {
  it('demonstrates the sample journey, names it, and offers no switch', async () => {
    renderWithProviders(<FeaturesView items={items} />);
    await waitFor(() => expect(mapLabel()).toContain('6656'));
    expect(screen.getByTestId('feature-source-label').textContent).toContain('Gallery journey');
    expect(screen.getByTestId('feature-source-label').textContent).toContain(OCEAN_ITEM?.en ?? '');
    expect(screen.queryByTestId('feature-source-switch')).toBeNull();
    expect(timelineLabel()).toContain('83.6 ms');
    expect(roadmapRowCount()).toBe(OCEAN.hops.length + OCEAN.segments.length);
    expectEveryBlock();
  });
});

describe('FeaturesView — each block carries the figures it computed', () => {
  const PROOF_BLOCKS = ['map', 'timeline', 'hop', 'insights', 'roadmap', 'export', 'story', 'compare'];

  it('VOY-F-30 every block that computes something shows its proof', async () => {
    renderWithProviders(<FeaturesView items={items} />);
    await waitFor(() => expect(screen.getByTestId('feature-proof-map')).toBeTruthy());
    for (const block of PROOF_BLOCKS) {
      expect(screen.getByTestId(`feature-proof-${block}`), block).toBeTruthy();
    }
  });

  it('the proof shows the figures of the journey on screen, not of the sample', async () => {
    renderWithProviders(
      <WithLoadedJourney journey={CONTINENTAL}>
        <FeaturesView items={items} />
      </WithLoadedJourney>,
    );
    await waitFor(() => expect(screen.getByTestId('feature-proof-map')).toBeTruthy());
    const map = screen.getByTestId('feature-proof-map').textContent ?? '';
    expect(map).toContain('793 km');
    expect(map).toContain('5 / 6');
    expect(map).not.toContain('6,657');
  });

  it('VOY-F-30 the same figure reads the same in every block that shows it', async () => {
    renderWithProviders(<FeaturesView items={items} />);
    await waitFor(() => expect(screen.getByTestId('feature-proof-map')).toBeTruthy());
    const map = screen.getByTestId('feature-proof-map').textContent ?? '';
    const exportProof = screen.getByTestId('feature-proof-export').textContent ?? '';
    const distanceIn = (text: string) => text.match(/at least [\d,]+ km/)?.[0] ?? null;
    expect(distanceIn(map)).toBeTruthy();
    expect(distanceIn(exportProof)).toBe(distanceIn(map));
    expect(screen.getByTestId('chain-verdict').textContent).toContain('the blocks agree');
  });

  it('VOY-F-48 names the datasets the figures come from, read from the bundle', async () => {
    renderWithProviders(<FeaturesView items={items} />);
    await waitFor(() => expect(screen.getByTestId('feature-provenance')).toBeTruthy());
    const text = screen.getByTestId('feature-provenance').textContent ?? '';
    expect(text).toContain('Submarine telecommunication cables');
    expect(text).toContain('never fetched');
  });
});
