import { connectHost, type HostReadyContext } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';
import { z } from 'zod';
import { createI18n } from '../i18n/index.ts';
import { periodSchema } from '../shared/schema.ts';
import { createLoader, createRefreshQueue } from './data.ts';
import {
  displayModeSchema,
  quotaDisplaySchema,
  restoreDisplayMode,
} from './display-mode.ts';
import { rememberFocus } from './focus.ts';
import { createView, type PanelState } from './view.ts';

const host = connectHost();
const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing panel root');
let updateContext: ((context: HostReadyContext) => void) | undefined;
host.onReady((context) => {
  if (context.surface !== 'panel' && context.surface !== 'status') {
    root.replaceChildren();
    return;
  }
  applyHostReady(context, document.documentElement);
  if (updateContext) updateContext(context);
  else updateContext = mount(root, context);
});

function mount(container: HTMLElement, context: HostReadyContext) {
  const compact = context.surface === 'status';
  let state: PanelState = {
    i18n: createI18n(context.locale),
    period: 'today',
    showAccounts: false,
    displayMode: compact ? 'medium' : 'comfortable',
    quotaDisplay: 'remaining',
    busy: false,
    quotas: null,
    usage: null,
    quotaError: null,
    usageError: null,
    storageError: null,
    updatedAt: null,
  };
  let disposed = false;
  let initialized = false;
  let userSelectedPeriod = false;
  let userSelectedAccounts = false;
  let userSelectedDisplayMode = false;
  let userSelectedQuotaDisplay = false;
  const loader = createLoader(host, compact);
  const paint = () => {
    if (disposed) return;
    const restoreFocus = rememberFocus(container);
    view.paint(state);
    restoreFocus();
    if (compact) host.setHeight(Math.min(320, container.scrollHeight + 12));
  };
  const queue = createRefreshQueue(async (period, fresh) => {
    if (disposed) return;
    state = { ...state, busy: true };
    paint();
    const [quota, usage] = await loader(period, fresh);
    if (disposed) return;
    state = {
      ...state,
      busy: false,
      quotas: quota.status === 'fulfilled' ? quota.value.data : state.quotas,
      quotaError: quota.status === 'rejected' ? quota.reason : null,
    };
    if (period === state.period) {
      state = {
        ...state,
        usage:
          usage.status === 'fulfilled' && usage.value
            ? usage.value
            : state.usage,
        usageError: usage.status === 'rejected' ? usage.reason : null,
      };
    }
    if (!state.quotaError && !state.usageError)
      state = { ...state, updatedAt: Date.now() };
    paint();
  });
  const save = (key: string, value: string | boolean) => {
    void host.storage.set(key, value).catch((error: unknown) => {
      state = { ...state, storageError: error };
      paint();
    });
  };
  const view = createView(container, context.surface, {
    refresh: () => {
      void queue.request(state.period, true);
    },
    period: (value) => {
      const period = periodSchema.safeParse(value);
      if (!period.success || period.data === state.period) return;
      userSelectedPeriod = true;
      state = { ...state, period: period.data, usageError: null, busy: true };
      save('period', period.data);
      paint();
      void queue.request(period.data, false);
    },
    accounts: (value) => {
      userSelectedAccounts = true;
      state = { ...state, showAccounts: value };
      save('showAccounts', value);
      paint();
    },
    displayMode: (value) => {
      const mode = displayModeSchema.safeParse(value);
      if (!mode.success || mode.data === state.displayMode) return;
      userSelectedDisplayMode = true;
      state = { ...state, displayMode: mode.data };
      save('displayMode', mode.data);
      paint();
    },
    quotaDisplay: () => {
      userSelectedQuotaDisplay = true;
      const quotaDisplay = state.quotaDisplay === 'used' ? 'remaining' : 'used';
      state = { ...state, quotaDisplay };
      save('quotaDisplay', quotaDisplay);
      paint();
    },
  });
  const resize = compact
    ? new ResizeObserver(() =>
        host.setHeight(Math.min(320, container.scrollHeight + 12)),
      )
    : null;
  resize?.observe(container);
  paint();
  const timer = window.setInterval(() => {
    if (
      initialized &&
      !state.busy &&
      !state.quotaError &&
      !state.usageError &&
      !document.hidden
    )
      void queue.request(state.period, false);
  }, 60_000);
  void (async () => {
    const saved = await Promise.allSettled([
      host.storage.get('period'),
      host.storage.get('showAccounts'),
      host.storage.get('compactMode'),
      host.storage.get('displayMode'),
      host.storage.get('quotaDisplay'),
    ]);
    if (disposed) return;
    const period =
      saved[0].status === 'fulfilled'
        ? periodSchema.safeParse(saved[0].value)
        : null;
    const accounts =
      saved[1].status === 'fulfilled'
        ? z.boolean().safeParse(saved[1].value)
        : null;
    const quotaDisplay = quotaDisplaySchema.safeParse(
      saved[4].status === 'fulfilled' ? saved[4].value : undefined,
    );
    state = {
      ...state,
      period:
        !userSelectedPeriod && period?.success ? period.data : state.period,
      showAccounts:
        !userSelectedAccounts && accounts?.success
          ? accounts.data
          : state.showAccounts,
      displayMode: userSelectedDisplayMode
        ? state.displayMode
        : restoreDisplayMode(
            saved[3].status === 'fulfilled' ? saved[3].value : undefined,
            saved[2].status === 'fulfilled' ? saved[2].value : undefined,
            state.displayMode,
          ),
      quotaDisplay:
        !userSelectedQuotaDisplay && quotaDisplay.success
          ? quotaDisplay.data
          : state.quotaDisplay,
      storageError:
        saved.find((item) => item.status === 'rejected')?.reason ?? null,
    };
    initialized = true;
    await queue.request(state.period, true);
  })();
  window.addEventListener(
    'pagehide',
    () => {
      disposed = true;
      queue.dispose();
      window.clearInterval(timer);
      resize?.disconnect();
      view.dispose();
      host.dispose();
    },
    { once: true },
  );
  return (next: HostReadyContext) => {
    state = { ...state, i18n: createI18n(next.locale) };
    paint();
  };
}
