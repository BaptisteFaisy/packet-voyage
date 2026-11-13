import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { usePreferences } from '../state/preferences.tsx';
import {
  formatInflation,
  formatInteger,
  formatMs,
  formatQualifiedDistance,
} from '../lib/format.ts';

interface StatProps {
  testId: string;
  label: string;
  value: string;
}

function Stat({ testId, label, value }: StatProps) {
  return (
    <div className="banner-stat" data-testid={testId}>
      <dt>{label}</dt>
      <dd>
        <strong>{value}</strong>
      </dd>
    </div>
  );
}

/** Detours, missing-departure notice and trace instant (§12.2 states). */
function BannerNotes({ journey }: { journey: Journey }) {
  const { t } = useI18n();
  const detours = journey.summary.detours;
  return (
    <>
      {detours.length > 0 && (
        <p className="banner-detour" data-testid="summary-detours">
          {detours.map((detour) => detour.detail).join(' · ')}
        </p>
      )}
      {journey.source === null || journey.source === undefined ? (
        <p className="banner-notice">{t('paste.noSourceNotice')}</p>
      ) : null}
      <p className="banner-traced" data-testid="summary-traced-at">
        {t('summary.tracedAt', { value: journey.traced_at })}
      </p>
    </>
  );
}

/**
 * The summary banner (§12.1 screen 2): « At least 6,655 km · 91.7 ms ·
 * 3 countries · 3 networks · 1 location rejected by light » plus the light
 * floor and the inflation (VOY-F-26, VOY-F-27).
 */
export function SummaryBanner({ journey }: { journey: Journey }) {
  const { t, language } = useI18n();
  const { prefs } = usePreferences();
  const s = journey.summary;

  return (
    <section className="summary-banner" aria-label="Journey summary" data-testid="summary-banner">
      <dl>
        <Stat
          testId="summary-distance"
          label={t('summary.distance')}
          value={formatQualifiedDistance(s.distance_km_min, prefs.unit, language)}
        />
        <Stat testId="summary-rtt" label={t('summary.delay')} value={formatMs(s.rtt_ms, language)} />
        <Stat
          testId="summary-light-floor"
          label={t('summary.lightFloor')}
          value={formatMs(s.light_floor_ms, language)}
        />
        <Stat
          testId="summary-inflation"
          label={t('summary.inflation')}
          value={formatInflation(s.inflation, language)}
        />
        <Stat
          testId="summary-countries"
          label={t('summary.countries')}
          value={`${formatInteger(s.countries.length, language)} (${s.countries.join(', ') || '—'})`}
        />
        <Stat
          testId="summary-networks"
          label={t('summary.networks')}
          value={formatInteger(s.networks, language)}
        />
        <Stat testId="summary-ixps" label={t('summary.ixps')} value={formatInteger(s.ixps, language)} />
        <Stat
          testId="summary-rejections"
          label={t('summary.rejections')}
          value={formatInteger(s.rejected_by_light, language)}
        />
        <Stat testId="summary-gaps" label={t('summary.gaps')} value={formatInteger(s.gaps, language)} />
      </dl>
      <BannerNotes journey={journey} />
    </section>
  );
}
