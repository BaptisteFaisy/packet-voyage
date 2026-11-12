import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { usePreferences } from '../state/preferences.tsx';
import { formatMs, formatQualifiedDistance } from '../lib/format.ts';
import { hopRow, interleaveRows, segmentRow } from '../lib/table-model.ts';
import type { RoadmapRow } from '../lib/table-model.ts';

function Row({ row }: { row: RoadmapRow }) {
  const { language } = useI18n();
  const { prefs } = usePreferences();
  return (
    <tr
      className={`roadmap-row roadmap-${row.kind}`}
      data-testid={`roadmap-row-${row.key}`}
      id={`roadmap-${row.key}`}
    >
      <th scope="row">{row.kind === 'hop' ? row.ttl : `${row.ttl}→${row.toTtl}`}</th>
      <td>{row.kind === 'hop' ? 'hop' : 'segment'}</td>
      <td className={row.kind === 'hop' ? 'mono' : ''}>{row.label}</td>
      <td>
        {row.certainty}
        <span className="cell-sub"> · {row.confidence}</span>
      </td>
      <td className="mono">{formatMs(row.delayMs, language)}</td>
      {/* The local hour deduced from the longitude: inferred, and labelled so. */}
      <td className="mono">{row.localTime ?? '—'}</td>
      <td className="mono">
        {row.distanceKm === null
          ? '—'
          : formatQualifiedDistance(row.distanceKm, prefs.unit, language)}
      </td>
      <td>
        {row.details}
        <span className="cell-sub"> · {row.sources}</span>
      </td>
    </tr>
  );
}

/**
 * Roadmap table (VOY-F-33, VOY-N-08): a real `<table>` carrying everything
 * the map shows — every hop and every segment, in hop order — so a screen
 * reader gets the same information as the canvas.
 */
export function RoadmapTable({ journey }: { journey: Journey }) {
  const { t } = useI18n();
  const rows = interleaveRows(
    journey.hops.map((hop) => hopRow(hop)),
    journey.segments.map((segment) => segmentRow(segment, journey)),
  );
  return (
    <section className="roadmap" aria-labelledby="roadmap-title">
      <h2 id="roadmap-title">{t('roadmap.title')}</h2>
      <p className="roadmap-subtitle">{t('roadmap.subtitle')}</p>
      <div className="table-scroll">
        <table data-testid="roadmap-table">
          <caption>{t('roadmap.subtitle')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('roadmap.th.order')}</th>
              <th scope="col">{t('roadmap.th.type')}</th>
              <th scope="col">{t('roadmap.th.details')}</th>
              <th scope="col">{t('roadmap.th.certainty')}</th>
              <th scope="col">{t('roadmap.th.delay')}</th>
              <th scope="col">{t('clock.localTime')}</th>
              <th scope="col">{t('roadmap.th.distance')}</th>
              <th scope="col">{t('roadmap.th.sources')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.key} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
