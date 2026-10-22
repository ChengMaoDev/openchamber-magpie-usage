import { en, type MessageKey, type Messages } from './en.ts';
import { ja } from './ja.ts';
import { zhCN } from './zh-cn.ts';
import { zhTW } from './zh-tw.ts';

export const catalogs = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ja,
} satisfies Record<string, Messages>;
export type Language = keyof typeof catalogs;
export function resolveLanguage(locale: string): Language {
  const value = locale.toLowerCase().replaceAll('_', '-');
  if (/^zh-(tw|hk|mo|hant)(-|$)/.test(value)) return 'zh-TW';
  if (/^zh($|-)/.test(value)) return 'zh-CN';
  return /^ja($|-)/.test(value) ? 'ja' : 'en';
}
export function createI18n(locale: string) {
  const language = resolveLanguage(locale);
  const messages: Messages = catalogs[language];
  return {
    locale: language,
    t(
      key: MessageKey,
      values: Readonly<Record<string, string | number>> = {},
    ): string {
      return messages[key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
        String(values[name] ?? placeholder),
      );
    },
    number(value: number) {
      return new Intl.NumberFormat(language, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    },
    percent(value: number) {
      return new Intl.NumberFormat(language, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value);
    },
    money(value: number) {
      return new Intl.NumberFormat(language, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(value);
    },
    time(value: number, date = false) {
      return new Intl.DateTimeFormat(language, {
        ...(date ? ({ month: 'numeric', day: 'numeric' } as const) : {}),
        hour: '2-digit',
        minute: '2-digit',
      }).format(value);
    },
    duration(minutes: number) {
      const days = Math.floor(minutes / 1440),
        hours = Math.floor((minutes % 1440) / 60),
        rest = minutes % 60;
      const parts =
        days > 0
          ? ([
              [days, 'day'],
              [hours, 'hour'],
            ] as const)
          : hours > 0
            ? ([
                [hours, 'hour'],
                [rest, 'minute'],
              ] as const)
            : ([[rest, 'minute']] as const);
      return parts
        .filter(([amount]) => amount > 0)
        .map(([amount, unit]) =>
          new Intl.NumberFormat(language, {
            style: 'unit',
            unit,
            unitDisplay: 'short',
          }).format(amount),
        )
        .join(' ');
    },
  };
}
export type I18n = ReturnType<typeof createI18n>;
