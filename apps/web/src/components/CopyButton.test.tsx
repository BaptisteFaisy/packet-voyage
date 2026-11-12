// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { COPY_FEEDBACK_MS, CopyButton } from './CopyButton.tsx';

/** Install a clipboard whose writeText resolves (or rejects, per the test). */
function stubClipboard(impl: (text: string) => Promise<void>) {
  const writeText = vi.fn(impl);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
  return writeText;
}

/** Remove the async clipboard API, as on an older browser. */
function removeClipboard(): void {
  Reflect.deleteProperty(navigator, 'clipboard');
}

/** Install the legacy selection-based copy. */
function stubExecCommand(result: boolean) {
  const execCommand = vi.fn(() => result);
  Object.defineProperty(document, 'execCommand', {
    value: execCommand,
    configurable: true,
    writable: true,
  });
  return execCommand;
}

afterEach(() => {
  Reflect.deleteProperty(document, 'execCommand');
  removeClipboard();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CopyButton — markup', () => {
  it('renders a real button carrying an explicit accessible name', () => {
    renderWithProviders(
      <CopyButton text="npx packet-voyage trace example.org" label="Copy the command" copiedLabel="Copied" />,
    );
    const button = screen.getByTestId('copy-button');
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Copy the command');
    expect(button.textContent).toBe('Copy the command');
  });

  it('accepts a custom test id and class name', () => {
    renderWithProviders(
      <CopyButton text="x" label="Copy" copiedLabel="Copied" testId="copy-cmd" className="btn btn-small" />,
    );
    const button = screen.getByTestId('copy-cmd');
    expect(button.className).toContain('btn');
    expect(button.className).toContain('btn-small');
    expect(screen.queryByTestId('copy-button')).toBeNull();
  });
});

describe('CopyButton — clipboard', () => {
  it('copies the text through the clipboard API', async () => {
    const writeText = stubClipboard(async () => {});
    renderWithProviders(<CopyButton text="npx packet-voyage serve" label="Copy" copiedLabel="Copied" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-button'));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('npx packet-voyage serve');
  });

  it('announces the state in a polite live region', async () => {
    stubClipboard(async () => {});
    renderWithProviders(<CopyButton text="x" label="Copy" copiedLabel="Copied" />);
    const status = screen.getByTestId('copy-button-status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe('');

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-button'));
    });
    expect(status.textContent).toBe('Copied');
  });
});

describe('CopyButton — feedback', () => {
  it('shows the copied label, then goes back to the initial one', async () => {
    vi.useFakeTimers();
    stubClipboard(async () => {});
    renderWithProviders(<CopyButton text="x" label="Copy" copiedLabel="Copied" />);
    const button = screen.getByTestId('copy-button');
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button.textContent).toBe('Copied');
    expect(button.getAttribute('aria-label')).toBe('Copied');

    act(() => {
      vi.advanceTimersByTime(COPY_FEEDBACK_MS - 1);
    });
    expect(button.textContent).toBe('Copied');

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(button.textContent).toBe('Copy');
    expect(button.getAttribute('aria-label')).toBe('Copy');
  });
});

describe('CopyButton — no copy path left', () => {
  it('falls back to the legacy selection when the clipboard API is missing', async () => {
    removeClipboard();
    const execCommand = stubExecCommand(true);
    renderWithProviders(<CopyButton text="npx packet-voyage" label="Copy" copiedLabel="Copied" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-button'));
    });
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(screen.getByTestId('copy-button').textContent).toBe('Copied');
  });

  it('stays quiet when the copy did not happen', async () => {
    stubClipboard(async () => {
      throw new Error('permission refused');
    });
    renderWithProviders(<CopyButton text="x" label="Copy" copiedLabel="Copied" />);
    const button = screen.getByTestId('copy-button');
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button.textContent).toBe('Copy');
    expect(screen.getByTestId('copy-button-status').textContent).toBe('');
  });

  it('stays quiet when neither path can copy', async () => {
    removeClipboard();
    renderWithProviders(<CopyButton text="x" label="Copy" copiedLabel="Copied" />);
    const button = screen.getByTestId('copy-button');
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button.textContent).toBe('Copy');
  });
});
