import { mountEmpty } from '@openchamber/sdk/ui';
import type { I18n } from '../i18n/index.ts';
import type { Quota, QuotaWindow } from '../shared/schema.ts';
import type { QuotaDisplay } from './display-mode.ts';
import { element } from './format.ts';
import { quotaAccounts } from './quota-accounts.ts';
import { quotaTone, quotaValues } from './quota-values.ts';
import { ringDescription } from './ring-description.ts';
import { ringGroups } from './ring-groups.ts';
import { createRingTooltip } from './ring-tooltip.ts';

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
  groupLabel?: string,
) {
  const { t } = i18n;
  const values = quotaValues(window);
  const row = element('span', 'ring-window-row');
  const value = values[display];
  const circle = ring(value, values.used);
  const info = element('span', 'ring-window-info');
  const name =
    groupLabel ?? [window?.name, window?.model].filter(Boolean).join(' · ');
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
  display: QuotaDisplay,
) {
  const { t } = i18n;
  if (!quotas.length)
    return [
      mountEmpty(root, { title: t('noQuotas'), body: t('noQuotasBody') }),
    ];
  const tooltip = createRingTooltip();
  for (const { quota, name } of quotaAccounts(quotas)) {
    for (const [index, group] of ringGroups(quota.windows, display).entries()) {
      const { window, grouped, unknownCount } = group;
      const account = element('article', 'ring-account');
      account.tabIndex = 0;
      account.dataset.focusId = `ring-${quotas.indexOf(quota)}-${index}`;
      const summary = element('div', 'ring-summary');
      const groupLabel = grouped
        ? t(display === 'remaining' ? 'lowestRemaining' : 'highestUsed')
        : undefined;
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
      summary.append(
        windowSummary(window, quota, i18n, display, groupLabel),
        heading,
      );
      if (grouped) {
        account.dataset.grouped = 'true';
        const count = element(
          'span',
          'ring-group-count',
          t('quotaCount', { count: i18n.number(quota.windows.length) }),
        );
        summary.append(count);
        if (unknownCount > 0)
          summary.append(
            element(
              'span',
              'ring-group-unknown',
              t('unknownQuotaCount', { count: i18n.number(unknownCount) }),
            ),
          );
      }
      account.setAttribute(
        'aria-label',
        [name, groupLabel, summary.textContent].filter(Boolean).join(' · '),
      );
      tooltip.attach(
        account,
        ringDescription(
          quota,
          name,
          grouped ? quota.windows : window ? [window] : [],
          i18n,
          showAccounts,
          display,
        ),
      );
      account.append(summary);
      root.append(account);
    }
  }
  return [tooltip];
}
