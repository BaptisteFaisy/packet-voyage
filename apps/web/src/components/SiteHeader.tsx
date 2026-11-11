import { useI18n } from '../i18n/context.tsx';
import { routeHref } from '../lib/route.ts';

const LINKS = [
  { route: 'gallery', key: 'nav.gallery' },
  { route: 'compare', key: 'nav.compare' },
  { route: 'story', key: 'nav.story' },
  { route: 'classroom', key: 'nav.classroom' },
  { route: 'sources', key: 'nav.sources' },
  { route: 'settings', key: 'nav.settings' },
] as const;

/** Site header: brand and hash navigation (§5.9 routes). */
export function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="site-header">
      <a className="brand" href={routeHref('gallery')}>
        <span className="brand-name">{t('brand.name')}</span>
        <span className="brand-tagline">{t('brand.tagline')}</span>
      </a>
      <nav aria-label="Main">
        <ul>
          {LINKS.map((link) => (
            <li key={link.route}>
              <a href={routeHref(link.route)}>{t(link.key)}</a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
