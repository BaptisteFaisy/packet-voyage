// @vitest-environment jsdom
/**
 * Opening a share link, end to end in the site: the fragment is decoded, the
 * journey lands in the shared state and the journey screen is opened; a broken
 * fragment shows a readable message and leaves the gallery reachable.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { encodeShareLink, redactJourney } from '@packet-voyage/core';
import type { Journey } from '@packet-voyage/schema';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { ShareNotice } from '../components/ShareNotice.tsx';
import { useJourneyState } from '../state/journey.tsx';
import { renderWithProviders } from '../test-utils.tsx';
import { SHARED_SLUG, useShareLink } from './use-share-link.ts';

/** The wiring `App` does: the hook drives the state, the notice says what happened. */
function Harness() {
  const share = useShareLink();
  const { journey } = useJourneyState();
  return (
    <div>
      <ShareNotice failure={share.failure} opened={share.opened} onDismiss={share.dismiss} />
      <p data-testid="state-target">{journey?.target.host ?? 'none'}</p>
      <p data-testid="state-hops">{journey ? journey.hops.length : -1}</p>
    </div>
  );
}

function shareHashOf(journey: Journey): string {
  const link = encodeShareLink(redactJourney(journey, 'country'), 'https://example.test/');
  return link.slice(link.indexOf('#'));
}

function setHash(hash: string): void {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

afterEach(() => {
  window.location.hash = '#/';
});

describe('useShareLink — a share link opens the journey', () => {
  it('decodes the fragment at boot, fills the state and opens the journey screen', async () => {
    setHash(shareHashOf(SAMPLE_JOURNEY));
    renderWithProviders(<Harness />);
    expect(await screen.findByTestId('share-opened')).toBeTruthy();
    expect(screen.getByTestId('state-target').textContent).toBe(SAMPLE_JOURNEY.target.host);
    expect(screen.getByTestId('state-hops').textContent).toBe(
      String(redactJourney(SAMPLE_JOURNEY, 'country').hops.length),
    );
    expect(window.location.hash).toBe(`#/journey/${SHARED_SLUG}`);
    expect(screen.getByTestId('share-opened').textContent).toContain(SAMPLE_JOURNEY.target.host);
  });

  it('reacts to a link followed after boot (hashchange)', async () => {
    window.location.hash = '#/';
    renderWithProviders(<Harness />);
    expect(screen.getByTestId('state-target').textContent).toBe('none');
    setHash(shareHashOf(SAMPLE_JOURNEY));
    expect(await screen.findByTestId('share-opened')).toBeTruthy();
    expect(screen.getByTestId('state-target').textContent).toBe(SAMPLE_JOURNEY.target.host);
  });

  it('reads in French too', async () => {
    setHash(shareHashOf(SAMPLE_JOURNEY));
    renderWithProviders(<Harness />, { language: 'fr' });
    const notice = await screen.findByTestId('share-opened');
    expect(notice.textContent).toContain('lien de partage');
  });
});

describe('useShareLink — a broken link never blocks the site', () => {
  it('shows a readable message for a corrupted fragment and goes back to the gallery', async () => {
    setHash('#j=not*base64*at*all');
    renderWithProviders(<Harness />);
    const error = await screen.findByTestId('share-error');
    expect(error.textContent).toContain('could not be opened');
    expect(error.textContent?.length ?? 0).toBeGreaterThan(40);
    expect(screen.getByTestId('state-target').textContent).toBe('none');
    expect(window.location.hash).toBe('#/');
  });

  it('says so in French, and the message can be dismissed', async () => {
    setHash('#j=not*base64*at*all');
    renderWithProviders(<Harness />, { language: 'fr' });
    const error = await screen.findByTestId('share-error');
    expect(error.textContent).toContain('n’a pas pu être ouvert');
    fireEvent.click(screen.getByTestId('share-dismiss'));
    expect(screen.queryByTestId('share-error')).toBeNull();
  });

  it('leaves the site untouched when the hash carries no journey', () => {
    setHash('#/features');
    renderWithProviders(<Harness />);
    expect(screen.queryByTestId('share-error')).toBeNull();
    expect(screen.queryByTestId('share-opened')).toBeNull();
    expect(screen.getByTestId('state-target').textContent).toBe('none');
    expect(window.location.hash).toBe('#/features');
  });
});
