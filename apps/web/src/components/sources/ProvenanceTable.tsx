import { useI18n } from '../../i18n/context.tsx';
import type { ProvenanceRow } from '../../lib/provenance.ts';
import { formatDate } from '../../lib/format.ts';

function ProvenanceItem({ row }: { row: ProvenanceRow }) {
  const { t, language } = useI18n();
  return (
    <tr data-testid={`provenance-${row.id}`} className={row.stale ? 'is-stale' : ''}>
      <th scope="row">{row.title}</th>
      <td>{row.origin}</td>
      <td>{row.licence}</td>
      <td>
        {formatDate(row.retrievedAt, language)}
        {row.stale ? <span className="stale-flag"> ⚠ {t('sources.staleWarning')}</span> : null}
      </td>
      <td>{row.features}</td>
      <td>{row.attribution}</td>
    </tr>
  );
}

/** The provenance sheets table (VOY-F-48, VOY-N-11). */
export function ProvenanceTable({ rows }: { rows: ProvenanceRow[] }) {
  const { t } = useI18n();
  return (
    <div className="table-scroll">
      <table data-testid="provenance-table">
        <caption>{t('sources.title')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('sources.th.dataset')}</th>
            <th scope="col">{t('sources.th.origin')}</th>
            <th scope="col">{t('sources.th.licence')}</th>
            <th scope="col">{t('sources.th.retrieved')}</th>
            <th scope="col">{t('sources.th.features')}</th>
            <th scope="col">{t('sources.th.attribution')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ProvenanceItem key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
