import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { useProvenanceData } from '../hooks/use-provenance.ts';
import { ProvenanceTable } from './sources/ProvenanceTable.tsx';

function JourneyCreditsList({ credits }: { credits: string[] }) {
  const { t } = useI18n();
  if (credits.length === 0) return null;
  return (
    <section className="journey-credits" data-testid="journey-credits">
      <h3>{t('sources.journeyCredits')}</h3>
      <ul>
        {credits.map((credit) => (
          <li key={credit}>{credit}</li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Sources & licences (VOY-F-48, VOY-N-11): generated from the provenance
 * sheets of `packages/data`, with the retrieval dates and a discreet warning
 * when a dataset is older than 90 days.
 */
export function SourcesView({ journey }: { journey: Journey | null }) {
  const { t } = useI18n();
  const { rows, loaded } = useProvenanceData();

  return (
    <section className="sources-view" data-testid="sources-view">
      <h2>{t('sources.title')}</h2>
      <p>{t('sources.description')}</p>
      <p className="notice" data-testid="sources-zero-network">
        {t('sources.zeroNetwork')}
      </p>

      {rows.length > 0 ? (
        <ProvenanceTable rows={rows} />
      ) : (
        <p className="notice" data-testid="sources-not-built">
          {loaded ? t('sources.noSheets') : t('common.loading')}
        </p>
      )}

      {journey ? <JourneyCreditsList credits={journey.credits} /> : null}
    </section>
  );
}
