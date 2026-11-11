/**
 * User preferences (§12.1 screen 9): language, unit, projection, animations.
 * Pure storage logic; the React binding lives in `state/preferences.tsx`.
 * The site never sends anything anywhere (VOY-N-01): persistence is local.
 */
import type { ProjectionKind } from './map-geometry.ts';
import type { Language } from '../i18n/context.tsx';
import type { DistanceUnit } from './format.ts';

export interface Preferences {
  language: Language;
  unit: DistanceUnit;
  projection: ProjectionKind;
  animations: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  language: 'en',
  unit: 'km',
  projection: 'globe',
  animations: true,
};

const STORAGE_KEY = 'packet-voyage.preferences';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function loadPreferences(): Preferences {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      language: parsed.language === 'fr' ? 'fr' : 'en',
      unit: parsed.unit === 'mi' ? 'mi' : 'km',
      projection: parsed.projection === 'flat' ? 'flat' : 'globe',
      animations: parsed.animations !== false,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Preferences): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or unavailable: preferences stay session-only.
  }
}
