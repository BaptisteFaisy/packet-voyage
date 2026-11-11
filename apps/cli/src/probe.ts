/**
 * Trace-tool wrapper (VOY-F-41, VOY-N-03, §11.6).
 *
 * Hard rules:
 *   - one single validated host, passed as ONE argv element;
 *   - `child_process.spawn` with `shell: false` and an argument array —
 *     never `exec`, never a command string, never `sudo`;
 *   - tool order: `mtr --json` (when it really emits JSON), else
 *     `traceroute`, else `tracert` on Windows;
 *   - when a requested protocol needs privileges we do not have, say so and
 *     suggest the default mode instead of escalating (§11.6).
 */
import { spawn } from 'node:child_process';

export type TraceTool = 'mtr' | 'traceroute' | 'tracert';

export type TraceProtocol = 'icmp' | 'udp' | 'tcp';

export interface TraceOptions {
  cycles: number;
  ipv6: boolean;
  protocol?: TraceProtocol;
}

export interface SpawnOptions {
  /** Always false: this wrapper never goes through a shell (VOY-N-03). */
  shell: false;
  timeoutMs: number;
}

export interface SpawnResult {
  code: number | null;
  stdout: string;
  stderr: string;
  /** Set when the process could not even start (ENOENT) or was killed. */
  error?: { code?: string; message: string };
  timedOut?: boolean;
}

/** Injectable runner: tests pass a fake, production passes `nodeSpawnRunner`. */
export type SpawnRunner = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => Promise<SpawnResult>;

export const DEFAULT_CYCLES = 3;
export const MAX_CYCLES = 100;
export const DETECT_TIMEOUT_MS = 5_000;

/** Real runner: `spawn` with an argv array, `shell: false`, timeout + kill. */
export function nodeSpawnRunner(
  command: string,
  args: string[],
  options: SpawnOptions,
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, options.timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr, error: { code: error.code, message: error.message }, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, ...(timedOut ? { timedOut } : {}) });
    });
  });
}

function traceTimeoutMs(cycles: number): number {
  return Math.min(30_000 + Math.max(1, cycles) * 5_000, 180_000);
}

/** Clamp `--cycles` to the documented bounds; returns the warning if any. */
export function normalizeCycles(raw: number): { cycles: number; warning: string | null } {
  if (!Number.isFinite(raw) || raw < 1) return { cycles: DEFAULT_CYCLES, warning: null };
  if (raw > MAX_CYCLES) {
    return { cycles: MAX_CYCLES, warning: `--cycles clamped to ${MAX_CYCLES} (maximum)` };
  }
  return { cycles: Math.floor(raw), warning: null };
}

/** The exact argv of the contract §5.8, host as a single final element. */
export function traceArgv(tool: TraceTool, host: string, opts: TraceOptions): string[] {
  const family = opts.ipv6 ? ['-6'] : [];
  switch (tool) {
    case 'mtr': {
      const proto =
        opts.protocol === 'udp' ? ['--udp'] : opts.protocol === 'tcp' ? ['--tcp'] : [];
      return ['mtr', '--json', '-n', ...family, ...proto, '-c', String(opts.cycles), host];
    }
    case 'traceroute': {
      const proto =
        opts.protocol === 'icmp' ? ['-I'] : opts.protocol === 'tcp' ? ['-T'] : [];
      return ['traceroute', '-n', '-q', '3', ...family, ...proto, host];
    }
    case 'tracert':
      return ['tracert', '-d', ...family, host];
  }
}

/**
 * `mtr --json --version` prints the version as plain text on every build, so it
 * proves nothing about JSON support (mtr 0.95 with Jansson still answers
 * "mtr 0.95"). The only honest probe is a real one-cycle report — on loopback,
 * which is in `.kiro/probe-allowlist.txt` and never touches the Internet
 * (VOY-N-02).
 */
const MTR_JSON_PROBE_ARGS = ['--json', '-c', '1', '-n', '127.0.0.1'];
const MTR_PROBE_TIMEOUT_MS = 20_000;

/** True when the output contains a JSON document (mtr may print warnings first). */
export function emitsJson(stdout: string): boolean {
  const text = stdout.trim();
  if (text === '') return false;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return false;
  try {
    JSON.parse(text.slice(start, end + 1));
    return true;
  } catch {
    return false;
  }
}

