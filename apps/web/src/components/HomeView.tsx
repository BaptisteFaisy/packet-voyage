import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { navigateTo } from '../hooks/use-hash-route.ts';
import { STATE_SLUGS } from '../lib/route.ts';
import { useJourneyState } from '../state/journey.tsx';
import type { GalleryItem } from '../lib/gallery.ts';
import { GalleryView } from './GalleryView.tsx';
import { ImportJourney } from './ImportJourney.tsx';
import { PasteTrace } from './PasteTrace.tsx';

interface HomeViewProps {
  items: GalleryItem[];
  fromGallery: boolean;
}

/** Home screen (§12.1 screen 1): the gallery, the paste zone, the CLI hint. */
export function HomeView({ items, fromGallery }: HomeViewProps) {
  const { t } = useI18n();
  const { setJourney } = useJourneyState();

  const open = (item: GalleryItem) => {
    setJourney(item.journey);
    navigateTo(`#/journey/${item.slug}`);
  };

  const onPasted = (journey: Journey) => {
    setJourney(journey);
    navigateTo(`#/journey/${STATE_SLUGS.pasted}`);
  };

  const onImported = (journey: Journey) => {
    setJourney(journey);
    navigateTo(`#/journey/${STATE_SLUGS.imported}`);
  };

  return (
    <div className="home-view" data-testid="home-view">
      <GalleryView items={items} fromGallery={fromGallery} onOpen={open} />
      <div className="home-entry-points">
        <PasteTrace onComputed={onPasted} />
        <ImportJourney onImported={onImported} />
      </div>
      <p className="cli-hint mono" data-testid="cli-hint">
        {t('paste.cliHint')}
      </p>
    </div>
  );
}
