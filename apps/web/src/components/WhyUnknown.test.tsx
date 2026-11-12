// @vitest-environment jsdom
/**
 * The "why we cannot know more" band: which lines it chooses per certainty
 * level, and where `HopCard` mounts it (§7.6, §5.4).
 */
import { describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { checkVocabulary } from '@packet-voyage/core';
import type { Hop } from '@packet-voyage/schema';
import { renderWithProviders } from '../test-utils.tsx';
import { EN_KEYS } from '../i18n/en.ts';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { WhyUnknown } from './WhyUnknown.tsx';
import type { WhyUnknownProps } from './WhyUnknown.tsx';
import { HopCard } from './HopCard.tsx';

function hopAt(index: number): Hop {
  const hop = SAMPLE_JOURNEY.hops[index];
  if (!hop) throw new Error(`fixture has no hop at index ${index}`);
  return hop;
}

/** The rendered lines of the band, in order. */
function bandLines(testId = 'why-band'): string[] {
  const band = screen.getByTestId(testId);
  return Array.from(band.querySelectorAll('.why-unknown-line')).map((line) => line.textContent ?? '');
}

function renderBand(props: WhyUnknownProps, language: 'en' | 'fr' = 'en') {
  return renderWithProviders(<WhyUnknown testId="why-band" {...props} />, { language });
}

describe('WhyUnknown on an assumed value', () => {
  it('lists the three blockers of an assumed place', () => {
    renderBand({ certainty: 'assumed', city: 'Paris', sources: ['name-hint'] });
    expect(screen.getByTestId('why-band').textContent).toContain(EN_KEYS['why.title']);
    expect(bandLines()).toEqual([
      EN_KEYS['why.assumed.path'],
      EN_KEYS['why.assumed.cables'],
      EN_KEYS['why.assumed.distance'],
    ]);
  });

  it('lists the same three blockers for a value that names no place', () => {
    renderBand({ certainty: 'assumed', sources: ['name-hint'] });
    expect(bandLines()).toEqual([
      EN_KEYS['why.assumed.path'],
      EN_KEYS['why.assumed.cables'],
      EN_KEYS['why.assumed.distance'],
    ]);
  });

  it('adds "no source placed this hop" when nothing carried the place', () => {
    renderBand({ certainty: 'assumed', city: 'Paris' });
    expect(bandLines()).toHaveLength(4);
    expect(bandLines()).toContain(EN_KEYS['why.unlocated']);
  });

  it('says only that, when the caller says no source placed the hop', () => {
    renderBand({ certainty: 'assumed', unlocated: true });
    expect(bandLines()).toEqual([EN_KEYS['why.unlocated']]);
  });

  it('lists the caller blockers verbatim, after the shared ones', () => {
    renderBand({
      certainty: 'assumed',
      city: 'Paris',
      sources: ['name-hint'],
      blockers: ['no IP map'],
    });
    expect(bandLines().at(-1)).toBe('no IP map');
  });
});

describe('WhyUnknown on an inferred or measured value', () => {
  it('names the sources of an inferred city', () => {
    renderBand({ certainty: 'inferred', city: 'London', sources: ['name-hint', 'ipmap-latency'] });
    expect(bandLines()).toEqual([
      EN_KEYS['why.inferred.city'].replace('{sources}', 'name-hint, ipmap-latency'),
    ]);
  });

  it('falls back to "nothing explains this value" when an inference has no source', () => {
    renderBand({ certainty: 'inferred' });
    expect(bandLines()).toEqual([EN_KEYS['why.unknown']]);
  });

  it('renders nothing for a measured value: nothing blocks it', () => {
    const { container } = renderBand({ certainty: 'measured', sources: ['probe'] });
    expect(container.textContent).toBe('');
    expect(screen.queryByTestId('why-band')).toBeNull();
  });
});

describe('WhyUnknown in the reader language', () => {
  it('speaks French when the reader does', () => {
    renderBand({ certainty: 'assumed', city: 'Paris', sources: ['name-hint'] }, 'fr');
    expect(screen.getByTestId('why-band').textContent).toContain(
      'Pourquoi on ne peut pas en savoir plus',
    );
    expect(bandLines()).toContain(
      'Un câble est plus long que la ligne droite : seule une borne basse est mesurable.',
    );
  });

  it('keeps the rendered text honest in both languages (§5.4)', () => {
    for (const language of ['en', 'fr'] as const) {
      const { container } = renderBand(
        { certainty: 'assumed', city: 'Paris', sources: ['name-hint'] },
        language,
      );
      const report = checkVocabulary(container.textContent ?? '');
      expect(report.violations).toEqual([]);
      cleanup();
    }
  });
});

describe('WhyUnknown in the hop card', () => {
  it('explains the rejected candidate and names the source that proposed it', () => {
    renderWithProviders(<HopCard hop={hopAt(3)} />);
    const band = screen.getByTestId('why-unknown-Ashburn');
    expect(band.textContent).toContain('The city comes from geodb');
    expect(band.textContent).toContain('the light bound only rules out the impossible');
  });

  it('explains a hop no source placed, without inventing a city', () => {
    renderWithProviders(<HopCard hop={hopAt(1)} />);
    expect(screen.getByTestId('why-unknown-unlocated').textContent).toContain(
      EN_KEYS['why.unlocated'],
    );
  });

  it('explains an assumed location with the three blockers', () => {
    const location = hopAt(3).location;
    if (!location) throw new Error('fixture hop has no location');
    const assumed: Hop = { ...hopAt(3), location: { ...location, level: 'uncertain' } };
    renderWithProviders(<HopCard hop={assumed} />);
    const band = screen.getByTestId('why-unknown-Paris');
    expect(band.textContent).toContain('great-circle assumption');
    expect(band.textContent).toContain('only a lower bound is measurable');
  });

  it('stays quiet for a solid location: nothing is assumed there', () => {
    renderWithProviders(<HopCard hop={hopAt(3)} />);
    expect(screen.queryByTestId('why-unknown-Paris')).toBeNull();
  });

  it('keeps the whole hop card honest in French too (§5.4)', () => {
    const { container } = renderWithProviders(<HopCard hop={hopAt(3)} />, { language: 'fr' });
    const report = checkVocabulary(container.textContent ?? '');
    expect(report.violations).toEqual([]);
  });
});
