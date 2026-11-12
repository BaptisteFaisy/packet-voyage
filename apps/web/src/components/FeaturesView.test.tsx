// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { loadGallery } from '../lib/gallery.ts';
import { FeaturesView } from './FeaturesView.tsx';

const items = loadGallery();

/** Every block the catalogue promises; the point of the page is that none is missing. */
const BLOCKS = [
  'map', 'timeline', 'hop', 'insights', 'roadmap', 'export', 'story',
  'compare', 'classroom', 'sources', 'paste', 'cli',
];

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
    expect(cli.textContent).toContain('packet-voyage trace');
    expect(cli.textContent).toContain('export');
    const text = screen.getByTestId('feature-cli').textContent ?? '';
    expect(text.toLowerCase()).toMatch(/never probes|ne sonde jamais/);
  });

  it('reads in French too', () => {
    renderWithProviders(<FeaturesView items={items} />, { language: 'fr' });
    expect(screen.getByTestId('features-view').textContent).toContain('Tout ce que sait faire');
  });
});
