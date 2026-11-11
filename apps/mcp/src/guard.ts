/**
 * VOY-N-02 ethics guardrails for the MCP server.
 *
 * Hard rules (spec §10, VOY-N-02):
 *   - one trace at a time (concurrency guard),
 *   - at least 5 s between two traces (cooldown, injected clock),
 *   - at most 20 traces per session (session cap),
 *   - every trace requires an explicit user approval flag,
 *   - one single host per call: no range, no list, no leading dash.
 *
 * The guard never performs any measurement itself: it only decides whether a
 * measurement may be requested.
 */

export const COOLDOWN_MS = 5_000;
export const MAX_TRACES_PER_SESSION = 20;

export type RefusalCode =
  | 'approval_required'
  | 'invalid_host'
  | 'trace_in_progress'
  | 'cooldown_active'
  | 'session_cap_reached';

export interface Refusal {
  ok: false;
  code: RefusalCode;
  message: string;
  /** Seconds the caller must wait before retrying (cooldown only). */
  retryAfterSeconds?: number;
}

export interface GuardState {
  tracesStarted: number;
  lastTraceAtMs: number | null;
  inFlight: boolean;
}

export type GuardCheck = { ok: true } | { ok: false; refusal: Refusal };

/** A single valid host: a hostname or an IP address, nothing else. */
const HOSTNAME_RX =
  /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.?$/;
const IPV4_RX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV4_RANGE_RX = /\d+\.\d+\.\d+\.\d+\s*-\s*\d+/;

export function isIpv4(host: string): boolean {
  const match = IPV4_RX.exec(host);
  if (!match) return false;
  return match.slice(1).every((part) => {
    if (part.length > 1 && part.startsWith('0')) return false;
    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}

export function isIpv6(host: string): boolean {
  if (!host.includes(':')) return false;
  if (!/^[0-9a-fA-F:.]+$/.test(host)) return false;
  const doubleColons = host.split('::').length - 1;
  if (doubleColons > 1) return false;
  if (host.includes(':::')) return false;
  const groups = host.split(':');
  return groups.every((group) => group === '' || /^[0-9a-fA-F]{1,4}$/.test(group) || /^\d{1,3}(\.\d{1,3}){3}$/.test(group));
}

/**
 * Single-host validation (VOY-F-42): one hostname or one address.
 * Ranges ("192.0.2.1-10", "192.0.2.0/24"), lists ("a,b") and leading dashes are refused.
 */
export function isSingleValidHost(host: unknown): boolean {
  if (typeof host !== 'string') return false;
  const trimmed = host.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith('-')) return false;
  if (/[\s,;*]/.test(trimmed)) return false;
  if (trimmed.includes('/')) return false;
  if (trimmed.includes('..')) return false;
  if (IPV4_RANGE_RX.test(trimmed)) return false;
  if (isIpv4(trimmed) || isIpv6(trimmed)) return true;
  if (trimmed.includes(':')) return false;
  return HOSTNAME_RX.test(trimmed);
}

/** Human-readable reason a host was refused (for the structured refusal). */
export function hostRefusalReason(host: unknown): string {
  if (typeof host !== 'string' || host.trim().length === 0) {
    return 'the host is missing or empty';
  }
  const trimmed = host.trim();
  if (trimmed.startsWith('-')) {
    return 'the host starts with a dash, which would look like a command option';
  }
  if (/[\s,;]/.test(trimmed)) {
    return 'the host contains a separator: one host per trace, no list';
  }
  if (trimmed.includes('/') || IPV4_RANGE_RX.test(trimmed)) {
    return 'the host looks like a range: one host per trace, no prefix or range';
  }
  return 'the host is neither a single hostname nor an IP address';
}

/** Create the per-session guard state. */
export function createGuardState(): GuardState {
  return { tracesStarted: 0, lastTraceAtMs: null, inFlight: false };
}

function refuse(code: RefusalCode, message: string, retryAfterSeconds?: number): GuardCheck {
  return {
    ok: false,
    refusal: {
      ok: false,
      code,
      message,
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
    },
  };
}

/**
 * Check every pre-condition of a trace. Pure: it does not mutate the state.
 * `nowMs` is injected so tests can drive the cooldown deterministically.
 */
export function checkTraceAllowed(
  state: GuardState,
  options: { host: unknown; approved: unknown; nowMs: number },
): GuardCheck {
  if (options.approved !== true) {
    return refuse(
      'approval_required',
      'This trace was not approved. Ask the user to approve the probe explicitly, then call trace_host again with approved: true.',
    );
  }
  if (!isSingleValidHost(options.host)) {
    return refuse('invalid_host', `The host was refused: ${hostRefusalReason(options.host)}.`);
  }
  if (state.inFlight) {
    return refuse('trace_in_progress', 'A trace is already running. One trace at a time (VOY-N-02).');
  }
  if (state.tracesStarted >= MAX_TRACES_PER_SESSION) {
    return refuse(
      'session_cap_reached',
      `This session already ran ${state.tracesStarted} traces; the cap is ${MAX_TRACES_PER_SESSION} per session (VOY-N-02).`,
    );
  }
  const waitMs = cooldownRemainingMs(state, options.nowMs);
  if (waitMs > 0) {
    const secs = Math.ceil(waitMs / 1000);
    return refuse(
      'cooldown_active',
      `The cooldown is still running: wait ${secs} s before the next trace (VOY-N-02 wants at least ${COOLDOWN_MS / 1000} s between two traces).`,
      secs,
    );
  }
  return { ok: true };
}

/** Milliseconds left before the next trace is allowed (0 when free). */
export function cooldownRemainingMs(state: GuardState, nowMs: number): number {
  if (state.lastTraceAtMs === null) return 0;
  const elapsed = nowMs - state.lastTraceAtMs;
  return Math.max(0, COOLDOWN_MS - elapsed);
}

/** Mark a trace as started (called right before the tracer runs). */
export function markTraceStarted(state: GuardState, nowMs: number): void {
  state.inFlight = true;
  state.tracesStarted += 1;
  state.lastTraceAtMs = nowMs;
}

/** Mark the running trace as finished. */
export function markTraceFinished(state: GuardState): void {
  state.inFlight = false;
}
