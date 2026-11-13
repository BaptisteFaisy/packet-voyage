import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { usePreferences } from '../state/preferences.tsx';
import { formatMs, formatQualifiedDistance } from '../lib/format.ts';
import type { GalleryItem } from '../lib/gallery.ts';

interface GalleryViewProps {
  items: GalleryItem[];
  fromGallery: boolean;
  onOpen: (item: GalleryItem) => void;
}

function Card({ item, onOpen }: { item: GalleryItem; onOpen: (item: GalleryItem) => void }) {
  const { t, language } = useI18n();
  const { prefs } = usePreferences();
  const title = language === 'fr' ? item.fr : item.en;
  const summary = item.journey.summary;
  return (
    <li className="gallery-card" data-testid={`gallery-card-${item.slug}`}>
      <h3>{title}</h3>
      <p className="gallery-meta mono">
        {formatQualifiedDistance(summary.distance_km_min, prefs.unit, language)} · {formatMs(summary.rtt_ms, language)} ·
        IPv{item.family}
      </p>
      <p className="gallery-meta">
        {summary.countries.join(' → ') || '—'}
      </p>
      <button type="button" onClick={() => onOpen(item)} data-testid={`gallery-open-${item.slug}`}>
        {t('gallery.loadButton')}
      </button>
    </li>
  );
}

/**
 * Gallery view (VOY-F-44): the six journeys of the contract, loaded in one
 * click. When `gallery/` is not built yet, the fixture backs every card and
 * a plain notice says so (no console noise).
 */
export function GalleryView({ items, fromGallery, onOpen }: GalleryViewProps) {
  const { t } = useI18n();
  return (
    <section className="gallery-view" data-testid="gallery-view">
      <h2>{t('gallery.title')}</h2>
      <p>{t('gallery.description')}</p>
      {!fromGallery ? (
        <p className="notice" role="status" data-testid="gallery-notice">
          {t('gallery.noticeFallback')}
        </p>
      ) : null}
      <ul className="gallery-grid">
        {items.map((item) => (
          <Card key={item.slug} item={item} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

export function firstGalleryJourney(items: GalleryItem[]): Journey | null {
  return items[0]?.journey ?? null;
}
