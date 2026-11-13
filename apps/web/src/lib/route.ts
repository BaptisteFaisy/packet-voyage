export type RouteName =
  | 'features'
  | 'gallery'
  | 'journey'
  | 'compare'
  | 'story'
  | 'classroom'
  | 'sources'
  | 'settings'
  | 'use-cases';

export interface Route {
  name: RouteName;
  slug: string | null;
}

const KNOWN_ROUTES: RouteName[] = [
  'features',
  'gallery',
  'journey',
  'compare',
  'story',
  'classroom',
  'sources',
  'settings',
  'use-cases',
];

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  const parts = clean.split('/').filter((part) => part.length > 0);
  if (parts.length === 0) return { name: 'gallery', slug: null };
  const head = parts[0] ?? '';
  const tail = parts[1] ?? null;
  if (head === 'journey') return { name: 'journey', slug: tail };
  if ((KNOWN_ROUTES as string[]).includes(head)) {
    return { name: head as RouteName, slug: null };
  }
  return { name: 'gallery', slug: null };
}

export function routeHref(name: RouteName, slug?: string | null): string {
  if (name === 'journey' && slug) return `#/journey/${slug}`;
  if (name === 'gallery') return '#/';
  return `#/${name}`;
}

export function currentHash(): string {
  if (typeof window === 'undefined') return '#/';
  return window.location.hash || '#/';
}

/**
 * Slugs that name a journey held by the shared state instead of the gallery: a
 * trace pasted in the browser, a journey opened from a share link, a
 * `journey.json` imported from disk. The journey screen must not look them up
 * in the gallery (and must not overwrite them with a sample).
 */
export const STATE_SLUGS = {
  pasted: 'pasted',
  shared: 'shared',
  imported: 'imported',
} as const;

export function isStateSlug(slug: string | null | undefined): boolean {
  if (slug === null || slug === undefined) return false;
  return (Object.values(STATE_SLUGS) as string[]).includes(slug);
}
