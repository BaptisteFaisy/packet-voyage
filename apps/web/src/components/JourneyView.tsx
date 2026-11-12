import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { useJourneyState } from '../state/journey.tsx';
import { useJourneyKeyboard } from '../hooks/use-journey-keyboard.ts';
import { useJourneyDatasets } from '../hooks/use-datasets.ts';
import { SummaryBanner } from './SummaryBanner.tsx';
import { WorldMap } from './WorldMap.tsx';
import { ExportImageButton } from './ExportImageButton.tsx';
import { ExportPanel } from './ExportPanel.tsx';
import { JourneyInsights } from './JourneyInsights.tsx';
import { ScalePanel } from './ScalePanel.tsx';
import { MapLegend } from './MapLegend.tsx';
import { DelayTimeline } from './DelayTimeline.tsx';
import { HopList } from './HopList.tsx';
import { DetailPanel } from './DetailPanel.tsx';
import { RoadmapTable } from './RoadmapTable.tsx';

/**
 * The journey screen (§12.1 screen 2): banner on top, map in the centre,
 * hop list on the left, delay timeline at the bottom, and the roadmap table
 * that carries everything the map shows (VOY-F-30..34).
 */
export function JourneyView({ journey, slug }: { journey: Journey; slug?: string }) {
  const { t } = useI18n();
  const { announcement } = useJourneyState();
  const { masses, cables } = useJourneyDatasets();
  useJourneyKeyboard(journey);

  return (
    <div className="journey-view" data-testid="journey-view">
      <SummaryBanner journey={journey} />
      <p className="sr-only" role="status" aria-live="polite" data-testid="live-region">
        {announcement}
      </p>
      <div className="journey-layout">
        <HopList journey={journey} />
        <div className="journey-centre">
          <WorldMap journey={journey} masses={masses} cables={cables} />
          {masses.length === 0 ? <p className="map-notice">{t('map.notBuilt')}</p> : null}
          <MapLegend journey={journey} />
          <ExportImageButton journey={journey} masses={masses} cables={cables} />
        </div>
        <DetailPanel journey={journey} />
      </div>
      <DelayTimeline journey={journey} />
      <JourneyInsights journey={journey} cables={cables} />
      <ScalePanel journey={journey} />
      <ExportPanel journey={journey} slug={slug} />
      <RoadmapTable journey={journey} />
    </div>
  );
}
