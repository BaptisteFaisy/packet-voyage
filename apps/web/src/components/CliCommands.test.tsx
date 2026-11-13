// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { CliCommands } from './CliCommands.tsx';

const COMMANDS = [
  { label: 'Trace a host', command: 'pnpm voyage trace example.org' },
  { label: 'Read a trace you already have', command: 'pnpm voyage read trace.txt' },
];

/** Install a clipboard whose writeText resolves. */
function stubClipboard() {
  const writeText = vi.fn(async (_text: string) => {});
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
  return writeText;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.restoreAllMocks();
});

describe('CliCommands — rendering', () => {
  it('renders every command with its label and a monospace block', () => {
    renderWithProviders(<CliCommands commands={COMMANDS} title="Terminal" note="Run it locally." />);
    expect(screen.getByTestId('cli-commands')).toBeTruthy();

    const first = screen.getByTestId('cli-command-0');
    expect(first.textContent).toContain('Trace a host');
    const code = first.querySelector('code');
    expect(code?.textContent).toBe('pnpm voyage trace example.org');
    expect(code?.className).toContain('mono');

    const second = screen.getByTestId('cli-command-1');
    expect(second.textContent).toContain('Read a trace you already have');
    expect(second.querySelector('code')?.textContent).toBe('pnpm voyage read trace.txt');
  });

  it('renders a command as text, never as markup', () => {
    renderWithProviders(<CliCommands commands={[{ label: 'Raw', command: '<b>not bold</b>' }]} />);
    const code = screen.getByTestId('cli-command-0').querySelector('code');
    expect(code?.textContent).toBe('<b>not bold</b>');
    expect(screen.getByTestId('cli-commands').querySelector('b')).toBeNull();
  });

  it('takes a custom test id on the root element', () => {
    renderWithProviders(<CliCommands commands={COMMANDS} testId="terminal-commands" />);
    expect(screen.getByTestId('terminal-commands')).toBeTruthy();
    expect(screen.queryByTestId('cli-commands')).toBeNull();
  });

  it('renders an empty list without breaking', () => {
    renderWithProviders(<CliCommands commands={[]} />);
    expect(screen.getByTestId('cli-commands')).toBeTruthy();
    expect(screen.queryByTestId('cli-command-0')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('CliCommands — copy and notes', () => {
  it('gives every line its own copy button, copying that command', async () => {
    const writeText = stubClipboard();
    renderWithProviders(<CliCommands commands={COMMANDS} copyLabel="Copy" copiedLabel="Copied" />);
    expect(screen.getAllByRole('button')).toHaveLength(2);

    await act(async () => {
      fireEvent.click(screen.getByTestId('cli-command-1-copy'));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('pnpm voyage read trace.txt');
    expect(screen.getByTestId('cli-command-1-copy').textContent).toBe('Copied');
    expect(screen.getByTestId('cli-command-0-copy').textContent).toBe('Copy');
  });

  it('shows the title above the list and the note under it', () => {
    renderWithProviders(<CliCommands commands={COMMANDS} title="Terminal" note="Run it locally." />);
    const root = screen.getByTestId('cli-commands');
    expect(root.querySelector('h3')?.textContent).toBe('Terminal');
    expect(screen.getByTestId('cli-commands-note').textContent).toBe('Run it locally.');

    const text = root.textContent ?? '';
    expect(text.indexOf('Terminal')).toBeLessThan(text.indexOf('Trace a host'));
    expect(text.indexOf('Trace a host')).toBeLessThan(text.indexOf('Run it locally.'));
  });
});
