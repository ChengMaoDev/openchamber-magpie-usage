import { expect, test } from 'bun:test';
import { en } from '../src/i18n/en.ts';
import { catalogs, createI18n, resolveLanguage } from '../src/i18n/index.ts';
import { quotasSchema } from '../src/shared/schema.ts';

test('every language covers the same messages and interpolation fields', () => {
  const fields = (text: string) =>
    [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const catalog of Object.values(catalogs)) {
    expect(Object.keys(catalog).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(catalog[key].length).toBeGreaterThan(0);
      expect(fields(catalog[key])).toEqual(fields(en[key]));
    }
  }
});
test('language variants and unsupported locales resolve predictably', () => {
  expect(resolveLanguage('zh-Hant-HK')).toBe('zh-TW');
  expect(resolveLanguage('zh_HK')).toBe('zh-TW');
  expect(resolveLanguage('zh-SG')).toBe('zh-CN');
  expect(resolveLanguage('ja-JP')).toBe('ja');
  expect(resolveLanguage('fr-FR')).toBe('en');
  expect(createI18n('en').t('remaining', { value: '32.1' })).toBe(
    '32.1% remaining',
  );
});
test('Magpie timestamps accept seconds, milliseconds and ISO without false reset clocks', () => {
  for (const time of [
    1792627200,
    1792627200000,
    '1792627200',
    '2026-10-22T00:00:00Z',
  ]) {
    const parsed = quotasSchema.parse({
      data: [
        {
          provider: 'demo',
          name: 'Demo',
          readAt: time,
          windows: [{ name: '5h', resetsAt: time }],
        },
      ],
    });
    expect(parsed.data[0]?.readAt).toBe('2026-10-22T00:00:00.000Z');
    expect(parsed.data[0]?.windows[0]?.resetsAt).toBe(
      '2026-10-22T00:00:00.000Z',
    );
  }
});
