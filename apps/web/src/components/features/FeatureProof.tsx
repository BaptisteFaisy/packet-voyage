/**
 * The proof of a block: the figures it computed, and where they come from.
 *
 * The catalogue says what the tool does; this says what it *did*, on the journey
 * the visitor is looking at. A figure the journey does not carry is shown as an
 * em dash, never as a zero: an absent measurement is not a measurement.
 */
import type { Language } from '../../i18n/context.tsx';
import { useI18n } from '../../i18n/context.tsx';
import type { Journey } from '@packet-voyage/schema';
import { formatDate, formatInflation, formatInteger, formatMs, formatQualifiedDistance } from '../../lib/format.ts';
import type { DistanceUnit } from '../../lib/format.ts';
import type { ProofFact } from '../../lib/proof.ts';
import { usePreferences } from '../../state/preferences.tsx';

export interface FeatureProofProps {
  facts: ProofFact[];
  /** The journey those figures come from. */
  journey: Journey;
  testId?: string;
}

/** One figure, formatted the way the site formats it everywhere else. */
export function formatFact(fact: ProofFact, unit: DistanceUnit, language: Language): string {
  if (fact.value === null || fact.value === undefined) return '—';
  switch (fact.unit) {
    case 'km':
      return formatQualifiedDistance(Number(fact.value), unit, language);
    case 'ms':
      return formatMs(Number(fact.value), language);
    case 'ratio':
      return formatInflation(Number(fact.value), language);
    case 'count':
      return formatInteger(Number(fact.value), language);
    default:
      return String(fact.value);
  }
}

export function FeatureProof({ facts, journey, testId = 'feature-proof' }: FeatureProofProps) {
  const { t, language } = useI18n();
  const { prefs } = usePreferences();
  if (facts.length === 0) return null;

  return (
    <p className="feature-proof" data-testid={testId}>
      <span className="proof-mark" aria-hidden="true">
        ✓
      </span>
      <span className="proof-label">{t('proof.label')}</span>
      {facts.map((fact) => (
        <span className="proof-fact" key={fact.key} data-testid={`${testId}-${fact.key}`}>
          {t(fact.key)}: <strong>{formatFact(fact, prefs.unit, language)}</strong>
        </span>
      ))}
      <span className="hint proof-source">
        {t('proof.from', {
          target: journey.target.host,
          date: formatDate(journey.traced_at, language),
        })}
      </span>
    </p>
  );
}
