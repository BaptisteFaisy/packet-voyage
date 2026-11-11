/**
 * Serverless sharing (VOY-F-39, VOY-P-17): the whole journey travels inside the
 * URL fragment, so no server ever stores it and nothing is requested after load.
 *
 * The fragment is base64url. Compression is injected: `packages/core` must stay
 * browser-safe (no `node:zlib` import), so the CLI passes the Node codecs and
 * the site passes its own. Without codecs the journey is simply encoded.
 */
import { JourneySchema } from '@packet-voyage/schema';
import type { Journey } from '@packet-voyage/schema';

export const MAX_FRAGMENT_BYTES = 60_000;

export interface ShareCodecs {
  deflate: (text: string) => Uint8Array;
  inflate: (bytes: Uint8Array) => string;
}

export class ShareTooLargeError extends Error {
  constructor(readonly bytes: number, readonly limit: number = MAX_FRAGMENT_BYTES) {
    super(`journey does not fit in a URL fragment: ${bytes} bytes for a ${limit} byte limit`);
    this.name = 'ShareTooLargeError';
  }
}

export class ShareDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShareDecodeError';
  }
}

const IDENTITY: ShareCodecs = {
  deflate: (text) => new TextEncoder().encode(text),
  inflate: (bytes) => new TextDecoder().decode(bytes),
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encode a (already redacted) journey into a link whose fragment carries it. */
export function encodeShareLink(journey: Journey, baseUrl: string, codecs: ShareCodecs = IDENTITY): string {
  const payload = toBase64Url(codecs.deflate(JSON.stringify(journey)));
  // The base is reduced to its origin and path: a query string would end up in
  // a server log, and the whole point of the fragment is that it never does.
  const url = `${baseUrl.replace(/[?#].*$/, '')}#j=${payload}`;
  const bytes = new TextEncoder().encode(url).length;
  if (bytes > MAX_FRAGMENT_BYTES) throw new ShareTooLargeError(bytes);
  return url;
}

/** Decode a link back into the exact journey it carried. */
export function decodeShareLink(url: string, codecs: ShareCodecs = IDENTITY): Journey {
  const match = /#j=([^&\s]+)/.exec(url);
  if (!match?.[1]) throw new ShareDecodeError('no journey found in this link (expected #j=…)');
  let text: string;
  try {
    text = codecs.inflate(fromBase64Url(match[1]));
  } catch (error) {
    throw new ShareDecodeError(`unreadable journey payload: ${(error as Error).message}`);
  }
  const parsed = JourneySchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new ShareDecodeError(`journey does not match the schema: ${parsed.error.message}`);
  }
  return parsed.data;
}
