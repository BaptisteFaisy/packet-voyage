import type { Journey } from '@packet-voyage/schema';
import { everydayScale } from '@packet-voyage/core';
import { useI18n } from '../i18n/context.tsx';
import { usePreferences } from '../state/preferences.tsx';
import { formatNumber, toDisplayDistance } from '../lib/format.ts';

export interface ScalePanelProps {
  journey: Journey;
}

/**
 * The scale of the journey in everyday terms: what light covers in one
 * millisecond, how many laps of the Earth, how many Paris–Marseille trips.
 *
 * These are anchors of scale, not measurements: the distance they translate is
 * the lower bound of the summary, and the panel says so ("at least").
 */
export function ScalePanel({ journey }: ScalePanelProps) {
  const { t, language } = useI18n();
  const { prefs } = usePreferences();
  const km = journey.summary.distance_km_min;
  const scale = everydayScale(km);
  const shown = toDisplayDistance(scale.lightKmPerMs, prefs.unit);

  return (
    <section className="scale-panel" data-testid="scale-panel">
      <h3>{t('scale.title')}</h3>
      <dl>
        <div>
          <dt>{t('scale.lightPerMs', { km: formatNumber(shown, language) })}</dt>
          <dd className="mono" data-testid="scale-light">
            {scale.lightKmPerMs.toFixed(2)} km/ms
          </dd>
        </div>
        <div>
          <dt>{t('scale.earthLaps', { laps: formatNumber(scale.laps, language) })}</dt>
          <dd className="mono" data-testid="scale-laps">
            {formatNumber(scale.laps, language)}
          </dd>
        </div>
        <div>
          <dt>{t('scale.parisMarseille', { n: formatNumber(scale.trips, language) })}</dt>
          <dd className="mono" data-testid="scale-trips">
            {formatNumber(scale.trips, language)}
          </dd>
        </div>
      </dl>
      <p className="notice">{t('insights.certaintyNote')}</p>
    </section>
  );
}
