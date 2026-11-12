/**
 * Opening a share link (VOY-F-39, VOY-P-17): the fragment `#j=<base64url>`
 * carries the whole — already redacted — journey, so a link can be opened with
 * zero request and nothing stored on a server.
 *
 * Decoding goes through `decodeShareLink` from `@packet-voyage/core` with its
 * default codecs (base64url + JSON), exactly the ones the CLI uses when it
 * builds the link, so a link always opens the journey it carries.
 *
 * Every failure is content, not trash: the caller gets a reason and a readable
 * detail, never an exception and never an empty screen (§12.2).
 * Pure module: no React here (contract §5.9).
 */
import type { Journey } from '@packet-voyage/schema';
import {
  MAX_FRAGMENT_BYTES,
  ShareDecodeError,
  ShareTooLargeError,
  decodeShareLink,
} from '@packet-voyage/core';

/** Why a fragment could not be turned back into a journey. */
export type ShareFailureReason =
  | 'unreadable'
  | 'invalid-json'
  | 'invalid-schema'
  | 'too-large'
  | 'unexpected';

export interface ShareFailure {
  reason: ShareFailureReason;
  /** The decoder's own words, shown as-is: they say what is wrong. */
  detail: string;
  bytes: number | null;
  limit: number;
}

export type ShareHashResult =
  | { status: 'none' }
  | { status: 'journey'; journey: Journey }
  | { status: 'failure'; failure: ShareFailure };

/** The payload of a share fragment, exactly as `decodeShareLink` reads it. */
const PAYLOAD_RX = /#j=([^&\s]+)/;

function failure(reason: ShareFailureReason, detail: string, bytes: number | null): ShareFailure {
  return { reason, detail, bytes, limit: MAX_FRAGMENT_BYTES };
}

/** Does this hash carry a share fragment at all (even a broken one)? */
export function hasShareFragment(hash: string): boolean {
  return hash.includes('#j=');
}

/** Map a decoder error onto a reason the UI can word honestly. */
export function classifyShareError(error: unknown): ShareFailure {
  if (error instanceof ShareTooLargeError) {
    return failure('too-large', error.message, error.bytes);
  }
  if (error instanceof ShareDecodeError) {
    const reason: ShareFailureReason = error.message.includes('does not match the schema')
      ? 'invalid-schema'
      : 'unreadable';
    return failure(reason, error.message, null);
  }
  if (error instanceof SyntaxError) {
    return failure('invalid-json', error.message, null);
  }
  const detail = error instanceof Error ? error.message : String(error);
  return failure('unexpected', detail, null);
}

/**
 * Read a location hash: `none` when it carries no journey, the journey when the
 * fragment decodes, a failure with its reason otherwise. Never throws.
 */
export function decodeShareHash(hash: string): ShareHashResult {
  if (!hasShareFragment(hash)) return { status: 'none' };
  const payload = PAYLOAD_RX.exec(hash)?.[1] ?? '';
  const bytes = new TextEncoder().encode(payload).length;
  if (bytes > MAX_FRAGMENT_BYTES) {
    return {
      status: 'failure',
      failure: failure(
        'too-large',
        `journey payload is ${bytes} bytes for a ${MAX_FRAGMENT_BYTES} byte limit`,
        bytes,
      ),
    };
  }
  try {
    return { status: 'journey', journey: decodeShareLink(hash) };
  } catch (error) {
    return { status: 'failure', failure: classifyShareError(error) };
  }
}
