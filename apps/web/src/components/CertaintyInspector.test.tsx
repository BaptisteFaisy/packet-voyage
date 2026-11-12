// @vitest-environment jsdom
/**
 * The certainty inspector: a real button that opens the level, the explaining
 * sentence, the founding sources and the "what blocks us" band of one value
 * (§5.4, §7.6). It knows nothing of the value it stands for, so it is tested
 * on its own, the way any screen will mount it.
 */
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { checkVocabulary } from '@packet-voyage/core';
import { renderWithProviders } from '../test-utils.tsx';
import { EN_KEYS } from '../i18n/en.ts';
import { CertaintyInspector } from './CertaintyInspector.tsx';
import type { CertaintyInspectorProps } from './CertaintyInspector.tsx';

function renderInspector(props: CertaintyInspectorProps, language: 'en' | 'fr' = 'en') {
  return renderWithProviders(<CertaintyInspector {...props} />, { language });
}

function open(props: CertaintyInspectorProps, language: 'en' | 'fr' = 'en') {
  renderInspector(props, language);
  fireEvent.click(screen.getByTestId('certainty-inspector-button'));
}

describe('CertaintyInspector button', () => {
  it('is a real button, collapsed by default, labelled with the value', () => {
    renderInspector({ certainty: 'measured', label: '91.7 ms' });
    const button = screen.getByTestId('certainty-inspector-button');
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.textContent).toBe('91.7 ms');
    expect(screen.queryByTestId('certainty-inspector-panel')).toBeNull();
  });

  it('opens on click and closes again on a second click', () => {
    renderInspector({ certainty: 'measured', label: '91.7 ms' });
    const button = screen.getByTestId('certainty-inspector-button');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('certainty-inspector-panel')).toBeTruthy();
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('certainty-inspector-panel')).toBeNull();
  });

  it('links the button to its panel and closes with the close button', () => {
    renderInspector({ certainty: 'inferred', label: 'London' });
    fireEvent.click(screen.getByTestId('certainty-inspector-button'));
    const panel = screen.getByTestId('certainty-inspector-panel');
    const controls = screen.getByTestId('certainty-inspector-button').getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(panel.id).toBe(controls);
    fireEvent.click(screen.getByTestId('certainty-inspector-close'));
    expect(screen.queryByTestId('certainty-inspector-panel')).toBeNull();
  });
});

describe('CertaintyInspector panel on a measured or inferred value', () => {
  it('says a measured value was read from the probe, and blocks nothing', () => {
    open({ certainty: 'measured', label: '91.7 ms', sources: ['probe'] });
    expect(screen.getByTestId('certainty-inspector-level').textContent).toContain('measured');
    expect(screen.getByTestId('certainty-inspector-phrase').textContent).toBe(
      EN_KEYS['inspector.measured'],
    );
    expect(screen.queryByTestId('certainty-inspector-why')).toBeNull();
  });

  it('names the sources an inferred value was deduced from', () => {
    open({
      certainty: 'inferred',
      label: 'London',
      sources: ['name-hint', 'ipmap-latency'],
    });
    expect(screen.getByTestId('certainty-inspector-phrase').textContent).toBe(
      EN_KEYS['inspector.inferred'].replace('{sources}', 'name-hint, ipmap-latency'),
    );
    expect(screen.getByTestId('certainty-inspector-sources').textContent).toContain(
      EN_KEYS['inspector.sources'],
    );
    expect(screen.getByTestId('certainty-inspector-source-0').textContent).toBe('name-hint');
    expect(screen.getByTestId('certainty-inspector-source-1').textContent).toBe('ipmap-latency');
    // The band explains what the inference cannot do.
    expect(screen.getByTestId('certainty-inspector-why').textContent).toContain(
      'the light bound only rules out the impossible',
    );
  });

  it('says an inferred value with no source explains nothing', () => {
    open({ certainty: 'inferred', label: '—' });
    expect(screen.getByTestId('certainty-inspector-phrase').textContent).toBe(
      EN_KEYS['inspector.inferred'].replace('{sources}', '—'),
    );
    expect(screen.queryByTestId('certainty-inspector-sources')).toBeNull();
    expect(screen.getByTestId('certainty-inspector-why').textContent).toContain(
      EN_KEYS['why.unknown'],
    );
  });

});

describe('CertaintyInspector panel on an assumed value', () => {
  it('lists what blocks an assumed value, plus the caller blockers', () => {
    open({
      certainty: 'assumed',
      label: 'at least 6,496 km',
      blockers: ['the fibre route is not in the dataset'],
    });
    expect(screen.getByTestId('certainty-inspector-level').textContent).toContain('assumed');
    expect(screen.getByTestId('certainty-inspector-phrase').textContent).toBe(
      EN_KEYS['inspector.assumed'],
    );
    const band = screen.getByTestId('certainty-inspector-why');
    expect(band.textContent).toContain(EN_KEYS['why.title']);
    expect(band.textContent).toContain(EN_KEYS['why.assumed.path']);
    expect(band.textContent).toContain('the fibre route is not in the dataset');
  });

  it('speaks French when the reader does', () => {
    open({ certainty: 'assumed', label: 'supposé', sources: ['name-hint'] }, 'fr');
    expect(screen.getByTestId('certainty-inspector-level').textContent).toContain('Quel degré');
    expect(screen.getByTestId('certainty-inspector-phrase').textContent).toBe(
      'Supposé — rien ne l’observe ; voici ce qui nous bloque.',
    );
    expect(screen.getByTestId('certainty-inspector-why').textContent).toContain(
      'Pourquoi on ne peut pas en savoir plus',
    );
  });

  it('keeps the panel honest in both languages (§5.4)', () => {
    for (const language of ['en', 'fr'] as const) {
      open({ certainty: 'assumed', label: 'assumed', sources: ['name-hint'] }, language);
      const panel = screen.getByTestId('certainty-inspector-panel');
      const report = checkVocabulary(panel.textContent ?? '');
      expect(report.violations).toEqual([]);
      cleanup();
    }
  });
});
