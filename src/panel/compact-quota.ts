import { mountEmpty, mountProgress } from '@openchamber/sdk/ui';
import type { I18n } from '../i18n/index.ts';
import type { Quota } from '../shared/schema.ts';
import type { QuotaDisplay } from './display-mode.ts';
import { element, resetLabel } from './format.ts';
import { quotaAccounts } from './quota-accounts.ts';
import { quotaText, quotaValues } from './quota-values.ts';

export function renderCompactQuotas(
  root: HTMLElement,
  quotas: readonly Quota[],
  i18n: I18n,
  showAccounts: boolean,
  quotaDisplay: QuotaDisplay,
) {
  const controls: { dispose(): void }[] = [];
  const { t } = i18n;
  if (quotas.length === 0) {
    controls.push(
      mountEmpty(root, { title: t('noQuotas'), body: t('noQuotasBody') }),
    );
  }
  for (const { quota, name: accountName } of quotaAccounts(quotas)) {
    const account = element('article', 'compact-account');
    const heading = element('div', 'compact-account-heading');
    const name = element('div', 'compact-account-name');
    if (quota.last) {
      const dot = element('span', 'active-account');
      dot.setAttribute('role', 'img');
      dot.setAttribute('aria-label', t('lastUsed'));
      name.append(dot);
    }
    name.append(element('strong', '', accountName));
    if (quota.user && showAccounts)
      name.append(element('span', 'account-inline', quota.user));
    if (quota.plan) name.append(element('span', 'compact-plan', quota.plan));
    heading.append(name);
    if (quota.balance)
      heading.append(element('span', 'compact-balance', quota.balance));
    account.append(heading);
    if (quota.error) account.append(element('p', 'error', quota.error));
    for (const window of quota.windows) {
      const row = element('div', 'compact-window');
      const label = [window.name, window.model].filter(Boolean).join(' · ');
      const values = quotaValues(window);
      const used = values.used;
      const value = values[quotaDisplay];
      const meter = element('div', 'compact-meter');
      if (used !== undefined && value !== undefined)
        controls.push(
          mountProgress(meter, {
            value,
            label: `${label} ${t(quotaDisplay === 'used' ? 'showUsed' : 'showRemaining')}`,
            tone: used >= 90 ? 'error' : used >= 70 ? 'warning' : 'primary',
          }),
        );
      const resetAt =
        window.resetsAt ??
        (window.resetSecs !== undefined && quota.readAt
          ? new Date(
              Date.parse(quota.readAt) + window.resetSecs * 1000,
            ).toISOString()
          : undefined);
      const reset = resetLabel(resetAt, Date.now(), i18n);
      row.append(
        element('span', 'compact-window-name', label),
        element(
          'span',
          'compact-remaining',
          quotaText(window, quotaDisplay, i18n),
        ),
        meter,
      );
      if (reset || window.display)
        row.append(
          element(
            'p',
            'compact-reset',
            [reset, window.display].filter(Boolean).join(' · '),
          ),
        );
      if (window.aside)
        row.append(element('p', 'compact-reset', t('nonBlocking')));
      account.append(row);
    }
    if (!quota.error && quota.windows.length === 0 && !quota.balance)
      account.append(element('p', 'compact-reset', t('noAccountQuota')));
    root.append(account);
  }
  return controls;
}
