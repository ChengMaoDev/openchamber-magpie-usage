import { HostRequestError } from '@openchamber/sdk';
import {
  mountBanner,
  mountButton,
  mountSwitch,
  mountTabs,
} from '@openchamber/sdk/ui';
import type { I18n } from '../i18n/index.ts';
import { DataError } from '../shared/errors.ts';
import type { Period, Quota, Usage } from '../shared/schema.ts';
import { element } from './format.ts';
import { createQuotaView } from './quota-view.ts';
import { renderUsage } from './usage-view.ts';

export type PanelState = {
  i18n: I18n;
  period: Period;
  showAccounts: boolean;
  compactMode: boolean;
  busy: boolean;
  quotas: readonly Quota[] | null;
  usage: Usage | null;
  quotaError: unknown;
  usageError: unknown;
  storageError: unknown;
  updatedAt: number | null;
};
export function errorMessage(error: unknown, i18n: I18n): string {
  if (error instanceof DataError) return i18n.t(error.code);
  if (error instanceof HostRequestError) {
    if (['NO_SERVICE', 'NOT_GRANTED'].includes(error.code))
      return i18n.t('grant');
    if (error.code === 'SERVICE_FAILED') return i18n.t('serviceFailed');
    return i18n.t('hostFailed', { code: error.code });
  }
  return i18n.t('unknownError');
}
export function createView(
  container: HTMLElement,
  compact: boolean,
  actions: {
    refresh(): void;
    period(value: string): void;
    accounts(value: boolean): void;
    compactMode(value: boolean): void;
  },
) {
  container.replaceChildren();
  const header = element('header', 'topline');
  const title = element('h1');
  const refreshRoot = element('div');
  header.append(title, refreshRoot);
  const status = element('p', 'status muted');
  status.setAttribute('role', 'status');
  const notices = element('div', 'notice');
  const accountRoot = element('div', 'account-setting');
  const compactRoot = element('div', 'compact-setting');
  const preferences = element('div', 'preferences');
  preferences.append(accountRoot, compactRoot);
  const quotaRoot = element('div', 'quota-list');
  const section = element('section', 'expanded');
  const usageTitle = element('h2', 'section-heading');
  const tabsRoot = element('div', 'controls');
  const usageRoot = element('div');
  const hint = element('p', 'footnote');
  section.append(usageTitle, tabsRoot, usageRoot);
  container.append(
    header,
    status,
    notices,
    preferences,
    quotaRoot,
    section,
    hint,
  );
  const quotas = createQuotaView(quotaRoot);
  const refresh = mountButton(refreshRoot, {
    label: '',
    size: 'xs',
    variant: 'ghost',
    onClick: actions.refresh,
  });
  const tabs = mountTabs(tabsRoot, {
    items: [],
    activeId: 'today',
    onChange: actions.period,
  });
  const accounts = mountSwitch(accountRoot, {
    label: '',
    checked: false,
    onChange: actions.accounts,
  });
  const compactMode = mountSwitch(compactRoot, {
    label: '',
    checked: compact,
    onChange: actions.compactMode,
  });
  let banners: ReturnType<typeof mountBanner>[] = [];
  return {
    paint(state: PanelState) {
      const { i18n, period, busy } = state;
      const { t } = i18n;
      document.documentElement.lang = i18n.locale;
      document.title = t('title');
      container.dataset.density = state.compactMode ? 'compact' : 'comfortable';
      title.textContent = t(compact ? 'quotas' : 'title');
      usageTitle.textContent = t('usage');
      refresh.update({ label: t('refresh'), loading: busy });
      tabs.update({
        activeId: period,
        items: (['today', 'week', 'month', 'all'] as const).map((id) => ({
          id,
          label: t(id),
        })),
      });
      accounts.update({
        label: t('showAccounts'),
        checked: state.showAccounts,
      });
      compactMode.update({
        label: t('compactMode'),
        checked: state.compactMode,
      });
      for (const banner of banners) banner.dispose();
      banners = [];
      for (const [error, key, stale] of [
        [state.quotaError, 'quotaFailed', state.quotas !== null],
        [state.usageError, 'usageFailed', state.usage?.period === period],
      ] as const) {
        if (error)
          banners.push(
            mountBanner(notices, {
              tone: 'error',
              title: t(key),
              body: `${errorMessage(error, i18n)} ${stale ? t('stale') : ''}`,
            }),
          );
      }
      if (state.storageError)
        banners.push(
          mountBanner(notices, { tone: 'warning', title: t('storageFailed') }),
        );
      if (state.quotas !== null)
        quotas.update(state.quotas, i18n, state.showAccounts);
      if (state.usage?.period === period)
        renderUsage(usageRoot, state.usage, i18n);
      else
        usageRoot.replaceChildren(
          ...(busy ? [element('p', 'muted', t('loading'))] : []),
        );
      status.textContent =
        state.quotaError || state.usageError
          ? t('partial')
          : state.updatedAt
            ? t('updated', { time: i18n.time(state.updatedAt) })
            : t('connecting');
      hint.textContent = compact
        ? t('compactHint')
        : t(
            state.quotaError || state.usageError
              ? 'manualRefresh'
              : 'autoRefresh',
          );
    },
    dispose() {
      refresh.dispose();
      tabs.dispose();
      accounts.dispose();
      compactMode.dispose();
      quotas.dispose();
      for (const banner of banners) banner.dispose();
    },
  };
}
