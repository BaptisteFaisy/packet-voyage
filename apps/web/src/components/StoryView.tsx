import type { Journey, StoryEntry } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';

function entryText(entry: StoryEntry, language: 'en' | 'fr'): string {
  return language === 'fr' ? entry.fr : entry.en;
}

const KIND_ORDER: StoryEntry['kind'][] = ['stop', 'crossing', 'gap', 'rejected', 'arrival'];

/**
 * Travel log (VOY-F-35, §7.12): the journey told by templates, one card per
 * entry, each carrying its certainty level. No language model involved.
 */
export function StoryView({ journey }: { journey: Journey }) {
  const { t, language } = useI18n();
  const entries = journey.story ?? [];
  const sorted = [...entries].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || (a.ttl ?? 0) - (b.ttl ?? 0),
  );

  return (
    <section className="story-view" data-testid="story-view">
      <h2>{t('story.title')}</h2>
      {sorted.length === 0 ? (
        <p className="notice" data-testid="story-empty">
          {t('story.empty')}
        </p>
      ) : (
        <ol className="story-list">
          {sorted.map((entry, index) => (
            <li
              key={`${entry.kind}-${entry.ttl ?? index}-${index}`}
              className={`story-entry story-${entry.kind}`}
              data-testid={`story-entry-${entry.kind}-${entry.ttl ?? index}`}
            >
              <span className="level-badge">{entry.certainty}</span>
              <p>{entryText(entry, language)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
