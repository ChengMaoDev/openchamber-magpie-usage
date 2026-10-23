import { mountEmpty } from '@openchamber/sdk/ui';
import type { I18n } from '../i18n/index.ts';
import type { Quota, QuotaWindow } from '../shared/schema.ts';
import type { QuotaDisplay } from './display-mode.ts';
import { element, resetLabel } from './format.ts';
import { quotaAccounts } from './quota-accounts.ts';
import { quotaTone, quotaValues } from './quota-values.ts';

function ring(value: number | undefined, used: number | undefined) {
  const wrap = element('span', 'quota-ring');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('aria-hidden', 'true');
  for (const className of ['ring-track', 'ring-fill']) {
    const circle = document.createElementNS(svg.namespaceURI, 'circle');
    for (const [key, value] of Object.entries({
      cx: '24',
      cy: '24',
      r: '20',
      pathLength: '100',
      class: className,
    }))
      circle.setAttribute(key, value);
    svg.append(circle);
  }
  wrap.dataset.tone = quotaTone(used);
  wrap.dataset.empty = String(value !== undefined && value <= 0);
  wrap.style.setProperty(
    '--value',
    String(Math.min(100, Math.max(0, value ?? 0))),
  );
  wrap.append(svg);
  if (used === undefined) wrap.append(element('span', 'ring-unknown', '?'));
  return wrap;
}

function windowSummary(
  window: QuotaWindow | undefined,
  quota: Quota,
  i18n: I18n,
  display: QuotaDisplay,
) {
  const { t } = i18n;
  const values = quotaValues(window);
  const row = element('span', 'ring-window-row');
  const value = values[display];
  const circle = ring(value, values.used);
  const info = element('span', 'ring-window-info');
  const name = [window?.name, window?.model].filter(Boolean).join(' · ');
  if (name) info.append(element('span', 'ring-window', name));
  if (value !== undefined) {
    circle.append(element('strong', 'ring-value', `${i18n.percent(value)}%`));
  } else {
    info.append(
      element('span', 'ring-unavailable', quota.balance || t('unknown')),
    );
  }
  row.append(circle, info);
  return row;
}

export function renderRingQuotas(
  root: HTMLElement,
  quotas: readonly Quota[],
  i18n: I18n,
  showAccounts: boolean,
  expanded: Set<string>,
  display: QuotaDisplay,
) {
  const { t } = i18n;
  if (!quotas.length)
    return [
      mountEmpty(root, { title: t('noQuotas'), body: t('noQuotasBody') }),
    ];
  for (const { quota, key, name } of quotaAccounts(quotas)) {
    const windows: readonly (QuotaWindow | undefined)[] = quota.windows.length
      ? quota.windows
      : [undefined];
    for (const [index, window] of windows.entries()) {
      const windowKey = JSON.stringify([
        key,
        window?.name,
        window?.model,
        index,
      ]);
      const details = element('details', 'ring-account');
      details.open = expanded.has(windowKey);
      const summary = element('summary', 'ring-summary');
      summary.dataset.focusId = `ring-${quotas.indexOf(quota)}-${index}`;
      const heading = element('span', 'ring-heading');
      if (quota.last) {
        const dot = element('span', 'active-account');
        dot.setAttribute('role', 'img');
        dot.setAttribute('aria-label', t('lastUsed'));
        heading.append(dot);
      }
      heading.append(element('strong', 'ring-name-text', name));
      if (showAccounts && quota.user)
        heading.append(element('span', 'account-inline', quota.user));
      if (quota.error) {
        const error = element('span', 'ring-error', '!');
        error.setAttribute('aria-label', quota.error);
        heading.append(error);
      }
      summary.append(windowSummary(window, quota, i18n, display), heading);
      const title = [
        name,
        showAccounts ? quota.user : '',
        window?.name,
        window?.model,
        quota.error,
      ]
        .filter(Boolean)
        .join(' · ');
      summary.title = title;
      const body = element('div', 'ring-detail');
      body.append(element('strong', '', name));
      if (showAccounts && quota.user)
        body.append(element('p', 'muted', quota.user));
      for (const window of quota.windows) {
        const values = quotaValues(window);
        const resetAt =
          window.resetsAt ??
          (window.resetSecs !== undefined && quota.readAt
            ? new Date(
                Date.parse(quota.readAt) + window.resetSecs * 1000,
              ).toISOString()
            : undefined);
        for (const text of [
          [window.name, window.model].filter(Boolean).join(' · '),
          values[display] === undefined
            ? t('unknown')
            : t(display === 'used' ? 'usedPercent' : 'remaining', {
                value: i18n.percent(values[display]),
              }),
          window.display,
          resetLabel(resetAt, Date.now(), i18n),
          window.aside ? t('nonBlocking') : null,
        ])
          if (text) body.append(element('p', 'muted', text));
      }
      for (const text of [quota.plan, quota.balance])
        if (text) body.append(element('p', 'muted', text));
      if (!quota.windows.length && !quota.balance && !quota.error)
        body.append(element('p', 'muted', t('noAccountQuota')));
      if (quota.error) body.append(element('p', 'error', quota.error));
      details.append(summary, body);
      details.addEventListener('toggle', () => {
        if (!details.isConnected) return;
        if (details.open) expanded.add(windowKey);
        else expanded.delete(windowKey);
      });
      root.append(details);
    }
  }
  return [];
}
