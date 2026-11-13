import { useMemo } from 'react';
import type { Journey } from '@packet-voyage/schema';
import { diffJourneys } from '@packet-voyage/core';
import { useI18n } from '../i18n/context.tsx';
import { usePreferences } from '../state/preferences.tsx';
import { formatMs, formatNumber, formatQualifiedDistance } from '../lib/format.ts';

export interface DiffPanelProps {
  a: Journey;
  b: Journey;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="diff-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * Two journeys side by side, as facts (§8 P6). The sentence comes from the core
 * and states what changed, never why: a traceroute cannot support a cause.
 */
export function DiffPanel({ a, b }: DiffPanelProps) {
  const { t, language } = useI18n();
  const { prefs } = usePreferences();
  const diff = useMemo(() => diffJourneys(a, b), [a, b]);
  const arrow = (x: string, y: string): string => `${x} → ${y}`;

  return (
    <section className="diff-panel" data-testid="diff-panel">
      <h3>{t('diff.title')}</h3>
      <dl className="diff-list">
        <Row label={t('diff.sameTarget')} value={String(diff.same_target)} />
        <Row
          label={t('diff.distance')}
          value={arrow(
            formatQualifiedDistance(a.summary.distance_km_min, prefs.unit, language),
            formatQualifiedDistance(b.summary.distance_km_min, prefs.unit, language),
          )}
        />
        <Row label={t('diff.rtt')} value={arrow(formatMs(diff.rtt_ms.a, language), formatMs(diff.rtt_ms.b, language))} />
        <Row
          label={t('diff.inflation')}
          value={arrow(formatNumber(diff.inflation.a ?? NaN, language), formatNumber(diff.inflation.b ?? NaN, language))}
        />
        <Row label={t('diff.hops')} value={arrow(`${diff.hops.a} / ${diff.located_hops.a}`, `${diff.hops.b} / ${diff.located_hops.b}`)} />
        <Row label={t('diff.countriesAdded')} value={diff.countries_added.join(', ') || '—'} />
        <Row label={t('diff.countriesRemoved')} value={diff.countries_removed.join(', ') || '—'} />
        <Row label={t('diff.rejected')} value={arrow(String(diff.rejected_by_light.a), String(diff.rejected_by_light.b))} />
        <Row label={t('diff.detours')} value={arrow(String(diff.detours.a), String(diff.detours.b))} />
        <Row label={t('diff.pathChanged')} value={String(diff.path_changed)} />
      </dl>
      <p className="diff-sentence" data-testid="diff-sentence">
        {diff.sentence[language]}
      </p>
      <p className="notice">{t('diff.noClaim')}</p>
    </section>
  );
}
