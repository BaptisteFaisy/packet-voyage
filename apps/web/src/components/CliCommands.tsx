/**
 * CliCommands — the list of terminal commands a reader can copy.
 *
 * Every line shows a label, the command itself in a monospace block, and a
 * copy button. The words come from the props: the caller owns the
 * translation. Command strings are rendered as text, never as markup.
 */
import { CopyButton } from './CopyButton.tsx';

export interface CliCommand {
  /** Short description of what the command does. */
  label: string;
  /** The command line, copied verbatim. */
  command: string;
}

export interface CliCommandsProps {
  commands: CliCommand[];
  /** Optional heading above the list. */
  title?: string;
  /** Optional remark shown under the list. */
  note?: string;
  /** data-testid of the root element; defaults to "cli-commands". */
  testId?: string;
  /** Label of the per-line copy button, translated by the caller. */
  copyLabel?: string;
  /** Label of the copy button right after a successful copy. */
  copiedLabel?: string;
}

export function CliCommands(props: CliCommandsProps): JSX.Element {
  const { commands, title, note, testId = 'cli-commands' } = props;
  return (
    <section className="cli-commands" data-testid={testId}>
      {title ? <h3 className="cli-commands-title">{title}</h3> : null}
      <ul className="cli-commands-list">
        {commands.map((entry, index) => (
          <li
            className="cli-command"
            key={`${entry.command}-${index}`}
            data-testid={`cli-command-${index}`}
          >
            <span className="cli-command-label">{entry.label}</span>
            <code className="mono cli-command-code">{entry.command}</code>
            <CopyButton
              text={entry.command}
              label={props.copyLabel}
              copiedLabel={props.copiedLabel}
              testId={`cli-command-${index}-copy`}
            />
          </li>
        ))}
      </ul>
      {note ? (
        <p className="cli-commands-note" data-testid={`${testId}-note`}>
          {note}
        </p>
      ) : null}
    </section>
  );
}
