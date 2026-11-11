import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Cable, Journey } from '@packet-voyage/schema';
import type { DelayBreakdown, DistanceBounds, MediumCheck } from '@packet-voyage/core';
import { useI18n } from '../i18n/context.tsx';
import type { Language } from '../i18n/context.tsx';
import { usePreferences } from '../state/preferences.tsx';
import {
  formatDistance,
  formatInteger,
  formatMs,
  formatQualifiedDistance,
} from '../lib/format.ts';
import type { DistanceUnit } from '../lib/format.ts';
import { loadDatasets } from '../lib/datasets.ts';
import { formatMediaLabel, insightsModel, traceYearOf } from '../lib/insights.ts';
import type { InsightsModel } from '../lib/insights.ts';

/** The two certainty levels the other cards use. */
type Certainty = 'measured' | 'inferred';

const NO_CABLES: Cable[] = [];

function Block(props: {
  testId: string;
  title: string;
  level: Certainty;
  children: ReactNode;
}) {
  return (
    <section className={`card-section level-${props.level}`} data-testid={props.testId}>
      <h3>
        {props.title}
        <span className="level-badge">{props.level}</span>
      </h3>
      {props.children}
    </section>
  );
}

/** Distance bounds: a geodesic floor and a fibre delay budget, both bounded. */
function BoundsBlock(props: {
  bounds: DistanceBounds;
  unit: DistanceUnit;
  language: Language;
}) {
  const { t } = useI18n();
  const { bounds, unit, language } = props;
  return (
    <Block testId="insights-bounds" title={t('insights.bounds')} level="inferred">
      {bounds.max_km === null ? (
        <>
          <p data-testid="insights-bounds-value">
            {formatQualifiedDistance(bounds.min_km, unit, language)}
          </p>
          <p className="card-line" data-testid="insights-bounds-unknown">
            {t('insights.boundsUnknown')}
          </p>
        </>
      ) : (
        <p data-testid="insights-bounds-value">
          {t('insights.boundsValue', {
            min: formatDistance(bounds.min_km, unit, language),
            max: formatDistance(bounds.max_km, unit, language),
          })}
        </p>
      )}
      <p className="card-line" data-testid="insights-bounds-note">
        {bounds.note[language]}
      </p>
    </Block>
  );
}

function formatShare(share: number | null, language: Language): string {
  if (share === null) return '—';
  return `${formatInteger(share * 100, language)} %`;
}

/** Measured round trip, light floor and the residual left for the rest. */
function BreakdownBlock(props: { breakdown: DelayBreakdown; language: Language }) {
  const { t } = useI18n();
  const { breakdown, language } = props;
  // The headline of the block is the measured round trip; the residual it
  // carries is inferred, and the core's note says so.
  const level: Certainty = breakdown.rtt_ms !== null ? 'measured' : 'inferred';
  return (
    <Block testId="insights-breakdown" title={t('insights.breakdown')} level={level}>
      {breakdown.rtt_ms === null ? (
        <p data-testid="insights-breakdown-unknown">{t('insights.breakdownUnknown')}</p>
      ) : (
        <p data-testid="insights-breakdown-value">
          {t('insights.breakdownValue', {
            rtt: formatMs(breakdown.rtt_ms, language),
            floor: formatMs(breakdown.propagation_floor_ms, language),
            residual: formatMs(breakdown.residual_ms, language),
            share: formatShare(breakdown.residual_share, language),
          })}
        </p>
      )}
      <p className="card-line" data-testid="insights-breakdown-note">
        {breakdown.note[language]}
      </p>
    </Block>
  );
}

