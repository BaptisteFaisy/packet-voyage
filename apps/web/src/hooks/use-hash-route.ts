import { useEffect, useState } from 'react';
import { currentHash, parseRoute } from '../lib/route.ts';
import type { Route } from '../lib/route.ts';

/** Hash-based routing with no dependency (§5.9): listens to `hashchange`. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(currentHash()));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigateTo(hash: string): void {
  if (typeof window === 'undefined') return;
  if (window.location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = hash;
}
