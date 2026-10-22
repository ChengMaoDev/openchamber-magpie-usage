import { mountEmpty, mountProgress } from '@openchamber/sdk/ui';
import type { I18n } from '../i18n/index.ts';
import type { Quota } from '../shared/schema.ts';
import { element, remainingLabel, resetLabel } from './format.ts';

export function renderCompactQuotas(
  root: HTMLElement,
  quotas: readonly Quota[],
  i18n: I18n,
  showAccounts: boolean,
) {
  const controls: { dispose(): void }[] = [];
  const { t } = i18n;
  if (quotas.length === 0) {
    controls.push(
      mountEmpty(root, { title: t('noQuotas'), body: t('noQuotasBody') }),
    );
  }
  for (const quota of [...quotas].sort(
    (a, b) => Number(Boolean(b.last)) - Number(Boolean(a.last)),
  )) {
    const account = element('article', 'compact-account');
    const heading = element('div', 'compact-account-heading');
    const name = element('div', 'compact-account-name');
    if (quota.last) {
      const dot = element('span', 'active-account');
      dot.setAttribute('role', 'img');
      dot.setAttribute('aria-label', t('lastUsed'));
      name.append(dot);
    }
    name.append(element('strong', '', quota.name));
    if (quota.plan) name.append(element('span', 'compact-plan', quota.plan));
    heading.append(name);
    if (quota.balance)
      heading.append(element('span', 'compact-balance', quota.balance));
    account.append(heading);
    if (quota.user && showAccounts)
      account.append(element('p', 'compact-account-user', quota.user));
    if (quota.error) account.append(element('p', 'error', quota.error));
    for (const window of quota.windows) {
      const row = element('div', 'compact-window');
      const label = [window.name, window.model].filter(Boolean).join(' · ');
      const used =
        window.used ??
        (window.remaining === undefined ? undefined : 100 - window.remaining);
      const meter = element('div', 'compact-meter');
      if (used !== undefined)
        controls.push(
          mountProgress(meter, {
            value: used,
            label: t('used', { name: label }),
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
        element('span', 'compact-remaining', remainingLabel(window, i18n)),
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
