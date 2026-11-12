import type { Rejection } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import type { Language } from '../i18n/context.tsx';
import { formatInteger, formatMs } from '../lib/format.ts';

export interface RejectionContrastProps {
  rejection: Rejection;
  envelopeMs: number | null;
  /** Optional override; defaults to the language of useI18n(). */
  language?: Language;
}

function testId(city: string): string {
  return `rejection-contrast-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/**
 * Before/after of a rejection (§7.6): on the left what the geolocation
 * database says ("Ashburn, US"), on the right what the speed of light allows.
 * The rejected city stays visible, struck through — an undone stitch (§12.3).
 * Both distances stay bounded ("at least", "allowed at most"): the contrast
 * IS the demonstration, so it never claims more than the bound (§5.4).
 */
export function RejectionContrast({ rejection, envelopeMs, language: override }: RejectionContrastProps) {
  const { t, language: contextLanguage } = useI18n();
  const language = override ?? contextLanguage;
  const place = `${rejection.city}${rejection.country ? `, ${rejection.country}` : ''}`;
  const verdict = t('contrast.verdict', {
    needed: `${formatInteger(rejection.needed_km, language)} km`,
    allowed: `${formatInteger(rejection.allowed_km, language)} km`,
  });

  return (
    <figure className="rejection-contrast" data-testid={testId(rejection.city)}>
      <figcaption className="rejection-contrast-title">{t('contrast.title')}</figcaption>
      <div className="rejection-contrast-columns">
        <div className="rejection-contrast-database" data-testid="rejection-contrast-database">
          <h3>{t('contrast.database')}</h3>
          <p>
            <span data-testid="rejection-contrast-source">{rejection.source}</span>
            {' / '}
            <s>{place}</s>
          </p>
        </div>
        <div className="rejection-contrast-light" data-testid="rejection-contrast-light">
          <h3>{t('contrast.light')}</h3>
          <p data-testid="rejection-contrast-measured">
            {t('reject.stepMeasured', { delay: formatMs(envelopeMs, language) })}
          </p>
          <p data-testid="rejection-contrast-verdict">{verdict}</p>
        </div>
      </div>
    </figure>
  );
}
