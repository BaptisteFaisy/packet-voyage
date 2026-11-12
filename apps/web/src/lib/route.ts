export type RouteName =
  | 'features'
  | 'gallery'
  | 'journey'
  | 'compare'
  | 'story'
  | 'classroom'
  | 'sources'
  | 'settings';

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
