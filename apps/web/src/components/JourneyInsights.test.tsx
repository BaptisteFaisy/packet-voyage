// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { checkVocabulary, compareWithEra, distanceBounds } from '@packet-voyage/core';
import { loadCables } from '@packet-voyage/data';
import { renderWithProviders, setStoredPreferences } from '../test-utils.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { eraChoices } from '../lib/insights.ts';
import { JourneyInsights } from './JourneyInsights.tsx';

const CABLES = loadCables();

function renderPanel(language: 'en' | 'fr' = 'en') {
  return renderWithProviders(<JourneyInsights journey={SAMPLE_JOURNEY} cables={CABLES} />, {
    language,
  });
}

function eraSelect(): HTMLSelectElement {
  return screen.getByTestId('insights-era-year') as HTMLSelectElement;
}

function eraOf(year: number) {
  return compareWithEra({ journey: SAMPLE_JOURNEY, cables: CABLES, year });
}

function mediaItems(): HTMLElement[] {
  return within(screen.getByTestId('insights-media-list')).getAllByRole('listitem');
}

describe('JourneyInsights structure', () => {
  it('renders the section and its four labelled blocks', () => {
    renderPanel();
    expect(screen.getByTestId('journey-insights')).toBeTruthy();
    const blocks = ['insights-bounds', 'insights-breakdown', 'insights-media', 'insights-era'];
    for (const testId of blocks) {
      expect(screen.getByTestId(testId)).toBeTruthy();
    }
    expect(screen.getByTestId('insights-certainty').textContent).toContain('measured');
  });

  it('badges every block: bounds/media/era inferred, breakdown measured', () => {
    const { container } = renderPanel();
    const badges = Array.from(container.querySelectorAll('.level-badge')).map((el) => el.textContent);
    expect(badges).toEqual(['inferred', 'measured', 'inferred', 'inferred']);
    expect(badges).toContain('measured');
    expect(badges).toContain('inferred');
    expect(screen.getByTestId('insights-breakdown').className).toContain('level-measured');
    expect(screen.getByTestId('insights-bounds').className).toContain('level-inferred');
  });
});

describe('JourneyInsights bounds block', () => {
  it('bounds the distance on both sides and quotes the note of the core', () => {
    renderPanel();
    const value = screen.getByTestId('insights-bounds-value').textContent ?? '';
    expect(value).toBe('at least 6,655 km — at most 9,353 km');
    const note = screen.getByTestId('insights-bounds-note').textContent ?? '';
    expect(note).toBe(distanceBounds(SAMPLE_JOURNEY).note.en);
    expect(note).toContain('at least');
    expect(note).toContain('at most');
  });

  it('follows the unit preference', () => {
    setStoredPreferences({ unit: 'mi' });
    renderPanel();
    const value = screen.getByTestId('insights-bounds-value').textContent ?? '';
    expect(value).toBe('at least 4,135 mi — at most 5,812 mi');
    setStoredPreferences({ unit: 'km' });
  });

  it('says the upper bound is unknown when nothing was measured', () => {
    const silent = { ...SAMPLE_JOURNEY, summary: { ...SAMPLE_JOURNEY.summary, rtt_ms: null } };
    renderWithProviders(<JourneyInsights journey={silent} cables={CABLES} />);
    expect(screen.getByTestId('insights-bounds-value').textContent).toContain('at least');
    expect(screen.getByTestId('insights-bounds-unknown').textContent).toContain('no upper bound');
    expect(screen.queryByTestId('insights-breakdown-value')).toBeNull();
    expect(screen.getByTestId('insights-breakdown-unknown').textContent).toContain('no measured delay');
    expect(screen.getByTestId('insights-breakdown').className).toContain('level-inferred');
    for (const item of mediaItems()) {
      expect(item.getAttribute('data-verdict')).toBe('ruled-out');
    }
  });
});

describe('JourneyInsights breakdown block', () => {
  it('shows rtt, floor, residual and share, plus the note of the core', () => {
    renderPanel();
    const value = screen.getByTestId('insights-breakdown-value').textContent ?? '';
    expect(value).toContain('91.7 ms');
    expect(value).toContain('63.6 ms');
    expect(value).toContain('28.1 ms');
    expect(value).toContain('31 %');
    const note = screen.getByTestId('insights-breakdown-note').textContent ?? '';
    expect(note).toContain('This residual is inferred, not measured');
  });
});

