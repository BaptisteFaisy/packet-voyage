/**
 * Everything the tool does, shown on a real journey.
 *
 * The point of this page is that a visitor never has to guess: every capability
 * is on screen, with the numbers it produces, and the views that go further are
 * one click away (§12.1, and the honesty contract: nothing is claimed here that
 * is not shown).
 *
 * "A real journey" is the visitor's own as soon as one is loaded — pasted,
 * imported from a `journey.json`, or opened from a share link — and the gallery
 * sample otherwise. The source of the numbers is named on screen, and switching
 * back to the sample is one click (§12.2: no ambiguity about whose data this is).
 */
import { useMemo, useState } from 'react';
import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import type { Language } from '../i18n/context.tsx';
import { useJourneyDatasets } from '../hooks/use-datasets.ts';
import { useJourneyState } from '../state/journey.tsx';
import type { GalleryItem } from '../lib/gallery.ts';
import { CatalogueBlocks } from './features/CatalogueBlocks.tsx';
import { DataProvenance } from './features/DataProvenance.tsx';
import { FeatureSource } from './features/FeatureSource.tsx';
import type { FeatureSourceKind } from './features/FeatureSource.tsx';
import { RouteBlocks } from './features/RouteBlocks.tsx';
import { TakeawayBlocks } from './features/TakeawayBlocks.tsx';

export interface FeaturesViewProps {
  items: GalleryItem[];
}

/** Whose journey the catalogue demonstrates, and what the blocks are given. */
interface Demo {
  kind: FeatureSourceKind;
  journey: Journey | null;
  title: string;
  slug?: string;
  items: GalleryItem[];
}

/** The visitor's journey, as an entry the comparison block can select. */
function yourItem(journey: Journey, label: string): GalleryItem {
  return {
    slug: 'yours',
    title: label,
    en: label,
    fr: label,
    family: journey.family,
    journey,
    fromGallery: false,
  };
}

function pickDemo(
  userJourney: Journey | null,
  showDemo: boolean,
  items: GalleryItem[],
  yourLabel: string,
  language: Language,
): Demo {
  if (userJourney && !showDemo) {
    return {
      kind: 'yours',
      journey: userJourney,
      title: yourLabel,
      items: [yourItem(userJourney, yourLabel), ...items],
    };
  }
  const sample = items[0] ?? null;
  return {
    kind: 'gallery',
    journey: sample?.journey ?? null,
    title: sample ? (language === 'fr' ? sample.fr : sample.en) : '',
    slug: sample?.slug,
    items,
  };
}

/** The catalogue: one block per capability, each with a live example. */
export function FeaturesView({ items }: FeaturesViewProps) {
  const { t, language } = useI18n();
  const { journey: userJourney } = useJourneyState();
  const { masses, cables } = useJourneyDatasets();
  // Asking for the sample never destroys the loaded journey: it only steps aside.
  const [showDemo, setShowDemo] = useState(false);

  const yourLabel = t('features.yourJourney');
  const demo = useMemo(
    () => pickDemo(userJourney, showDemo, items, yourLabel, language),
    [userJourney, showDemo, items, yourLabel, language],
  );
  const canSwitch = userJourney !== null;
  const onSwitch = canSwitch ? () => setShowDemo((current) => !current) : null;
  const switchLabel = canSwitch
    ? demo.kind === 'yours'
      ? t('features.backToDemo')
      : t('features.backToYours')
    : null;

  return (
    <div className="features-view" data-testid="features-view">
      <h2>{t('features.title')}</h2>
      <p className="feature-text">{t('features.subtitle')}</p>
      <FeatureSource
        kind={demo.kind}
        journey={demo.journey}
        title={demo.title}
        switchLabel={switchLabel}
        onSwitch={onSwitch}
      />
      <DataProvenance />
      <RouteBlocks journey={demo.journey} masses={masses} cables={cables} />
      <TakeawayBlocks
        journey={demo.journey}
        slug={demo.slug}
        masses={masses}
        cables={cables}
        items={demo.items}
      />
      <CatalogueBlocks />
    </div>
  );
}
