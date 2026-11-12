/**
 * Taking the journey away, telling it, and comparing it: the three blocks that
 * produce something the visitor keeps. Like the route blocks, they run on the
 * journey they are given, so the exports and the story are the visitor's own
 * when a journey is loaded — never a sample presented as theirs — and each one
 * shows the figures it produced.
 */
import type { Cable, Journey, Landmass } from '@packet-voyage/schema';
import { useI18n } from '../../i18n/context.tsx';
import type { GalleryItem } from '../../lib/gallery.ts';
import { CompareView } from '../CompareView.tsx';
import { ExportImageButton } from '../ExportImageButton.tsx';
import { ExportPanel } from '../ExportPanel.tsx';
import { PassportView } from '../PassportView.tsx';
import { StoryView } from '../StoryView.tsx';
import { ProofedSection } from './ProofedSection.tsx';

export interface TakeawayBlocksProps {
  journey: Journey | null;
  /** Set only for a gallery journey: its share link is then a short address. */
  slug?: string;
  masses: Landmass[];
  cables: Cable[];
  /** What the comparison block may choose from. */
  items: GalleryItem[];
}

export function TakeawayBlocks({ journey, slug, masses, cables, items }: TakeawayBlocksProps) {
  const { t } = useI18n();
  if (!journey) return null;

  return (
    <>
      <ProofedSection
        id="export"
        title={t('features.export.title')}
        text={t('features.export.text')}
        journey={journey}
        block="export"
      >
        <ExportPanel journey={journey} slug={slug} />
        <ExportImageButton journey={journey} masses={masses} cables={cables} />
      </ProofedSection>

      <ProofedSection
        id="story"
        title={t('features.story.title')}
        text={t('features.story.text')}
        journey={journey}
        block="story"
      >
        <StoryView journey={journey} />
        <PassportView journey={journey} />
      </ProofedSection>

      <ProofedSection
        id="compare"
        title={t('features.compare.title')}
        text={t('features.compare.text')}
        journey={journey}
        block="compare"
        available={items.length}
      >
        <CompareView items={items} />
      </ProofedSection>
    </>
  );
}
