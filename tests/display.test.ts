import { expect, test } from 'bun:test';
import { restoreDisplayMode } from '../src/panel/display-mode.ts';
import { quotaAccounts } from '../src/panel/quota-accounts.ts';
import { quotaTone, quotaValues } from '../src/panel/quota-values.ts';
import { ringGroups } from '../src/panel/ring-groups.ts';
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

test('many quota windows collapse into one explicit extremum without averaging', () => {
  const { windows } = quotaSchema.parse({
    provider: 'antigravity',
    name: 'Antigravity',
    windows: [
      { name: 'Gemini · 7 days', remaining: 80 },
      { name: 'Gemini · 5 hours', remaining: 8 },
      { name: 'Claude & GPT · 7 days', remaining: 100 },
      { name: 'Claude & GPT · 5 hours', remaining: 50 },
    ],
  });
  for (const display of ['used', 'remaining'] as const) {
    const groups = ringGroups(windows, display);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.grouped).toBe(true);
    expect(groups[0]?.window).toBe(windows[1]);
    expect(groups[0]?.key).toBe('group');
  }
  expect(ringGroups(windows.slice(0, 2), 'remaining')).toHaveLength(1);
});

test('two AI Studio entries use one account ring while preserving both raw entries', () => {
  const { windows } = quotaSchema.parse({
    provider: 'ai-studio',
    name: 'Google AI Studio',
    windows: [
      { name: '代理出口', used: 0, remaining: 100 },
      { name: '管理页', used: 0, remaining: 100 },
    ],
  });
  for (const display of ['used', 'remaining'] as const) {
    const groups = ringGroups(windows, display);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.grouped).toBe(true);
    expect(groups[0]?.unknownCount).toBe(0);
  }
  expect(windows).toHaveLength(2);
  expect(ringGroups(windows.slice(0, 1), 'remaining')[0]?.grouped).toBe(false);
  expect(ringGroups([], 'remaining')).toHaveLength(1);
});

test('grouped quota windows preserve unknown values and actual reported zero', () => {
  const { windows } = quotaSchema.parse({
    provider: 'multi',
    name: 'Multi',
    windows: [
      { name: 'unknown' },
      { name: 'full', remaining: 100 },
      { name: 'exhausted', remaining: 0 },
    ],
  });
  const group = ringGroups(windows, 'remaining')[0];
  expect(group?.unknownCount).toBe(1);
  expect(group?.window).toBe(windows[2]);
  const unknowns = windows.map((window) => ({
    name: window.name,
    resetsAt: undefined,
  }));
  expect(ringGroups(unknowns, 'used')[0]?.window).toBeUndefined();
  expect(ringGroups(unknowns, 'used')[0]?.unknownCount).toBe(3);
});
