// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { checkVocabulary, diffJourneys } from '@packet-voyage/core';
import { renderWithProviders } from '../test-utils.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { DiffPanel } from './DiffPanel.tsx';

/** A variant of the sample journey: same route, slower and longer. */
const VARIANT = {
  ...SAMPLE_JOURNEY,
  segments: SAMPLE_JOURNEY.segments.map((segment) => ({ ...segment, geodesic_km: segment.geodesic_km * 1.2 })),
  summary: {
    ...SAMPLE_JOURNEY.summary,
    distance_km_min: SAMPLE_JOURNEY.summary.distance_km_min * 1.2,
    rtt_ms: (SAMPLE_JOURNEY.summary.rtt_ms ?? 0) + 22.4,
  },
};

describe('DiffPanel (§8 P6, VOY-F-29)', () => {
  it('compares a journey with itself and finds no difference', () => {
    renderWithProviders(<DiffPanel a={SAMPLE_JOURNEY} b={SAMPLE_JOURNEY} />);
    const diff = diffJourneys(SAMPLE_JOURNEY, SAMPLE_JOURNEY);
    expect(diff.distance_km.delta).toBe(0);
    expect(diff.path_changed).toBe(false);
    expect(screen.getByTestId('diff-sentence').textContent).toContain(diff.sentence.en);
    expect(screen.getByTestId('diff-panel').textContent).toContain('Facts only');
  });

  it('reports the deltas of a different journey, bounded', () => {
    renderWithProviders(<DiffPanel a={SAMPLE_JOURNEY} b={VARIANT} />);
    const text = screen.getByTestId('diff-panel').textContent ?? '';
    expect(text).toMatch(/at least/);
    expect(checkVocabulary(text).violations, text).toEqual([]);
  });

  it('keeps the core sentence verbatim and stays honest in French too', () => {
    const diff = diffJourneys(SAMPLE_JOURNEY, VARIANT);
    for (const language of ['en', 'fr'] as const) {
      const { container } = renderWithProviders(<DiffPanel a={SAMPLE_JOURNEY} b={VARIANT} />, { language });
      const text = container.textContent ?? '';
      expect(text).toContain(diff.sentence[language]);
      expect(checkVocabulary(text).violations, text).toEqual([]);
    }
  });
});
