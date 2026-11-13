/**
 * The route, shown five ways: on the map, on a millisecond axis, on one hop,
 * as bounds and breakdowns, and as the table a screen reader can follow.
 * Every block here runs on the journey it is given — the gallery sample or the
 * one the visitor pasted, imported or opened from a share link — and each one
 * shows the figures it computed, so a reader can see it worked.
 */
import { useMemo } from 'react';
import type { Cable, Hop, Journey, Landmass } from '@packet-voyage/schema';
import { useI18n } from '../../i18n/context.tsx';
import { DelayTimeline } from '../DelayTimeline.tsx';
import { HopCard } from '../HopCard.tsx';
import { JourneyInsights } from '../JourneyInsights.tsx';
import { MapLegend } from '../MapLegend.tsx';
import { RoadmapTable } from '../RoadmapTable.tsx';
import { ScalePanel } from '../ScalePanel.tsx';
import { WorldMap } from '../WorldMap.tsx';
import { ProofedSection } from './ProofedSection.tsx';

export interface RouteBlocksProps {
  journey: Journey | null;
  masses: Landmass[];
  cables: Cable[];
}

/** The hop worth a card: one with a rejected candidate when there is one. */
function demoHop(journey: Journey) {
  return (
    journey.hops.find((hop) => (hop.location?.rejected.length ?? 0) > 0) ??
    journey.hops[3] ??
    journey.hops[0] ??
    null
  );
}

/** The hop block: the card, and the proof of the position it shows. */
function HopBlock({ journey, hop }: { journey: Journey; hop: Hop | null }) {
  const { t } = useI18n();
  return (
    <ProofedSection
      id="hop"
      title={t('features.hop.title')}
      text={t('features.hop.text')}
      journey={journey}
      block="hop"
      hop={hop}
    >
      {hop ? <HopCard hop={hop} /> : <p className="hint">{t('features.hopNone')}</p>}
    </ProofedSection>
  );
}

export function RouteBlocks({ journey, masses, cables }: RouteBlocksProps) {
  const { t } = useI18n();
  const hop = useMemo(() => (journey ? demoHop(journey) : null), [journey]);
  if (!journey) return null;

  return (
    <>
      <ProofedSection
        id="map"
        title={t('features.map.title')}
        text={t('features.map.text')}
        journey={journey}
        block="map"
      >
        <WorldMap journey={journey} masses={masses} cables={cables} />
        <MapLegend journey={journey} />
      </ProofedSection>

      <ProofedSection
        id="timeline"
        title={t('features.timeline.title')}
        text={t('features.timeline.text')}
        journey={journey}
        block="timeline"
      >
        <DelayTimeline journey={journey} />
      </ProofedSection>

      <HopBlock journey={journey} hop={hop} />

      <ProofedSection
        id="insights"
        title={t('features.insights.title')}
        text={t('features.insights.text')}
        journey={journey}
        block="insights"
      >
        <JourneyInsights journey={journey} cables={cables} />
        <ScalePanel journey={journey} />
      </ProofedSection>

      <ProofedSection
        id="roadmap"
        title={t('features.roadmap.title')}
        text={t('features.roadmap.text')}
        journey={journey}
        block="roadmap"
      >
        <RoadmapTable journey={journey} />
      </ProofedSection>
    </>
  );
}
