// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { Hop } from '@packet-voyage/schema';
import { renderWithProviders } from '../test-utils.tsx';
import { HopCard } from './HopCard.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';

function hopAt(index: number): Hop {
  const hop = SAMPLE_JOURNEY.hops[index];
  if (!hop) throw new Error(`fixture has no hop at index ${index}`);
  return hop;
}

describe('HopCard', () => {
  it('VOY-F-32 shows the rejection with its reason and numbers (§7.14 hop 4)', () => {
    renderWithProviders(<HopCard hop={hopAt(3)} />);
    const rejection = screen.getByTestId('rejection-Ashburn');
    expect(rejection.textContent).toContain(
      'Ashburn, US — rejected by light: 9.6 ms allows 1,439 km at most; 6,496 km needed',
    );
    // The rejected location is struck through, as an undone stitch (§12.3).
    expect(rejection.querySelector('s')).toBeTruthy();
    expect(rejection.textContent).toContain('light');
  });

  it('VOY-F-32 separates what is measured from what is inferred', () => {
    renderWithProviders(<HopCard hop={hopAt(3)} />);
    expect(screen.getByText('measured')).toBeTruthy();
    expect(screen.getAllByText('inferred').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('198.51.100.9')).toBeTruthy();
    expect(screen.getByText('AS64500 — Transit Example')).toBeTruthy();
    expect(screen.getByText('Example-IX Paris')).toBeTruthy();
  });

  it('VOY-F-32 shows the retained location with its level and sources', () => {
    renderWithProviders(<HopCard hop={hopAt(3)} />);
    const city = screen.getByTestId('hop-city');
    expect(city.textContent).toContain('Paris, FR');
    expect(city.textContent).toContain('solid');
    const sources = screen.getByTestId('hop-sources');
    expect(sources.textContent).toContain('ixp-prefix');
    expect(sources.textContent).toContain('name-hint');
  });

  it('VOY-F-32 an unlocated hop says "not located" and invents nothing', () => {
    renderWithProviders(<HopCard hop={hopAt(1)} />);
    expect(screen.getByTestId('hop-not-located').textContent).toBe('Not located');
  });
});
