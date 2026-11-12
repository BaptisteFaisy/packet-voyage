/**
 * Where the figures on this page come from.
 *
 * A block that shows "6 254 km" must also say what that number was measured
 * from: the vendored datasets, their licences and the day they were retrieved —
 * read from the bundle, never fetched. The full provenance is one click away on
 * the sources page; this line is the proof that stays next to the numbers.
 */
import { useI18n } from '../../i18n/context.tsx';
import { formatDate } from '../../lib/format.ts';
import { useProvenanceData } from '../../hooks/use-provenance.ts';

export function DataProvenance() {
  const { t, language } = useI18n();
  const { rows } = useProvenanceData();
  if (rows.length === 0) return null;

  return (
    <p className="feature-provenance hint" data-testid="feature-provenance">
      <span className="proof-label">{t('proof.datasets')}</span>
      {rows.map((row) => (
        <span className="proof-dataset" key={row.id} data-testid={`proof-dataset-${row.id}`}>
          {row.title} — {row.licence}, {t('proof.retrieved', { date: formatDate(row.retrievedAt, language) })}
        </span>
      ))}
      <span className="hint">{t('proof.dataHint')}</span>
    </p>
  );
}
