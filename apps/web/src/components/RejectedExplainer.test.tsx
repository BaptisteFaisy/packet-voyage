// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { checkVocabulary } from '@packet-voyage/core';
import type { Rejection } from '@packet-voyage/schema';
import { renderWithProviders } from '../test-utils.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { RejectedExplainer } from './RejectedExplainer.tsx';

const hopWithRejection = SAMPLE_JOURNEY.hops.find((hop) => (hop.location?.rejected.length ?? 0) > 0);
const rejection = hopWithRejection?.location?.rejected[0] as Rejection;
const envelope = hopWithRejection?.envelope_ms ?? null;

describe('RejectedExplainer (§7.6, VOY-F-32)', () => {
  it('shows the three steps: the measurement, the bound, the verdict', () => {
    renderWithProviders(<RejectedExplainer rejection={rejection} envelopeMs={envelope} />);
    expect(screen.getByTestId('rejected-step-measured').textContent).toMatch(/ms/);
    const bound = screen.getByTestId('rejected-step-bound').textContent ?? '';
    expect(bound).toMatch(/km/);
    expect(bound).toMatch(/at most/);
    const verdict = screen.getByTestId('rejected-step-verdict').textContent ?? '';
    expect(verdict).toContain(rejection.city);
    expect(verdict).toMatch(/at least/);
    expect(verdict).toMatch(/times too far/);
  });

  it('strikes the rejected place through, as an undone stitch (§12.3)', () => {
    const { container } = renderWithProviders(<RejectedExplainer rejection={rejection} envelopeMs={envelope} />);
    const struck = container.querySelector('s');
    expect(struck?.textContent).toContain(rejection.city);
  });

  it('labels each step with its certainty level', () => {
    renderWithProviders(<RejectedExplainer rejection={rejection} envelopeMs={envelope} />);
    expect(screen.getByTestId('rejected-step-measured').textContent).toContain('measured');
    expect(screen.getByTestId('rejected-step-bound').textContent).toContain('inferred');
  });

  it('stays inside the imposed vocabulary, in both languages', () => {
    for (const language of ['en', 'fr'] as const) {
      const { container } = renderWithProviders(<RejectedExplainer rejection={rejection} envelopeMs={envelope} />, {
        language,
      });
      const text = container.textContent ?? '';
      expect(checkVocabulary(text).violations, text).toEqual([]);
    }
  });

  it('survives a missing envelope without inventing a number', () => {
    renderWithProviders(<RejectedExplainer rejection={rejection} envelopeMs={null} />);
    expect(screen.getByTestId('rejected-step-measured').textContent).toContain('—');
  });
});
