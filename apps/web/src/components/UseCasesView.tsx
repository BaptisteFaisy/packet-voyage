/**
 * The ten best use cases, each one a click away from the journey that proves it.
 *
 * A use case is not a promise: it is a person, a question, and the capability
 * that answers it. Clicking loads the gallery journey that demonstrates it and
 * steps to the catalogue block that replies, so every case here is a live demo,
 * not a paragraph.
 */
import type { GalleryItem } from '../lib/gallery.ts';
import { USE_CASES } from '../lib/use-cases.ts';
import { caseText } from '../lib/use-cases.ts';
import { useI18n } from '../i18n/context.tsx';
import { navigateTo } from '../hooks/use-hash-route.ts';
import { useJourneyState } from '../state/journey.tsx';

export interface UseCasesViewProps {
  items: GalleryItem[];
}

export function UseCasesView({ items }: UseCasesViewProps) {
  const { t, language } = useI18n();
  const { setJourney } = useJourneyState();

  const open = (slug: string, block: string) => {
    const item = items.find((entry) => entry.slug === slug);
    if (item) setJourney(item.journey);
    navigateTo('#/features');
    window.setTimeout(() => {
      document.getElementById(`feature-${block}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 80);
  };

  return (
    <div className="use-cases-view" data-testid="use-cases-view">
      <h2>{t('usecases.title')}</h2>
      <p className="feature-text">{t('usecases.intro')}</p>
      <ol className="use-case-list">
        {USE_CASES.map((uc) => (
          <li className="use-case" key={uc.id} data-testid={`use-case-${uc.id}`}>
            <span className="use-case-num">{String(uc.num).padStart(2, '0')}</span>
            <div className="use-case-body">
              <h3>{caseText(uc, language, 'title')}</h3>
              <p className="persona">{caseText(uc, language, 'persona')}</p>
              <p className="question">« {caseText(uc, language, 'question')} »</p>
              <p className="answer">{caseText(uc, language, 'answer')}</p>
              <button type="button" className="button" onClick={() => open(uc.slug, uc.block)}>
                {t('usecases.try')}
              </button>
            </div>
          </li>
        ))}
      </ol>
      <p className="hint">{t('usecases.note')}</p>
    </div>
  );
}