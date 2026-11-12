/**
 * Everything the tool does, shown on a real journey.
 *
 * The point of this page is that a visitor never has to guess: every capability
 * is on screen, with the numbers it produces, and the views that go further are
 * one click away (§12.1, and the honesty contract: nothing is claimed here that
 * is not shown).
 */
import { useMemo } from 'react';
import { useI18n } from '../i18n/context.tsx';
import { routeHref } from '../lib/route.ts';
import type { GalleryItem } from '../lib/gallery.ts';
import { useJourneyDatasets } from '../hooks/use-datasets.ts';
import { CliCommands } from './CliCommands.tsx';
import { CompareView } from './CompareView.tsx';
import { DelayTimeline } from './DelayTimeline.tsx';
import { ExportPanel } from './ExportPanel.tsx';
import { HopCard } from './HopCard.tsx';
import { JourneyInsights } from './JourneyInsights.tsx';
import { MapLegend } from './MapLegend.tsx';
import { PassportView } from './PassportView.tsx';
import { RoadmapTable } from './RoadmapTable.tsx';
import { ScalePanel } from './ScalePanel.tsx';
import { StoryView } from './StoryView.tsx';
import { WorldMap } from './WorldMap.tsx';

export interface FeaturesViewProps {
  items: GalleryItem[];
}

const CLI_COMMANDS = [
  { label: 'Trace one host', command: 'npx packet-voyage trace example.org' },
  { label: 'Read a trace you already have', command: 'npx packet-voyage read trace.txt' },
  { label: 'Explain the journey', command: 'npx packet-voyage explain journey.json --year 1987' },
  { label: 'Export for a ticket or a GIS', command: 'npx packet-voyage export journey.json --format geojson' },
];

function Section({
  id,
  title,
  text,
  children,
}: {
  id: string;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <section className="feature-block" data-testid={`feature-${id}`} id={`feature-${id}`}>
      <h3>{title}</h3>
      <p className="feature-text">{text}</p>
      {children}
    </section>
  );
}

/** The blocks that need a journey: map, timeline, hop, insights, table, exports. */
function JourneyFeatures({ items }: { items: GalleryItem[] }) {
  const { t } = useI18n();
  const { masses, cables } = useJourneyDatasets();
  const demo = items[0];
  const journey = demo?.journey ?? null;
  const rejectedHop = useMemo(
    () => journey?.hops.find((hop) => (hop.location?.rejected.length ?? 0) > 0) ?? journey?.hops[3] ?? null,
    [journey],
  );
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

      {rejectedHop ? (
        <Section id="hop" title={t('features.hop.title')} text={t('features.hop.text')}>
          <HopCard hop={rejectedHop} />
        </Section>
      ) : null}

      <Section id="insights" title={t('features.insights.title')} text={t('features.insights.text')}>
        <JourneyInsights journey={journey} cables={cables} />
        <ScalePanel journey={journey} />
      </Section>

      <Section id="roadmap" title={t('features.roadmap.title')} text={t('features.roadmap.text')}>
        <RoadmapTable journey={journey} />
      </Section>

      <Section id="export" title={t('features.export.title')} text={t('features.export.text')}>
        <ExportPanel journey={journey} slug={demo?.slug} />
      </Section>

      <Section id="story" title={t('features.story.title')} text={t('features.story.text')}>
        <StoryView journey={journey} />
        <PassportView journey={journey} />
      </Section>

      <Section id="compare" title={t('features.compare.title')} text={t('features.compare.text')}>
        <CompareView items={items} />
      </Section>
    </>
  );
}

/** The catalogue: one block per capability, each with a live example. */
export function FeaturesView({ items }: FeaturesViewProps) {
  const { t } = useI18n();
  return (
    <div className="features-view" data-testid="features-view">
      <h2>{t('features.title')}</h2>
      <p className="feature-text">{t('features.subtitle')}</p>
      <JourneyFeatures items={items} />

      <Section id="classroom" title={t('features.classroom.title')} text={t('features.classroom.text')}>
        <a className="button" href={routeHref('classroom')} data-testid="feature-open-classroom">
          {t('features.open')}
        </a>
      </Section>

      <Section id="sources" title={t('features.sources.title')} text={t('features.sources.text')}>
        <a className="button" href={routeHref('sources')} data-testid="feature-open-sources">
          {t('features.open')}
        </a>
      </Section>

      <Section id="paste" title={t('features.paste.title')} text={t('features.paste.text')}>
        <a className="button" href={routeHref('gallery')} data-testid="feature-open-paste">
          {t('features.open')}
        </a>
      </Section>

      <Section id="cli" title={t('features.cli.title')} text={t('features.cli.text')}>
        <CliCommands commands={CLI_COMMANDS} note={t('paste.cliHint')} />
      </Section>
    </div>
  );
}
