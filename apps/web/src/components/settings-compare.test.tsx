// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PreferencesProvider, usePreferences } from '../state/preferences.tsx';
import { I18nProvider } from '../i18n/context.tsx';
import { renderWithProviders, setStoredPreferences } from '../test-utils.tsx';
import { CompareView } from './CompareView.tsx';
import { SettingsView } from './SettingsView.tsx';
import { SummaryBanner } from './SummaryBanner.tsx';
import { loadGallery } from '../lib/gallery.ts';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';

function Harness() {
  const { prefs } = usePreferences();
  return (
    <I18nProvider language={prefs.language}>
      <SettingsView />
      <SummaryBanner journey={SAMPLE_JOURNEY} />
    </I18nProvider>
  );
}

function renderHarness() {
  return render(
    <PreferencesProvider>
      <Harness />
    </PreferencesProvider>,
  );
}

describe('CompareView (VOY-F-29)', () => {
  it('VOY-F-29 two journeys share one map and show side-by-side summaries', () => {
    const items = loadGallery();
    renderWithProviders(<CompareView items={items} />);
    expect(screen.getByTestId('compare-banner-a')).toBeTruthy();
    expect(screen.getByTestId('compare-banner-b')).toBeTruthy();
    // One single map carries both routes.
    expect(screen.getAllByTestId('world-map-canvas').length).toBe(1);
    fireEvent.change(screen.getByTestId('compare-select-b'), { target: { value: '2' } });
    expect(screen.getByTestId('compare-banner-b').textContent).toContain('at least');
  });
});

describe('SettingsView (VOY-N-09, VOY-N-01)', () => {
  it('VOY-N-09 switching the unit to miles re-formats the distances', () => {
    setStoredPreferences({ unit: 'km' });
    renderHarness();
    expect(screen.getByTestId('summary-distance').textContent).toContain('6,655 km');
    fireEvent.change(screen.getByTestId('setting-unit'), { target: { value: 'mi' } });
    expect(screen.getByTestId('summary-distance').textContent).toContain('4,135 mi');
  });

  it('VOY-N-09 switching the language to French re-labels the interface', () => {
    setStoredPreferences({ language: 'en' });
    renderHarness();
    expect(screen.getByTestId('settings-view').textContent).toContain('Settings');
    fireEvent.change(screen.getByTestId('setting-language'), { target: { value: 'fr' } });
    expect(screen.getByTestId('settings-view').textContent).toContain('Réglages');
    expect(screen.getByTestId('summary-distance').textContent).toContain('au moins');
  });

  it('VOY-N-01 the consent status is read-only: the site never sends anything', () => {
    renderWithProviders(<SettingsView />);
    expect(screen.getByTestId('consent-status').textContent).toContain('never sends');
    expect(screen.queryByTestId('consent-toggle')).toBeNull();
  });
});
