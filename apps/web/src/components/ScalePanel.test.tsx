// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { checkVocabulary } from '@packet-voyage/core';
import { renderWithProviders } from '../test-utils.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { ScalePanel } from './ScalePanel.tsx';

describe('ScalePanel — the journey in everyday scale', () => {
  it('shows the light gauge, the laps of the Earth and the Paris–Marseille count', () => {
    renderWithProviders(<ScalePanel journey={SAMPLE_JOURNEY} />);
    expect(screen.getByTestId('scale-panel').textContent).toContain('299.79 km/ms');
    expect(Number(screen.getByTestId('scale-laps').textContent)).toBeGreaterThan(0);
    expect(Number(screen.getByTestId('scale-trips').textContent)).toBeGreaterThan(0);
  });

  it('never states a travelled distance without its bound', () => {
    for (const language of ['en', 'fr'] as const) {
      const { container } = renderWithProviders(<ScalePanel journey={SAMPLE_JOURNEY} />, { language });
      const text = container.textContent ?? '';
      expect(checkVocabulary(text).violations, text).toEqual([]);
    }
  });

  it('reads in French too', () => {
    renderWithProviders(<ScalePanel journey={SAMPLE_JOURNEY} />, { language: 'fr' });
    expect(screen.getByTestId('scale-panel').textContent).toContain('échelle humaine');
  });
});
