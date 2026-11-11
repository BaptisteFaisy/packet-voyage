import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { useJourneyState } from '../state/journey.tsx';
import { HopCard } from './HopCard.tsx';
import { CrossingCard } from './CrossingCard.tsx';

/**
 * Side panel of the journey screen (§12.1 screens 3 & 4): the hop card when
 * a hop is open, the crossing card when a segment is open. Escape closes it
 * (§12.4, handled globally by `useJourneyKeyboard`).
 */
export function DetailPanel({ journey }: { journey: Journey }) {
  const { t } = useI18n();
  const { selectedHop, selectedSegment, selectHop, selectSegment } = useJourneyState();

  if (selectedHop === null && selectedSegment === null) return null;

  const hop = selectedHop === null ? null : journey.hops.find((entry) => entry.ttl === selectedHop);
  const segment =
    selectedSegment === null
      ? null
      : journey.segments.find(
          (entry) =>
            entry.from_ttl === selectedSegment.from && entry.to_ttl === selectedSegment.to,
        );

  const close = () => {
    selectHop(null);
    selectSegment(null);
  };

  return (
    <aside className="detail-panel" data-testid="detail-panel">
      <button
        type="button"
        className="close-button"
        onClick={close}
        data-testid="close-detail"
      >
        {t('hop.closeCard')}
      </button>
      {hop ? <HopCard hop={hop} /> : null}
      {segment ? <CrossingCard journey={journey} segment={segment} /> : null}
    </aside>
  );
}
