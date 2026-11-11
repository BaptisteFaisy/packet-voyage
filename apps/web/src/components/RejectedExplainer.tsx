import type { Rejection } from '@packet-voyage/schema';
import { DEFAULT_SETTINGS, lightBudgetKm } from '@packet-voyage/core';
import { useI18n } from '../i18n/context.tsx';
import { formatInteger, formatMs } from '../lib/format.ts';

export interface RejectedExplainerProps {
  rejection: Rejection;
  envelopeMs: number | null;
}

function testId(city: string): string {
  return `rejected-explainer-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/**
 * Why this location was refused, in three steps with the arithmetic shown
 * (§7.6): what was measured, what the speed of light allows, and the verdict.
 * The rejected place stays visible and struck through — the rejection is the
 * demonstration, not a waste bin.
 */
export function RejectedExplainer({ rejection, envelopeMs }: RejectedExplainerProps) {
  const { t, language } = useI18n();
  const oneWayKm = envelopeMs === null ? null : lightBudgetKm(envelopeMs, DEFAULT_SETTINGS.lightVacuumKmPerMs) / 2;
  const place = `${rejection.city}${rejection.country ? `, ${rejection.country}` : ''}`;
  const ratio =
    envelopeMs === null || oneWayKm === null || oneWayKm === 0
      ? null
      : rejection.needed_km / oneWayKm;

  return (
    <ol className="rejected-explainer" data-testid={testId(rejection.city)}>
      <li data-testid="rejected-step-measured">
        <span className="certainty measured">{t('certainty.measured')}</span>{' '}
        {t('reject.stepMeasured', { delay: envelopeMs === null ? '—' : formatMs(envelopeMs, language) })}
      </li>
      <li data-testid="rejected-step-bound">
        <span className="certainty inferred">{t('certainty.inferred')}</span>{' '}
        {t('reject.stepBound', {
          delay: envelopeMs === null ? '—' : formatMs(envelopeMs, language),
          roundTrip: `${formatInteger(rejection.allowed_km, language)} km`,
          oneWay: oneWayKm === null ? '—' : `${formatInteger(oneWayKm, language)} km`,
        })}
      </li>
      <li data-testid="rejected-step-verdict">
        <s>{place}</s>{' '}
        {t('reject.stepVerdict', {
          distance: `${formatInteger(rejection.needed_km, language)} km`,
          times: ratio === null ? '—' : ratio.toFixed(1),
          reason: rejection.reason,
        })}
      </li>
    </ol>
  );
}
