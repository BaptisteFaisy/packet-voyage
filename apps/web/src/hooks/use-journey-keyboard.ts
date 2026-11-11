import { useEffect } from 'react';
import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { useJourneyState } from '../state/journey.tsx';

/**
 * Global keyboard stepping of the journey (VOY-F-34, §12.4): arrows move
 * between hops, Escape closes the open card. Announcements feed the
 * aria-live region.
 */
export function useJourneyKeyboard(journey: Journey): void {
  const { t } = useI18n();
  const { announce, selectHop, selectSegment, selectedHop } = useJourneyState();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        selectHop(null);
        selectSegment(null);
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      const current = selectedHop ?? journey.hops[0]?.ttl ?? 1;
      const index = journey.hops.findIndex((hop) => hop.ttl === current);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const next = journey.hops[Math.min(journey.hops.length - 1, Math.max(0, index + delta))];
      if (next) {
        selectHop(next.ttl);
        announce(`${t('hop.title', { ttl: next.ttl })}`);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [journey.hops, selectedHop, selectHop, selectSegment, announce, t]);
}