async function mtrIsInstalled(runner: SpawnRunner): Promise<boolean> {
  const version = await runner('mtr', ['--version'], { shell: false, timeoutMs: DETECT_TIMEOUT_MS });
  return version.error?.code !== 'ENOENT' && version.code !== null;
}

/** `mtr` exists AND its build really emits JSON (some lack Jansson). */
async function detectMtr(runner: SpawnRunner): Promise<boolean> {
  if (!(await mtrIsInstalled(runner))) return false;
  const probe = await runner('mtr', MTR_JSON_PROBE_ARGS, {
    shell: false,
    timeoutMs: MTR_PROBE_TIMEOUT_MS,
  });
  return emitsJson(probe.stdout);
}

/**
 * When nothing usable was found, say why: an `mtr` without JSON support is a
 * different problem from no trace tool at all, and the fix is not the same.
 */
export async function noToolMessage(runner: SpawnRunner, platform: NodeJS.Platform): Promise<string> {
  if (platform !== 'win32' && (await mtrIsInstalled(runner))) {
    return (
      'mtr is installed but this build does not emit JSON (it needs the Jansson ' +
      'library) — install a JSON-enabled mtr, or traceroute ' +
      `(e.g. apt install traceroute). ${installHint(platform)}`
    );
  }
  return installHint(platform);
}

async function detectBinary(runner: SpawnRunner, command: string): Promise<boolean> {
  const res = await runner(command, ['--version'], { shell: false, timeoutMs: DETECT_TIMEOUT_MS });
  if (res.error?.code === 'ENOENT') return false;
  // Any other outcome (usage text, non-zero code) still means it is installed.
  return !res.error;
}

/** First available tool in the contract order; null when there is none. */
export async function detectTraceTool(
  runner: SpawnRunner,
  platform: NodeJS.Platform,
): Promise<TraceTool | null> {
  if (await detectMtr(runner)) return 'mtr';
  if (await detectBinary(runner, 'traceroute')) return 'traceroute';
  // tracert ships with Windows (§11.6); do not probe for it elsewhere.
  if (platform === 'win32' && (await detectBinary(runner, 'tracert'))) return 'tracert';
  return null;
}

/** Per-OS hint printed with exit code 3 (no trace tool found). */
export function installHint(platform: NodeJS.Platform): string {
  switch (platform) {
    case 'win32':
      return 'tracert ships with Windows; if it is missing, repair the Windows installation.';
    case 'darwin':
      return 'macOS ships traceroute; you can also install mtr with: brew install mtr';
    default:
      return 'install one of: mtr (recommended, e.g. apt install mtr-tiny) or traceroute (e.g. apt install traceroute)';
  }
}

const PRIVILEGE_RX =
  /operation not permitted|permission denied|must be root|need(?:s)? root|superuser|setuid|cap_net_raw|socket\b.*(?:fail|error)/i;

/** Detect a privilege failure so we can suggest the default mode (no sudo). */
export function isPrivilegeError(result: SpawnResult): boolean {
  if (result.code === 0) return false;
  return PRIVILEGE_RX.test(result.stderr) || PRIVILEGE_RX.test(result.stdout);
}

/** Message shown on a privilege failure: explain, suggest, never escalate. */
export function privilegeMessage(protocol: TraceProtocol | undefined): string {
  const wanted = protocol ? `the requested protocol (${protocol})` : 'this probe mode';
  return (
    `${wanted} needs privileges this user does not have. ` +
    'Packet Voyage never uses sudo and never changes system capabilities. ' +
    'Suggestion: run the default mode instead (drop --proto, or try --proto udp).'
  );
}

/** Run one trace; the caller validated the host beforehand (VOY-F-42). */
export async function runTrace(
  runner: SpawnRunner,
  tool: TraceTool,
  host: string,
  opts: TraceOptions,
): Promise<SpawnResult> {
  const argv = traceArgv(tool, host, opts);
  const [command, ...args] = argv;
  return runner(command ?? tool, args, { shell: false, timeoutMs: traceTimeoutMs(opts.cycles) });
}
