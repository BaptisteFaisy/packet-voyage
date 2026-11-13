import { useI18n } from '../i18n/context.tsx';
import { usePreferences } from '../state/preferences.tsx';

function LanguageSelector() {
  const { t } = useI18n();
  const { prefs, update } = usePreferences();
  return (
    <div className="setting-row">
      <label htmlFor="setting-language">{t('settings.language')}</label>
      <select
        id="setting-language"
        value={prefs.language}
        onChange={(event) => update({ language: event.target.value === 'fr' ? 'fr' : 'en' })}
        data-testid="setting-language"
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
      </select>
    </div>
  );
}

function UnitSelector() {
  const { t } = useI18n();
  const { prefs, update } = usePreferences();
  return (
    <div className="setting-row">
      <label htmlFor="setting-unit">{t('settings.units')}</label>
      <select
        id="setting-unit"
        value={prefs.unit}
        onChange={(event) => update({ unit: event.target.value === 'mi' ? 'mi' : 'km' })}
        data-testid="setting-unit"
      >
        <option value="km">km</option>
        <option value="mi">mi</option>
      </select>
    </div>
  );
}

function ProjectionSelector() {
  const { t } = useI18n();
  const { prefs, update } = usePreferences();
  return (
    <div className="setting-row">
      <label htmlFor="setting-projection">{t('settings.projection')}</label>
      <select
        id="setting-projection"
        value={prefs.projection}
        onChange={(event) =>
          update({ projection: event.target.value === 'flat' ? 'flat' : 'globe' })
        }
        data-testid="setting-projection"
      >
        <option value="globe">{t('settings.globe')}</option>
        <option value="flat">{t('settings.flat')}</option>
      </select>
    </div>
  );
}

function AnimationCheckbox() {
  const { t } = useI18n();
  const { prefs, update, reducedMotion } = usePreferences();
  return (
    <div className="setting-row">
      <label htmlFor="setting-animations">{t('settings.animations')}</label>
      <input
        id="setting-animations"
        type="checkbox"
        checked={prefs.animations}
        onChange={(event) => update({ animations: event.target.checked })}
        data-testid="setting-animations"
      />
      {reducedMotion ? (
        <p className="notice" data-testid="reduced-motion-notice">
          {t('settings.reducedMotionNotice')}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Settings (§12.1 screen 9): language, unit, projection, animations, and the
 * consent status — read-only here, because the site never sends anything
 * (VOY-N-01, VOY-N-09).
 */
export function SettingsView() {
  const { t } = useI18n();
  return (
    <section className="settings-view" data-testid="settings-view">
      <h2>{t('settings.title')}</h2>
      <LanguageSelector />
      <UnitSelector />
      <ProjectionSelector />
      <AnimationCheckbox />
      <div className="setting-row">
        <h3>{t('settings.consentStatus')}</h3>
        <p data-testid="consent-status">{t('settings.consentText')}</p>
      </div>
    </section>
  );
}