function MediaItem(props: { item: MediumCheck; language: Language }) {
  const { t } = useI18n();
  const { item, language } = props;
  const noteId = `insights-media-note-${item.medium}`;
  return (
    <li
      className={item.compatible ? 'media-item' : 'media-item media-item-muted'}
      data-testid={`insights-media-${item.medium}`}
      data-verdict={item.compatible ? 'possible' : 'ruled-out'}
      aria-describedby={noteId}
    >
      <span className="media-name">{formatMediaLabel(item.medium, language)}</span>
      <span className="media-min-rtt">{formatMs(item.min_rtt_ms, language)}</span>
      <span className="media-verdict">
        {item.compatible ? t('insights.mediaPossible') : t('insights.mediaImpossible')}
      </span>
      <span className="sr-only" id={noteId}>
        {item.note}
      </span>
    </li>
  );
}

/** The five media, each with the minimum round trip it would need. */
function MediaBlock(props: { media: MediumCheck[]; language: Language }) {
  const { t } = useI18n();
  return (
    <Block testId="insights-media" title={t('insights.media')} level="inferred">
      <ul className="media-list" data-testid="insights-media-list">
        {props.media.map((item) => (
          <MediaItem key={item.medium} item={item} language={props.language} />
        ))}
      </ul>
    </Block>
  );
}

/**
 * The same journey in another year: how many cables the dataset dates to that
 * year, how many are compatible then and now, and the core's verdict, which
 * states the blind spot of the dataset and never names a cable.
 */
function EraBlock(props: {
  model: InsightsModel;
  year: number;
  onYearChange: (year: number) => void;
}) {
  const { t, language } = useI18n();
  const { model, year, onYearChange } = props;
  const era = model.era;
  return (
    <Block testId="insights-era" title={t('insights.era', { year })} level="inferred">
      <label className="insights-era-label" htmlFor="insights-era-year">
        {t('insights.eraPicker')}
      </label>
      <select
        id="insights-era-year"
        data-testid="insights-era-year"
        value={year}
        onChange={(event) => onYearChange(Number(event.target.value))}
      >
        {model.eraYears.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <p data-testid="insights-era-available">
        {t('insights.eraAvailable', { count: era.available_then, year })}
      </p>
      <p data-testid="insights-era-then">
        {t('insights.eraThen', { count: era.compatible_then.length })}
      </p>
      <p data-testid="insights-era-now">
        {t('insights.eraNow', { count: era.compatible_now.length })}
      </p>
      <p className="card-line" data-testid="insights-era-verdict" data-undated={era.undated}>
        {era.verdict[language]}
      </p>
    </Block>
  );
}

/** The cables of the dataset, loaded once when the parent does not pass them. */
function useCables(provided?: Cable[]): Cable[] {
  const [loaded, setLoaded] = useState<Cable[]>(NO_CABLES);
  useEffect(() => {
    if (provided) return undefined;
    let alive = true;
    void loadDatasets()
      .then((datasets) => {
        if (alive) setLoaded(datasets.cables);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [provided]);
  return provided ?? loaded;
}

/**
 * The insights panel: what the numbers say about this journey — distance
 * bounds, where the delay goes, which medium could explain it, and the same
 * journey seen from another year.
 */
export function JourneyInsights(props: { journey: Journey; cables?: Cable[] }) {
  const { t, language } = useI18n();
  const { prefs } = usePreferences();
  const { journey } = props;
  const traceYear = traceYearOf(journey);
  const [year, setYear] = useState(traceYear);
  const cables = useCables(props.cables);
  const model = useMemo(() => insightsModel(journey, cables, year), [journey, cables, year]);

  useEffect(() => {
    setYear(traceYear);
  }, [traceYear]);

  return (
    <section className="insights-panel" data-testid="journey-insights" aria-labelledby="insights-title">
      <h2 id="insights-title">{t('insights.title')}</h2>
      <BoundsBlock bounds={model.bounds} unit={prefs.unit} language={language} />
      <BreakdownBlock breakdown={model.breakdown} language={language} />
      <MediaBlock media={model.media} language={language} />
      <EraBlock model={model} year={year} onYearChange={setYear} />
      <p className="honesty-line" data-testid="insights-certainty">
        {t('insights.certaintyNote')}
      </p>
    </section>
  );
}
