/**
 * The share-link entry point (VOY-F-39): at boot and on every hash change, a
 * `#j=<payload>` fragment is decoded, the journey is put in the shared state and
 * the journey screen is opened.
 *
 * A broken fragment never blocks the site: the failure is kept as content and
 * the hash is sent back to the gallery, which stays reachable (§12.2).
 */
import { useCallback, useEffect, useState } from 'react';
import type { Journey } from '@packet-voyage/schema';
import { decodeShareHash } from '../lib/share-link.ts';
import type { ShareFailure } from '../lib/share-link.ts';
import { STATE_SLUGS } from '../lib/route.ts';
import { useJourneyState } from '../state/journey.tsx';
import { navigateTo } from './use-hash-route.ts';

/** Slug of the journey screen opened from a link; it is not a gallery entry. */
export const SHARED_SLUG = STATE_SLUGS.shared;

export interface ShareLinkState {
  failure: ShareFailure | null;
  /** The journey a link just opened, so the UI can say where it came from. */
  opened: Journey | null;
  dismiss: () => void;
}

function currentHash(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hash;
}

export function useShareLink(): ShareLinkState {
  const { setJourney } = useJourneyState();
  const [failure, setFailure] = useState<ShareFailure | null>(null);
  const [opened, setOpened] = useState<Journey | null>(null);

  const readHash = useCallback(() => {
    const result = decodeShareHash(currentHash());
    if (result.status === 'none') return;
    if (result.status === 'journey') {
      setFailure(null);
      setOpened(result.journey);
      setJourney(result.journey);
      navigateTo(`#/journey/${SHARED_SLUG}`);
      return;
    }
    setOpened(null);
    setFailure(result.failure);
    navigateTo('#/');
  }, [setJourney]);

  useEffect(() => {
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, [readHash]);

  const dismiss = useCallback(() => {
    setFailure(null);
    setOpened(null);
  }, []);

  return { failure, opened, dismiss };
}
