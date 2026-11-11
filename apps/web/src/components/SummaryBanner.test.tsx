// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { SummaryBanner } from './SummaryBanner.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';

describe('SummaryBanner', () => {
  it('VOY-F-26 shows the summary numbers of the fixture', () => {
    renderWithProviders(<SummaryBanner journey={SAMPLE_JOURNEY} />);
    const distance = screen.getByTestId('summary-distance');
    expect(distance.textContent).toContain('at least');
    expect(distance.textContent).toContain('6,655');
    expect(distance.textContent).toContain('km');
    expect(screen.getByTestId('summary-rtt').textContent).toContain('91.7 ms');
    expect(screen.getByTestId('summary-light-floor').textContent).toContain('63.6 ms');
    expect(screen.getByTestId('summary-inflation').textContent).toContain('1.44');
  });

  it('VOY-F-27 shows countries, networks, IXPs, rejections and gaps', () => {
    renderWithProviders(<SummaryBanner journey={SAMPLE_JOURNEY} />);
    const countries = screen.getByTestId('summary-countries').textContent ?? '';
    expect(countries).toContain('3');
    expect(countries).toContain('FR');
    expect(countries).toContain('GB');
    expect(countries).toContain('US');
    expect(screen.getByTestId('summary-networks').textContent).toContain('3');
    expect(screen.getByTestId('summary-ixps').textContent).toContain('1');
    expect(screen.getByTestId('summary-rejections').textContent).toContain('1');
    expect(screen.getByTestId('summary-gaps').textContent).toContain('0');
  });
});
