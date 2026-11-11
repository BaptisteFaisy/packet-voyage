// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { LightConeToggle } from './LightConeToggle.tsx';

describe('LightConeToggle (§7.6, VOY-F-34)', () => {
  it('is a real toggle button, off by default, and says what it draws', () => {
    const onToggle = vi.fn();
    renderWithProviders(<LightConeToggle enabled={false} onToggle={onToggle} />);
    const button = screen.getByTestId('light-cone-toggle');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.textContent).toContain('light cone');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('reports its state when enabled, in French too', () => {
    renderWithProviders(<LightConeToggle enabled onToggle={() => {}} />, { language: 'fr' });
    const button = screen.getByTestId('light-cone-toggle');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toContain('cône de lumière');
  });
});
