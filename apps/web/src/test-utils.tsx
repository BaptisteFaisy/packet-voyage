/**
 * Shared test harness: providers + cleanup. Imported by the colocated
 * tests; not part of the application bundle (tests only).
 */
import type { ReactNode } from 'react';
import { afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { I18nProvider } from './i18n/context.tsx';
import type { Language } from './i18n/context.tsx';
import { PreferencesProvider } from './state/preferences.tsx';
import { JourneyProvider } from './state/journey.tsx';
import type { Preferences } from './lib/preferences.ts';
import { DEFAULT_PREFERENCES } from './lib/preferences.ts';

afterEach(cleanup);

/** jsdom has no 2D canvas: silence "Not implemented" and return null. */
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => null,
    configurable: true,
    writable: true,
  });
}

/**
 * jsdom under this Node/vitest combination may expose no `localStorage`;
 * install a minimal in-memory polyfill so preferences can be seeded.
 */
function ensureLocalStorage(): Storage {
  if (window.localStorage) return window.localStorage;
  const store = new Map<string, string>();
  const stub: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  };
  Object.defineProperty(window, 'localStorage', { value: stub, configurable: true });
  return stub;
}

export function setStoredPreferences(prefs: Partial<Preferences>): void {
  const merged = { ...DEFAULT_PREFERENCES, ...prefs };
  ensureLocalStorage().setItem('packet-voyage.preferences', JSON.stringify(merged));
}

export interface RenderOptions {
  language?: Language;
}

export function renderWithProviders(ui: ReactNode, options?: RenderOptions): RenderResult {
  const language = options?.language ?? 'en';
  return render(
    <PreferencesProvider>
      <JourneyProvider>
        <I18nProvider language={language}>{ui}</I18nProvider>
      </JourneyProvider>
    </PreferencesProvider>,
  );
}
