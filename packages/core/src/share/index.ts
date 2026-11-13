/** Serverless share links (VOY-F-39). */
export {
  decodeShareLink,
  encodeShareLink,
  MAX_FRAGMENT_BYTES,
  ShareDecodeError,
  ShareTooLargeError,
} from './share.ts';
export type { ShareCodecs } from './share.ts';
