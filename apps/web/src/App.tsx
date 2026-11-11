import { useEffect, useMemo } from 'react';
import { I18nProvider } from './i18n/context.tsx';
import { useI18n } from './i18n/context.tsx';
import { PreferencesProvider, usePreferences } from './state/preferences.tsx';
import { JourneyProvider, useJourneyState } from './state/journey.tsx';
import { useHashRoute } from './hooks/use-hash-route.ts';
import { galleryAvailable, loadGallery } from './lib/gallery.ts';
import type { GalleryItem } from './lib/gallery.ts';
import { preloadOptionalCore } from './lib/journey-source.ts';
import { SiteHeader } from './components/SiteHeader.tsx';
import { SiteFooter } from './components/SiteFooter.tsx';
import { HomeView } from './components/HomeView.tsx';
import { JourneyView } from './components/JourneyView.tsx';
import { StoryView } from './components/StoryView.tsx';
import { PassportView } from './components/PassportView.tsx';
import { ClassroomView } from './components/ClassroomView.tsx';
import { SourcesView } from './components/SourcesView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { CompareView } from './components/CompareView.tsx';

function JourneyRoute({ slug, items }: { slug: string | null; items: GalleryItem[] }) {
  const { t } = useI18n();
  const { journey, setJourney } = useJourneyState();

  useEffect(() => {
    if (!slug || slug === 'pasted') return;
    const item = items.find((entry) => entry.slug === slug);
    if (item) setJourney(item.journey);
  }, [slug, items, setJourney]);

  if (!journey) {
    return (
      <p className="notice" data-testid="journey-missing">
        {t('journey.notFound')}
      </p>
    );
  }
  return <JourneyView journey={journey} />;
}

function StoryRoute({ items }: { items: GalleryItem[] }) {
  const { journey } = useJourneyState();
  const target = journey ?? items[0]?.journey ?? null;
  if (!target) return null;
  return (
    <>
      <StoryView journey={target} />
      <PassportView journey={target} />
    </>
  );
}

function renderRoute(routeName: string, slug: string | null, items: GalleryItem[]) {
  switch (routeName) {
    case 'journey':
      return <JourneyRoute slug={slug} items={items} />;
    case 'compare':
      return <CompareView items={items} />;
    case 'story':
      return <StoryRoute items={items} />;
    case 'classroom':
      return <ClassroomView />;
    case 'sources':
      return <SourcesRoute items={items} />;
    case 'settings':
      return <SettingsView />;
    default:
      return <HomeView items={items} fromGallery={galleryAvailable()} />;
  }
}

function SourcesRoute({ items }: { items: GalleryItem[] }) {
  const { journey } = useJourneyState();
  return <SourcesView journey={journey ?? items[0]?.journey ?? null} />;
}

function Shell() {
  const route = useHashRoute();
  const { journey } = useJourneyState();
  const items = useMemo(() => loadGallery(), []);

  useEffect(() => {
    preloadOptionalCore();
  }, []);

  return (
    <div className="app">
      <SiteHeader />
      <main className="app-main">{renderRoute(route.name, route.slug, items)}</main>
      <SiteFooter journey={journey} />
    </div>
  );
}

function Localized() {
  const { prefs } = usePreferences();
  return (
    <I18nProvider language={prefs.language}>
      <Shell />
    </I18nProvider>
  );
}

/** Application root: providers, hash router, screens (§5.9). */
export function App() {
  return (
    <PreferencesProvider>
      <JourneyProvider>
        <Localized />
      </JourneyProvider>
    </PreferencesProvider>
  );
}

export default App;
