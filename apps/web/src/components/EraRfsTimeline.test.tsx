// @vitest-environment jsdom
/**
 * The frise of the commissioning years: the years the dataset dates the
 * compatible cables to, the place of the chosen year among them, and the
 * cables the dataset leaves undated (§5.4).
 */
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { checkVocabulary, compareWithEra } from '@packet-voyage/core';
import type { EraCable } from '@packet-voyage/core';
import { loadCables } from '@packet-voyage/data';
import { renderWithProviders } from '../test-utils.tsx';
import { EN_KEYS } from '../i18n/en.ts';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { EraRfsTimeline } from './EraRfsTimeline.tsx';
import { JourneyInsights } from './JourneyInsights.tsx';

const CABLES = loadCables();

function cable(id: string, rfs_year: number | null): EraCable {
  return { id, name: id.toUpperCase(), rfs_year, length_km: null, compatibility: 0.8, band: 'high' };
}

function renderTimeline(cables: EraCable[], year: number, language: 'en' | 'fr' = 'en') {
  return renderWithProviders(<EraRfsTimeline cables={cables} year={year} />, { language });
}

describe('EraRfsTimeline', () => {
  it('titles the frise and lists one tick per commissioning year', () => {
    renderTimeline([cable('a', 2001), cable('b', 1988), cable('c', 2001)], 1995);
    expect(screen.getByTestId('era-rfs-title').textContent).toBe(EN_KEYS['era.rfsTimeline']);
    const ticks = within(screen.getByTestId('era-rfs-years')).getAllByRole('listitem');
    expect(ticks.map((tick) => tick.textContent)).toEqual(['1988', '2001']);
  });

  it('marks the years already in service and places the chosen year', () => {
    renderTimeline([cable('a', 1988), cable('b', 2016)], 2016);
    expect(screen.getByTestId('era-rfs-year-1988').getAttribute('data-in-service')).toBe('true');
    expect(screen.getByTestId('era-rfs-year-2016').getAttribute('data-in-service')).toBe('true');
    const marker = screen.getByTestId('era-rfs-marker');
    expect(marker.getAttribute('data-year')).toBe('2016');
    expect(marker.style.left).toBe('100%');
  });

  it('counts the cables the dataset leaves undated', () => {
    renderTimeline([cable('a', 1988), cable('b', null), cable('c', null)], 2016);
    expect(screen.getByTestId('era-rfs-unknown').textContent).toBe(
      EN_KEYS['era.rfsUnknown'].replace('{count}', '2'),
    );
  });

  it('holds the chosen year alone when no cable is dated', () => {
    renderTimeline([cable('a', null)], 1987);
    expect(screen.queryByTestId('era-rfs-years')).toBeNull();
    expect(screen.getByTestId('era-rfs-marker').getAttribute('data-year')).toBe('1987');
    expect(screen.getByTestId('era-rfs-marker').style.left).toBe('0%');
    expect(screen.getByTestId('era-rfs-unknown').textContent).toContain('1');
  });

  it('speaks French when the reader does', () => {
    renderTimeline([cable('a', 1988), cable('b', null)], 1987, 'fr');
    expect(screen.getByTestId('era-rfs-title').textContent).toBe(
      'Années de mise en service des câbles compatibles',
    );
    expect(screen.getByTestId('era-rfs-unknown').textContent).toContain(
      'n’ont pas d’année de mise en service',
    );
  });

  it('keeps the frise honest in both languages (§5.4)', () => {
    for (const language of ['en', 'fr'] as const) {
      const { container } = renderTimeline(
        [cable('a', 1988), cable('b', null)],
        1987,
        language,
      );
      const report = checkVocabulary(container.textContent ?? '');
      expect(report.violations).toEqual([]);
      cleanup();
    }
  });
});

describe('EraRfsTimeline in the era block of the insights panel', () => {
  function renderPanel(language: 'en' | 'fr' = 'en') {
    return renderWithProviders(<JourneyInsights journey={SAMPLE_JOURNEY} cables={CABLES} />, {
      language,
    });
  }

  it('sits inside the "same journey in" block', () => {
    renderPanel();
    const era = screen.getByTestId('insights-era');
    expect(within(era).getByTestId('era-rfs-timeline')).toBeTruthy();
  });

  it('counts the undated cables of the compatible set', () => {
    renderPanel();
    const era = compareWithEra({ journey: SAMPLE_JOURNEY, cables: CABLES, year: 2026 });
    const undated = era.compatible_now.filter((cable) => cable.rfs_year === null).length;
    expect(screen.getByTestId('era-rfs-unknown').textContent).toContain(String(undated));
  });

  it('follows the year the reader picks', () => {
    renderPanel();
    fireEvent.change(screen.getByTestId('insights-era-year'), { target: { value: '1988' } });
    const marker = screen.getByTestId('era-rfs-marker');
    expect(marker.getAttribute('data-year')).toBe('1988');
    expect(screen.getByTestId('insights-era').textContent).toContain('The same journey in 1988');
  });
});
