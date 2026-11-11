/**
 * `voyage mcp` — hand over stdio to the MCP server (L13). The import is lazy
 * and the package optional: when `@packet-voyage/mcp` is absent the rest of
 * the CLI still runs, and this command exits with a clear message.
 */
import { CliError, EXIT_INTERNAL, EXIT_OK } from '../runtime.ts';
import type { CliContext } from '../runtime.ts';
import { loadDatasets } from '../deps.ts';

export async function runMcpCommand(ctx: CliContext): Promise<number> {
  let mod: unknown;
  try {
    mod = await import('@packet-voyage/mcp');
  } catch (error) {
    throw new CliError(
      EXIT_INTERNAL,
      `the MCP server package @packet-voyage/mcp is not available: ${(error as Error).message}`,
    );
  }
  const mcp = mod as { runStdioServer?: (deps?: Record<string, unknown>) => Promise<void> };
  if (typeof mcp.runStdioServer !== 'function') {
    throw new CliError(EXIT_INTERNAL, '@packet-voyage/mcp does not export runStdioServer');
  }
  const datasets = loadDatasets(ctx.deps.data);
  await mcp.runStdioServer({
    datasets: {
      cables: datasets.cables,
      masses: datasets.masses,
      links: datasets.links,
      hints: datasets.hints,
      credits: datasets.credits,
    },
    nowIso: ctx.io.now,
  });
  return EXIT_OK;
}
