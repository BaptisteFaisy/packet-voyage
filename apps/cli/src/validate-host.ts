/**
 * Argument guard for the trace target (VOY-F-42, VOY-N-03, §18).
 *
 * The CLI accepts exactly ONE host per command: a single RFC 1123 hostname or
 * a single IPv4/IPv6 address. Everything else is rejected before it ever
 * reaches a `spawn` call:
 *   - CIDR ranges (`192.0.2.0/24`) and dash ranges (`192.0.2.1-10`),
 *   - lists (`a,b`, whitespace separated),
 *   - anything starting with `-` (flag injection such as `-h`, `--foo`),
 *   - shell metacharacters (`; | & $ \` ( ) < > { } [ ] * ? ! ~ #`),
 *   - empty or non-string input.
 *
 * This module has zero dependencies (not even `@packet-voyage/core`) so the
 * guard stays available — and testable — on its own.
 */

export type HostRejection =
  | 'empty'
  | 'leading-dash'
  | 'range'
  | 'list'
  | 'metacharacter'
  | 'not-a-host';

export type HostValidation =
  | { ok: true; host: string; family: 4 | 6 | 'hostname' }
  | { ok: false; reason: HostRejection; message: string };

/** Shell metacharacters: never part of a hostname, always a smell of injection. */
const METACHAR_RX = /[;|&$`()<>[\]{}*?!~#%^'"\\]/;

/** RFC 1123: labels of [A-Za-z0-9-], not starting/ending with a dash. */
const LABEL_RX = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

/** A dash between digits reads as an address range ("192.0.2.1-10"). */
const DASH_RANGE_RX = /\d\s*-\s*\d/;

const MAX_HOST_LENGTH = 253;

const MESSAGES: Record<HostRejection, string> = {
  empty: 'no host given: voyage trace takes exactly one hostname or IP address',
  'leading-dash':
    'the host starts with a dash, which would be read as a command option: ' +
    'one hostname or IP address, nothing else',
  range: 'ranges are refused (no CIDR prefix, no start-end span): one host at a time',
  list: 'lists are refused (no comma, no whitespace): one host at a time',
  metacharacter: 'the host contains a shell metacharacter: one plain hostname or IP address',
  'not-a-host': 'the argument is neither a single hostname (RFC 1123) nor an IP address',
};

function reject(reason: HostRejection): HostValidation {
  return { ok: false, reason, message: MESSAGES[reason] };
}

/** Strict dotted-quad IPv4 (no leading zeros: they are octal-ambiguous). */
export function isIpv4(input: string): boolean {
  const parts = input.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    if (part.length > 1 && part.startsWith('0')) return false;
    return Number(part) <= 255;
  });
}

function validIpv6Side(side: string, allowIpv4Tail: boolean): number {
  if (side === '') return 0;
  const tokens = side.split(':');
  let groups = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i] ?? '';
    const isTail = allowIpv4Tail && i === tokens.length - 1 && token.includes('.');
    if (isTail) {
      if (!isIpv4(token)) return -1;
      groups += 2;
      continue;
    }
    if (!/^[0-9A-Fa-f]{1,4}$/.test(token)) return -1;
    groups += 1;
  }
  return groups;
}

/** Textual IPv6 (RFC 4291): at most one `::`, optional embedded IPv4 tail. */
export function isIpv6(input: string): boolean {
  if (!input.includes(':')) return false;
  if (input.includes('%')) return false; // zone ids are not accepted
  const halves = input.split('::');
  if (halves.length > 2) return false;
  if (halves.length === 1) {
    return validIpv6Side(input, true) === 8;
  }
  const left = validIpv6Side(halves[0] ?? '', false);
  const right = validIpv6Side(halves[1] ?? '', true);
  if (left < 0 || right < 0) return false;
  return left + right <= 7; // `::` stands for at least one group
}

function isHostname(input: string): boolean {
  if (input.length > MAX_HOST_LENGTH) return false;
  const bare = input.endsWith('.') ? input.slice(0, -1) : input;
  if (bare === '') return false;
  const labels = bare.split('.');
  if (!labels.every((label) => LABEL_RX.test(label))) return false;
  const last = labels[labels.length - 1] ?? '';
  // An all-numeric top label is an address attempt, not a name (RFC 1123 §2.1).
  return !/^\d+$/.test(last);
}

/**
 * Validate one trace target (VOY-F-42). Returns the string to pass as a
 * single argv element, or a structured refusal with a user-facing message.
 */
export function validateHost(input: unknown): HostValidation {
  if (typeof input !== 'string' || input.trim() === '') return reject('empty');
  const host = input.trim();
  if (host !== input) return reject('list'); // surrounding whitespace = a list
  if (host.startsWith('-')) return reject('leading-dash');
  if (METACHAR_RX.test(host)) return reject('metacharacter');
  // Ranges first: "192.0.2.1 - 192.0.2.10" is a range, not a whitespace list.
  if (host.includes('/')) return reject('range');
  if (DASH_RANGE_RX.test(host)) return reject('range');
  if (/\s/.test(host) || host.includes(',')) return reject('list');
  if (isIpv4(host)) return { ok: true, host, family: 4 };
  if (isIpv6(host)) return { ok: true, host, family: 6 };
  if (isHostname(host)) return { ok: true, host, family: 'hostname' };
  return reject('not-a-host');
}

/** Boolean form, handy for guards that only need yes/no. */
export function isValidHost(input: unknown): boolean {
  return validateHost(input).ok;
}
