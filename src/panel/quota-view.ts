import {
  mountBadge,
  mountEmpty,
  mountProgress,
  type Tone,
} from '@openchamber/sdk/ui';
import type { I18n } from '../i18n/index.ts';
import type { Quota } from '../shared/schema.ts';
import { renderCompactQuotas } from './compact-quota.ts';
import { element, remainingLabel, resetLabel } from './format.ts';

type Disposable = { dispose(): void };
export function createQuotaView(root: HTMLElement) {
  let controls: Disposable[] = [];
  const clear = () => {
    for (const control of controls) control.dispose();
    controls = [];
    root.replaceChildren();
  };
  return {
    dispose: clear,
    update(
      quotas: readonly Quota[],
      i18n: I18n,
      showAccounts: boolean,
      compactMode = false,
    ) {
      clear();
      if (compactMode) {
        controls = renderCompactQuotas(root, quotas, i18n, showAccounts);
        return;
      }
      const { t } = i18n;
      if (quotas.length === 0) {
        controls.push(
          mountEmpty(root, { title: t('noQuotas'), body: t('noQuotasBody') }),
        );
        return;
      }
      for (const quota of [...quotas].sort(
        (a, b) => Number(Boolean(b.last)) - Number(Boolean(a.last)),
      )) {
        const card = element('article', 'quota');
        const heading = element('div', 'quota-heading');
        const identity = element('div', 'quota-identity');
        identity.append(element('div', 'quota-title', quota.name));
        if (quota.user && showAccounts)
          identity.append(element('div', 'account muted', quota.user));
        heading.append(identity);
        if (quota.last)
          controls.push(
            mountBadge(heading, { label: t('lastUsed'), tone: 'primary' }),
          );
        card.append(heading);
        if (quota.plan || quota.balance)
          card.append(
            element(
              'p',
              'muted account',
              [quota.plan, quota.balance].filter(Boolean).join(' · '),
            ),
          );
        if (quota.error) card.append(element('p', 'error', quota.error));
        for (const window of quota.windows) {
          const row = element('div', 'window');
          const caption = element('div', 'window-heading');
          caption.append(
            element(
              'span',
              'window-label',
              [window.name, window.model].filter(Boolean).join(' · '),
            ),
          );
          caption.append(
            element('span', 'window-value', remainingLabel(window, i18n)),
          );
          row.append(caption);
          const used =
            window.used ??
            (window.remaining === undefined
              ? undefined
              : 100 - window.remaining);
          if (used !== undefined) {
            const tone: Tone =
              used >= 90 ? 'error' : used >= 70 ? 'warning' : 'primary';
            const progress = element('div', 'quota-progress');
            controls.push(
              mountProgress(progress, {
                value: used,
                tone,
                label: t('used', { name: window.name }),
              }),
            );
            row.append(progress);
          }
          const resetAt =
            window.resetsAt ??
            (window.resetSecs !== undefined && quota.readAt
              ? new Date(
                  Date.parse(quota.readAt) + window.resetSecs * 1000,
                ).toISOString()
              : undefined);
          const reset = resetLabel(resetAt, Date.now(), i18n);
          if (window.display || reset)
            row.append(
              element(
                'p',
                'window-meta',
                [window.display, reset].filter(Boolean).join(' · '),
              ),
            );
          if (window.aside)
            row.append(element('p', 'window-meta', t('nonBlocking')));
          card.append(row);
        }
        if (!quota.error && quota.windows.length === 0 && !quota.balance)
          card.append(element('p', 'window-meta', t('noAccountQuota')));
        if (quota.readAt)
          card.append(
            element(
              'p',
              'window-meta',
              t('readAt', { time: i18n.time(Date.parse(quota.readAt), true) }),
            ),
          );
        root.append(card);
      }
    },
  };
}
