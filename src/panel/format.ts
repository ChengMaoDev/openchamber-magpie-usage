import { createI18n, type I18n } from '../i18n/index.ts';
import type { QuotaWindow, UsageRow } from '../shared/schema.ts';

export const totalTokens = (
  row: Pick<UsageRow, 'input' | 'output' | 'cache_read' | 'cache_write'>,
) => row.input + row.output + row.cache_read + row.cache_write;
export function remainingLabel(
  window: Pick<QuotaWindow, 'remaining' | 'used'>,
  i18n: I18n = createI18n('zh-CN'),
): string {
  const remaining =
    window.remaining ??
    (window.used === undefined ? undefined : 100 - window.used);
  return remaining === undefined
    ? i18n.t('unknown')
    : i18n.t('remaining', { value: i18n.percent(Math.max(0, remaining)) });
}
export function resetLabel(
  value: string | undefined,
  now = Date.now(),
  i18n: I18n = createI18n('zh-CN'),
): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  const minutes = Math.ceil((time - now) / 60_000);
  return minutes <= 0
    ? i18n.t('resetDue')
    : i18n.t('resetIn', { time: i18n.duration(minutes) });
}
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
