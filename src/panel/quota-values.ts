import type { I18n } from '../i18n/index.ts';
import type { QuotaWindow } from '../shared/schema.ts';
import type { QuotaDisplay } from './display-mode.ts';

export function quotaText(
  window: Pick<QuotaWindow, 'used' | 'remaining'> | undefined,
  display: QuotaDisplay,
  i18n: I18n,
) {
  const value = quotaValues(window)[display];
  return value === undefined ? i18n.t('unknown') : `${i18n.percent(value)}%`;
}

export function quotaValues(
  window: Pick<QuotaWindow, 'used' | 'remaining'> | undefined,
) {
  const used =
    window?.used ??
    (window?.remaining === undefined ? undefined : 100 - window.remaining);
  const remaining =
    window?.remaining ??
    (window?.used === undefined ? undefined : 100 - window.used);
  return { used, remaining };
}

export function quotaTone(used: number | undefined) {
  return used === undefined
    ? 'unknown'
    : used >= 90
      ? 'error'
      : used >= 70
        ? 'warning'
        : 'primary';
}
