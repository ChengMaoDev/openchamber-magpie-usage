import { expect, test } from 'bun:test';
import { restoreDisplayMode } from '../src/panel/display-mode.ts';
import { quotaAccounts } from '../src/panel/quota-accounts.ts';
import { quotaTone, quotaValues } from '../src/panel/quota-values.ts';
import { quotaSchema } from '../src/shared/schema.ts';

test('quota values distinguish unknown, zero, exhaustion and reported percentages', () => {
  expect(quotaValues(undefined)).toEqual({
    used: undefined,
    remaining: undefined,
  });
  expect(quotaValues({ used: 0 })).toEqual({ used: 0, remaining: 100 });
  expect(quotaValues({ remaining: 0 })).toEqual({ used: 100, remaining: 0 });
  expect(quotaValues({ used: 120 })).toEqual({ used: 120, remaining: -20 });
  expect(quotaValues({ used: 31, remaining: 68 })).toEqual({
    used: 31,
    remaining: 68,
  });
  expect(quotaTone(undefined)).toBe('unknown');
  expect(quotaTone(0)).toBe('primary');
  expect(quotaTone(70)).toBe('warning');
  expect(quotaTone(90)).toBe('error');
});

test('account labels stay consistent when the last used account changes', () => {
  const quotas = ['first', 'second'].map((user) =>
    quotaSchema.parse({
      provider: 'codex',
      name: 'Codex',
      user,
    }),
  );
  const before = quotaAccounts(quotas);
  const after = quotaAccounts(
    quotas.map((quota) => ({ ...quota, last: quota.user === 'second' })),
  );
  expect(after.map((item) => item.name)).toEqual(['Codex 2', 'Codex 1']);
  expect(after[0]?.key).toBe(before[1]?.key);
  expect(new Set(after.map((item) => item.key)).size).toBe(2);
});

test('display preference migration preserves previous layouts and valid new values', () => {
  expect(restoreDisplayMode(undefined, true, 'comfortable')).toBe('medium');
  expect(restoreDisplayMode(undefined, false, 'medium')).toBe('comfortable');
  expect(restoreDisplayMode('compact', true, 'comfortable')).toBe('compact');
  expect(restoreDisplayMode('invalid', 'invalid', 'medium')).toBe('medium');
});
