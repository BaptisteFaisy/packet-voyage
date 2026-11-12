// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { loadGallery } from '../lib/gallery.ts';
import { USE_CASES } from '../lib/use-cases.ts';
import { renderWithProviders } from '../test-utils.tsx';
import { UseCasesView } from './UseCasesView.tsx';

const items = loadGallery();

describe('UseCasesView — the ten best, each one a click away', () => {
  it('renders one card per case, in order, with a demo button', () => {
    renderWithProviders(<UseCasesView items={items} />);
    expect(USE_CASES).toHaveLength(10);
    for (const uc of USE_CASES) {
      const card = screen.getByTestId(`use-case-${uc.id}`);
      expect(card.textContent).toContain(uc.title.en);
      expect(card.querySelector('button')?.textContent).toBe('Open the demo');
    }
    const numbers = screen.getAllByText(/^\d\d$/);
    expect(numbers).toHaveLength(10);
  });

  it('every case points at a gallery journey that exists and a block that is real', () => {
    const slugs = new Set(items.map((item) => item.slug));
    for (const uc of USE_CASES) {
      expect(slugs.has(uc.slug), `${uc.id} slug ${uc.slug}`).toBe(true);
      expect(uc.block.trim().length).toBeGreaterThan(0);
    }
  });

  it('reads in French too', () => {
    renderWithProviders(<UseCasesView items={items} />, { language: 'fr' });
    expect(screen.getByTestId('use-cases-view').textContent).toContain('Ouvrir la démo');
    expect(screen.getByTestId('use-cases-view').textContent).toContain('rejetée par la lumière');
  });

  it('honours the honesty contract: no case names the cable, every claim is a compatibility', () => {
    renderWithProviders(<UseCasesView items={items} />);
    const text = screen.getByTestId('use-cases-view').textContent ?? '';
    for (const uc of USE_CASES) {
      expect(uc.answer.en.toLowerCase()).not.toMatch(/carried (the )?traffic through|crossed (the )?cable/);
    }
    expect(text.toLowerCase()).not.toMatch(/which cable carried/);
  });
});