describe('JourneyInsights media block', () => {
  it('lists the five media sorted, geostationary ruled out and muted', () => {
    renderPanel();
    const items = mediaItems();
    expect(items.map((item) => item.getAttribute('data-testid'))).toEqual([
      'insights-media-microwave',
      'insights-media-vacuum',
      'insights-media-copper',
      'insights-media-fibre',
      'insights-media-geostationary',
    ]);
    const rtts = items.map((item) =>
      Number.parseFloat(item.querySelector('.media-min-rtt')?.textContent ?? 'NaN'),
    );
    expect(rtts).toEqual([...rtts].sort((a, b) => a - b));
    const geo = screen.getByTestId('insights-media-geostationary');
    expect(geo.getAttribute('data-verdict')).toBe('ruled-out');
    expect(geo.className).toContain('media-item-muted');
    expect(geo.textContent).toContain('ruled out');
    const fibre = screen.getByTestId('insights-media-fibre');
    expect(fibre.getAttribute('data-verdict')).toBe('possible');
    expect(fibre.className).not.toContain('media-item-muted');
    expect(fibre.textContent).toContain('possible');
  });

  it('keeps the note of the core as the accessible description', () => {
    renderPanel();
    const geo = screen.getByTestId('insights-media-geostationary');
    const describedBy = geo.getAttribute('aria-describedby') ?? '';
    const note = geo.querySelector(`#${describedBy}`);
    expect(describedBy).toBe('insights-media-note-geostationary');
    expect(note?.textContent).toContain('impossible');
  });

  it('names the media in French', () => {
    renderPanel('fr');
    expect(screen.getByTestId('insights-media-vacuum').textContent).toContain('vide');
    expect(screen.getByTestId('insights-media-fibre').textContent).toContain('fibre optique');
    expect(screen.getByTestId('insights-media-geostationary').textContent).toContain('écarté');
  });
});

describe('JourneyInsights era block', () => {
  it('offers the era years and starts at the trace year', () => {
    renderPanel();
    const options = Array.from(eraSelect().options).map((option) => Number(option.value));
    expect(options).toEqual(eraChoices(SAMPLE_JOURNEY));
    expect(eraSelect().value).toBe('2026');
  });

  it('shows the counts of the chosen year', () => {
    renderPanel();
    const era = eraOf(2026);
    expect(screen.getByTestId('insights-era-available').textContent).toContain(
      `${era.available_then} dated cable(s) in service in 2026`,
    );
    expect(screen.getByTestId('insights-era-then').textContent).toBe(
      `${era.compatible_then.length} compatible then`,
    );
    expect(screen.getByTestId('insights-era-now').textContent).toBe(
      `${era.compatible_now.length} compatible at the trace date`,
    );
    expect(screen.getByTestId('insights-era-verdict').getAttribute('data-undated')).toBe(
      String(era.undated),
    );
  });

  it('re-renders the counts and the verbatim verdict when the year changes', () => {
    renderPanel();
    fireEvent.change(eraSelect(), { target: { value: '1988' } });
    const era = eraOf(1988);
    expect(eraSelect().value).toBe('1988');
    expect(screen.getByTestId('insights-era').textContent).toContain('The same journey in 1988');
    expect(screen.getByTestId('insights-era-available').textContent).toBe(
      `${era.available_then} dated cable(s) in service in 1988`,
    );
    expect(screen.getByTestId('insights-era-then').textContent).toBe(
      `${era.compatible_then.length} compatible then`,
    );
    expect(screen.getByTestId('insights-era-verdict').textContent?.trim()).toBe(era.verdict.en);
    expect(screen.getByTestId('insights-era-verdict').textContent).toContain('compatible');
  });

  it('never claims a cable was used: only compatibility, in French too', () => {
    renderPanel('fr');
    fireEvent.change(eraSelect(), { target: { value: '1988' } });
    const era = eraOf(1988);
    const verdict = screen.getByTestId('insights-era-verdict').textContent?.trim() ?? '';
    expect(verdict).toBe(era.verdict.fr);
    expect(verdict).toContain('compatibles');
    expect(verdict).toContain('cette comparaison ne les voit pas');
  });
});

describe('JourneyInsights honesty (§5.4, VOY-N-04)', () => {
  it('the whole rendered text passes checkVocabulary in en and in fr', () => {
    for (const language of ['en', 'fr'] as const) {
      const { container } = renderPanel(language);
      fireEvent.change(eraSelect(), { target: { value: '1988' } });
      const report = checkVocabulary(container.textContent ?? '');
      expect(report.violations).toEqual([]);
      expect(report.ok).toBe(true);
      cleanup();
    }
  });

  it('stays honest when no delay was measured at all', () => {
    const silent = { ...SAMPLE_JOURNEY, summary: { ...SAMPLE_JOURNEY.summary, rtt_ms: null } };
    const { container } = renderWithProviders(<JourneyInsights journey={silent} cables={CABLES} />);
    const report = checkVocabulary(container.textContent ?? '');
    expect(report.violations).toEqual([]);
  });
});
