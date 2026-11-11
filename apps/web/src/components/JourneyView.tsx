import { useEffect, useState } from 'react';
import type { Cable, Journey, Landmass } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { useJourneyState } from '../state/journey.tsx';
import { useJourneyKeyboard } from '../hooks/use-journey-keyboard.ts';
import { loadDatasets } from '../lib/datasets.ts';
import { SummaryBanner } from './SummaryBanner.tsx';
import { WorldMap } from './WorldMap.tsx';
import { MapLegend } from './MapLegend.tsx';
import { DelayTimeline } from './DelayTimeline.tsx';
import { HopList } from './HopList.tsx';
import { DetailPanel } from './DetailPanel.tsx';
import { RoadmapTable } from './RoadmapTable.tsx';

function useJourneyDatasets(): { masses: Landmass[]; cables: Cable[] } {
  const [data, setData] = useState<{ masses: Landmass[]; cables: Cable[] }>({ masses: [], cables: [] });
  useEffect(() => {
    let alive = true;
    void loadDatasets().then((ds) => {
      if (alive) setData({ masses: ds.masses, cables: ds.cables });
    });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

/**
 * The journey screen (§12.1 screen 2): banner on top, map in the centre,
 * hop list on the left, delay timeline at the bottom, and the roadmap table
 * that carries everything the map shows (VOY-F-30..34).
 */
export function JourneyView({ journey }: { journey: Journey }) {
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
        </div>
        <DetailPanel journey={journey} />
      </div>
      <DelayTimeline journey={journey} />
      <RoadmapTable journey={journey} />
    </div>
  );
}
