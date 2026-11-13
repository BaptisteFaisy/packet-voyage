/**
 * Preferences state (§12.1 screen 9) shared by the whole app: language,
 * unit, projection, animations. Read-only consent notice: the site never
 * sends anything (VOY-N-01).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Preferences } from '../lib/preferences.ts';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  prefersReducedMotion,
  savePreferences,
} from '../lib/preferences.ts';

interface PreferencesContextValue {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
  reducedMotion: boolean;
  animationsEnabled: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider(props: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    setPrefs(loadPreferences());
    setReducedMotion(prefersReducedMotion());
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      prefs,
      update,
      reducedMotion,
      animationsEnabled: prefs.animations && !reducedMotion,
    }),
    [prefs, update, reducedMotion],
  );

  return <PreferencesContext.Provider value={value}>{props.children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (ctx) return ctx;
  return {
    prefs: DEFAULT_PREFERENCES,
    update: () => {},
    reducedMotion: false,
    animationsEnabled: false,
  };
}
