/**
 * Public surface of the `packet-voyage` CLI package.
 */
export { HELP_TEXT, parseArgv, runCli } from './cli.ts';
export type { RunCliOptions } from './cli.ts';
export {
  CliError,
  EXIT_BAD_ARG,
  EXIT_INTERNAL,
  EXIT_NO_TOOL,
  EXIT_OK,
  EXIT_REFUSED,
  EXIT_UNREADABLE,
  defaultHomeDir,
  defaultIo,
} from './runtime.ts';
export type { CliContext, CliIo } from './runtime.ts';
export { emitJourneyJson, formatJourneyHuman } from './output.ts';
export { loadDatasets, loadVoyageDeps } from './deps.ts';
export type { CacheLike, ConsentStateLike, DataDeps, EnrichDeps, VoyageDeps } from './deps.ts';
export { isIpv4, isIpv6, isValidHost, validateHost } from './validate-host.ts';
export type { HostRejection, HostValidation } from './validate-host.ts';
export {
  DEFAULT_CYCLES,
  MAX_CYCLES,
  detectTraceTool,
  installHint,
  isPrivilegeError,
  nodeSpawnRunner,
  normalizeCycles,
  privilegeMessage,
  runTrace,
  traceArgv,
} from './probe.ts';
export type {
  SpawnOptions,
  SpawnResult,
  SpawnRunner,
  TraceOptions,
  TraceProtocol,
  TraceTool,
} from './probe.ts';
export { runConsentCommand } from './commands/consent.ts';
export { runDataCommand } from './commands/data.ts';
export { runEnrichCommand } from './commands/enrich.ts';
export { runMcpCommand } from './commands/mcp.ts';
export { runReadCommand } from './commands/read.ts';
export { runShareCommand } from './commands/share.ts';
export { runTraceCommand } from './commands/trace.ts';
