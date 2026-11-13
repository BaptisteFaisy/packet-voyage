// @vitest-environment jsdom
/**
 * VOY-N-04: the vocabulary of every rendered string is checked with
 * `checkVocabulary` from `@packet-voyage/core` when the story module is
 * written; until then the test skips with a clear message and a local
 * mirror of the forbidden patterns (§5.4) keeps guarding the UI.
 */
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { renderWithProviders, setStoredPreferences } from '../test-utils.tsx';
import { checkVocabularyLocal, loadVocabularyChecker } from '../lib/vocabulary.ts';
import { SummaryBanner } from './SummaryBanner.tsx';
import { HopCard } from './HopCard.tsx';
import { CrossingCard } from './CrossingCard.tsx';
import { RoadmapTable } from './RoadmapTable.tsx';
import { GalleryView } from './GalleryView.tsx';
import { ClassroomView } from './ClassroomView.tsx';
import { StoryView } from './StoryView.tsx';
import { PassportView } from './PassportView.tsx';
import { loadGallery } from '../lib/gallery.ts';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import type { Journey } from '@packet-voyage/schema';

function renderedTexts(languages: ('en' | 'fr')[]): string[] {
  const texts: string[] = [];
  const hop4 = SAMPLE_JOURNEY.hops[3];
  const atlantic = SAMPLE_JOURNEY.segments.find((seg) => seg.from_ttl === 6 && seg.to_ttl === 7);
  for (const language of languages) {
    const pieces: (string | null)[] = [];
    const renderOne = (ui: ReactElement) => {
      const { container } = renderWithProviders(ui, { language });
      pieces.push(container.textContent);
      cleanup();
    };
    renderOne(<SummaryBanner journey={SAMPLE_JOURNEY} />);
    if (hop4) renderOne(<HopCard hop={hop4} />);
    if (atlantic) renderOne(<CrossingCard journey={SAMPLE_JOURNEY} segment={atlantic} />);
    renderOne(<RoadmapTable journey={SAMPLE_JOURNEY} />);
    renderOne(<GalleryView items={loadGallery()} fromGallery={false} onOpen={() => {}} />);
    renderOne(<ClassroomView />);
    renderOne(<StoryView journey={SAMPLE_JOURNEY} />);
    renderOne(<PassportView journey={SAMPLE_JOURNEY} />);
    for (const piece of pieces) {
      if (piece && piece.trim() !== '') texts.push(piece);
    }
  }
  return texts;
}

describe('vocabulary of rendered strings (VOY-N-04, §5.4)', () => {
  it('VOY-N-04 passes checkVocabulary from @packet-voyage/core when available', async (ctx) => {
    const { checker, fromCore } = await loadVocabularyChecker();
    if (!fromCore) {
            console.info(
        'SKIPPED: checkVocabulary is not exported by @packet-voyage/core yet (L5 story module pending).',
      );
      ctx.skip();
      return;
    }
    setStoredPreferences({ animations: false });
    for (const text of renderedTexts(['en', 'fr'])) {
      const result = checker(text);
      expect(result.ok, result.violations.join('; ')).toBe(true);
    }
  });

  it('VOY-N-04 passes the local mirror of the forbidden patterns meanwhile', () => {
    setStoredPreferences({ animations: false });
    const texts = renderedTexts(['en', 'fr']);
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      const result = checkVocabularyLocal(text);
      expect(result.violations).toEqual([]);
    }
  });

  it('VOY-N-04 travelled distances are always introduced by "at least"', () => {
    setStoredPreferences({ animations: false });
    renderWithProviders(<SummaryBanner journey={SAMPLE_JOURNEY} />);
    const distance = screen.getByTestId('summary-distance').textContent ?? '';
    expect(distance).toMatch(/at least 6,655 km|au moins 6 655 km/);
    cleanup();
    const journey: Journey = SAMPLE_JOURNEY;
    const atlantic = journey.segments.find((seg) => seg.from_ttl === 6 && seg.to_ttl === 7);
    if (atlantic) {
      renderWithProviders(<CrossingCard journey={journey} segment={atlantic} />);
      expect(screen.getByTestId('crossing-distance').textContent).toContain('at least');
    }
  });
});
