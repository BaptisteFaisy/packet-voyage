// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { GalleryView } from './GalleryView.tsx';
import { GALLERY_SLUGS, galleryAvailable, loadGallery } from '../lib/gallery.ts';

describe('GalleryView (VOY-F-44)', () => {
  it('VOY-F-44 offers the six contract slugs, loaded in one click', () => {
    const items = loadGallery();
    const slugs = items.map((item) => item.slug);
    for (const slug of GALLERY_SLUGS) {
      expect(slugs).toContain(slug);
    }
    renderWithProviders(<GalleryView items={items} fromGallery={galleryAvailable()} onOpen={() => {}} />);
    for (const slug of GALLERY_SLUGS) {
      expect(screen.getByTestId(`gallery-card-${slug}`)).toBeTruthy();
    }
  });

  it('VOY-F-44 while gallery/ is not built, a UI notice says so and the fixture backs the cards', () => {
    const items = loadGallery();
    renderWithProviders(
      <GalleryView items={items} fromGallery={galleryAvailable()} onOpen={() => {}} />,
    );
    if (!galleryAvailable()) {
      const notice = screen.getByTestId('gallery-notice');
      expect(notice.textContent?.toLowerCase()).toContain('not built');
      for (const item of items) {
        expect(item.journey.summary.distance_km_min).toBe(6655);
      }
    }
  });

  it('VOY-F-44 clicking a card hands the journey to the opener', () => {
    const items = loadGallery();
    const onOpen = vi.fn();
    renderWithProviders(<GalleryView items={items} fromGallery={galleryAvailable()} onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('gallery-open-ocean-crossing'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0]?.[0]?.slug).toBe('ocean-crossing');
  });
});
