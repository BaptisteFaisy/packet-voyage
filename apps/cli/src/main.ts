/**
 * Bundle entrypoint: run the CLI and exit with the documented code (§5.8).
 * Kept separate from `cli.ts` so the parser stays importable by tests.
 */
import { runCli } from './cli.ts';

const code = await runCli(process.argv.slice(2));
process.exitCode = code;
