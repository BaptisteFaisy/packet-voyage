import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { routeHref } from '../lib/route.ts';

/**
 * Site footer (VOY-F-48): the data credits are displayed everywhere data is
 * shown, plus the link to the full sources page.
 */
export function SiteFooter({ journey }: { journey: Journey | null }) {
  const { t } = useI18n();
  return (
    <footer className="site-footer" data-testid="site-footer">
      {journey && journey.credits.length > 0 ? (
        <p className="footer-credits" data-testid="footer-credits">
          {journey.credits.join(' · ')}
        </p>
      ) : null}
      <p>
        <a href={routeHref('sources')}>{t('nav.sources')}</a>
      </p>
    </footer>
  );
}
