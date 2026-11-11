/**
 * Gallery loading (VOY-F-44). `gallery/` (L10) is read at build time through
 * a Vite glob import so the site makes zero request at runtime (VOY-N-01).
 * While the gallery is not built yet, the six contract slugs are offered with
 * the fixture journey, and the UI shows a "gallery not built yet" notice.
 */
import type { Journey, Summary } from '@packet-voyage/schema';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';

export const GALLERY_SLUGS = [
  'ocean-crossing',
  'continental',
  'detour',
  'rejected-by-light',
  'anycast',
  'with-gaps',
] as const;

export interface GalleryIndexEntry {
  slug: string;
  title?: string;
  en?: string;
  fr?: string;
  family?: 4 | 6;
  summary?: Summary | null;
}

export interface GalleryItem {
  slug: string;
  title: string;
  en: string;
  fr: string;
  family: 4 | 6;
  journey: Journey;
  fromGallery: boolean;
}

const indexModules = import.meta.glob<{ default: GalleryIndexEntry[] }>(
  '../../../../gallery/index.json',
  { eager: true },
);
const journeyModules = import.meta.glob<{ default: Journey }>(
  '../../../../gallery/*/journey.json',
  { eager: true },
);

function slugFromPath(path: string): string | null {
  const match = /gallery\/([^/]+)\/journey\.json$/.exec(path);
  return match?.[1] ?? null;
}

function builtJourneys(): Map<string, Journey> {
  const map = new Map<string, Journey>();
  for (const [path, mod] of Object.entries(journeyModules)) {
    const slug = slugFromPath(path);
    if (slug && mod?.default) map.set(slug, mod.default);
  }
  return map;
}

function builtIndex(): GalleryIndexEntry[] {
  for (const mod of Object.values(indexModules)) {
    if (Array.isArray(mod?.default)) return mod.default;
  }
  return [];
}

export function galleryAvailable(): boolean {
  return Object.keys(journeyModules).length > 0;
}

const TITLES: Record<string, { en: string; fr: string }> = {
  'ocean-crossing': { en: 'Ocean crossing', fr: 'Traversée océanique' },
  continental: { en: 'Continental route', fr: 'Trajet continental' },
  detour: { en: 'The detour', fr: 'Le détour' },
  'rejected-by-light': { en: 'Rejected by light', fr: 'Rejeté par la lumière' },
  anycast: { en: 'Anycast hop', fr: 'Étape anycast' },
  'with-gaps': { en: 'Trace with gaps', fr: 'Trace avec trous' },
};

function titleFor(slug: string, entry?: GalleryIndexEntry): { en: string; fr: string } {
  const base = TITLES[slug] ?? { en: slug, fr: slug };
  return {
    en: entry?.en ?? entry?.title ?? base.en,
    fr: entry?.fr ?? entry?.title ?? base.fr,
  };
}

/** The six contract journeys; the fixture backs every missing slug. */
export function loadGallery(): GalleryItem[] {
  const journeys = builtJourneys();
  const index = builtIndex();
  const indexBySlug = new Map(index.map((entry) => [entry.slug, entry]));
  const slugs = [...new Set<string>([...GALLERY_SLUGS, ...journeys.keys()])];
  return slugs
    .sort((a, b) => {
      const ai = GALLERY_SLUGS.indexOf(a as (typeof GALLERY_SLUGS)[number]);
      const bi = GALLERY_SLUGS.indexOf(b as (typeof GALLERY_SLUGS)[number]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
    })
    .map((slug) => {
      const entry = indexBySlug.get(slug);
      const titles = titleFor(slug, entry);
      const journey = journeys.get(slug) ?? SAMPLE_JOURNEY;
      return {
        slug,
        title: titles.en,
        en: titles.en,
        fr: titles.fr,
        family: entry?.family ?? journey.family,
        journey,
        fromGallery: journeys.has(slug),
      };
    });
}

export function findGalleryItem(slug: string): GalleryItem | null {
  return loadGallery().find((item) => item.slug === slug) ?? null;
}
