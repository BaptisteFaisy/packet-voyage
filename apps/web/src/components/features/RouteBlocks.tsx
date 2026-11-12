/**
 * The route, shown five ways: on the map, on a millisecond axis, on one hop,
 * as bounds and breakdowns, and as the table a screen reader can follow.
 * Every block here runs on the journey it is given — the gallery sample or the
 * one the visitor pasted, imported or opened from a share link.
 */
import { useMemo } from 'react';
import type { Cable, Journey, Landmass } from '@packet-voyage/schema';
import { useI18n } from '../../i18n/context.tsx';
import { DelayTimeline } from '../DelayTimeline.tsx';
import { HopCard } from '../HopCard.tsx';
import { JourneyInsights } from '../JourneyInsights.tsx';
import { MapLegend } from '../MapLegend.tsx';
import { RoadmapTable } from '../RoadmapTable.tsx';
import { ScalePanel } from '../ScalePanel.tsx';
import { WorldMap } from '../WorldMap.tsx';
import { Section } from './Section.tsx';

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

export function RouteBlocks({ journey, masses, cables }: RouteBlocksProps) {
  const { t } = useI18n();
  const hop = useMemo(() => (journey ? demoHop(journey) : null), [journey]);
  if (!journey) return null;

  return (
    <>
      <Section id="map" title={t('features.map.title')} text={t('features.map.text')}>
        <WorldMap journey={journey} masses={masses} cables={cables} />
        <MapLegend journey={journey} />
      </Section>

      <Section id="timeline" title={t('features.timeline.title')} text={t('features.timeline.text')}>
        <DelayTimeline journey={journey} />
      </Section>

      <Section id="hop" title={t('features.hop.title')} text={t('features.hop.text')}>
        {hop ? <HopCard hop={hop} /> : <p className="hint">{t('features.hopNone')}</p>}
      </Section>

      <Section id="insights" title={t('features.insights.title')} text={t('features.insights.text')}>
        <JourneyInsights journey={journey} cables={cables} />
        <ScalePanel journey={journey} />
      </Section>

      <Section id="roadmap" title={t('features.roadmap.title')} text={t('features.roadmap.text')}>
        <RoadmapTable journey={journey} />
      </Section>
    </>
  );
}
