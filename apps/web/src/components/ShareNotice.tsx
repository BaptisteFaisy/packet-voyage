/**
 * What a share link did, said out loud (VOY-F-39, §12.2): either the journey it
 * opened — with its target and trace date, the only facts the link carries — or
 * why it could not be opened. A broken link is content, never a blank screen.
 */
import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import type { I18nKey } from '../i18n/en.ts';
import { formatDate } from '../lib/format.ts';
import type { ShareFailure, ShareFailureReason } from '../lib/share-link.ts';

const REASON_KEYS: Record<ShareFailureReason, I18nKey> = {
  unreadable: 'share.errorUnreadable',
  'invalid-json': 'share.errorJson',
  'invalid-schema': 'share.errorSchema',
  'too-large': 'share.errorTooLarge',
  unexpected: 'share.errorUnexpected',
};

type Translate = ReturnType<typeof useI18n>['t'];

/** One readable sentence per failure reason; the decoder's detail is kept. */
function failureText(failure: ShareFailure, t: Translate): string {
  const key = REASON_KEYS[failure.reason];
  if (failure.reason === 'too-large') {
    return t(key, { bytes: failure.bytes ?? 0, limit: failure.limit });
  }
  return t(key, { detail: failure.detail });
}

export interface ShareNoticeProps {
  failure: ShareFailure | null;
  opened: Journey | null;
  onDismiss: () => void;
}

export function ShareNotice({ failure, opened, onDismiss }: ShareNoticeProps) {
  const { t, language } = useI18n();
  if (!failure && !opened) return null;

  const dismiss = (
    <button type="button" className="link-button" onClick={onDismiss} data-testid="share-dismiss">
      {t('share.dismiss')}
    </button>
  );

  return (
    <div className="share-notice">
      {failure ? (
        <p className="notice share-error" role="alert" data-testid="share-error">
          <strong>{t('share.errorTitle')}</strong> {failureText(failure, t)}{' '}
          <span className="hint">{t('share.errorHint')}</span> {dismiss}
        </p>
      ) : null}
      {!failure && opened ? (
        <p className="notice share-opened" role="status" data-testid="share-opened">
          {t('share.opened', {
            target: opened.target.host,
            date: formatDate(opened.traced_at, language),
          })}{' '}
          {dismiss}
        </p>
      ) : null}
    </div>
  );
}
