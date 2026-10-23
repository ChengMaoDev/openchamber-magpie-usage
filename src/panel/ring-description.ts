import type { I18n } from '../i18n/index.ts';
import type { Quota, QuotaWindow } from '../shared/schema.ts';
import type { QuotaDisplay } from './display-mode.ts';
import { resetLabel } from './format.ts';
import { quotaValues } from './quota-values.ts';

export function ringDescription(
  quota: Quota,
  name: string,
  windows: readonly QuotaWindow[],
  i18n: I18n,
  showAccounts: boolean,
  display: QuotaDisplay,
) {
  const { t } = i18n;
  const lines = [name];
  if (showAccounts && quota.user) lines.push(quota.user);
  for (const window of windows) {
    const value = quotaValues(window)[display];
    const resetAt =
      window.resetsAt ??
      (window.resetSecs !== undefined && quota.readAt
        ? new Date(
            Date.parse(quota.readAt) + window.resetSecs * 1000,
          ).toISOString()
        : undefined);
    lines.push(
      ...[
        [window.name, window.model].filter(Boolean).join(' · '),
        value === undefined
          ? t('unknown')
          : t(display === 'used' ? 'usedPercent' : 'remaining', {
              value: i18n.percent(value),
            }),
        window.display,
        resetLabel(resetAt, Date.now(), i18n),
        window.aside ? t('nonBlocking') : null,
      ].filter((line): line is string => Boolean(line)),
    );
  }
  for (const line of [quota.plan, quota.balance, quota.error])
    if (line) lines.push(line);
  if (!windows.length && !quota.balance && !quota.error)
    lines.push(t('noAccountQuota'));
  return lines.join('\n');
}
