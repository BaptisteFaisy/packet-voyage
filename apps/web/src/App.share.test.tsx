// @vitest-environment jsdom
/**
 * The whole site, opened from a share link: the fragment is decoded at boot and
 * the journey screen shows that journey — the point of VOY-F-39 is that the link
 * works without a server and without losing the trip.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { encodeShareLink, redactJourney } from '@packet-voyage/core';
import { SAMPLE_JOURNEY } from './__fixtures__/sample-journey.ts';
import { setStoredPreferences } from './test-utils.tsx';
import App from './App.tsx';

afterEach(() => {
  window.location.hash = '#/';
});

function openHashOf(journey: typeof SAMPLE_JOURNEY): string {
  const link = encodeShareLink(redactJourney(journey, 'country'), 'https://example.test/');
  return link.slice(link.indexOf('#'));
}

describe('App — a share link lands on the journey screen', () => {
  it('shows the shared journey, and says it came from a link', async () => {
    setStoredPreferences({ animations: false });
    window.location.hash = openHashOf(SAMPLE_JOURNEY);
    render(<App />);
    expect(await screen.findByTestId('journey-view', {}, { timeout: 10_000 })).toBeTruthy();
    expect(screen.getByTestId('share-opened').textContent).toContain(SAMPLE_JOURNEY.target.host);
    expect(document.body.textContent).toContain(SAMPLE_JOURNEY.target.host);
    expect(window.location.hash).toBe('#/journey/shared');
  });

  it('keeps the gallery reachable when the fragment is corrupted', async () => {
    setStoredPreferences({ animations: false });
    window.location.hash = '#j=not*base64*at*all';
    render(<App />);
    expect(await screen.findByTestId('share-error', {}, { timeout: 10_000 })).toBeTruthy();
    expect(await screen.findByTestId('home-view')).toBeTruthy();
    expect(window.location.hash).toBe('#/');
  });
});
