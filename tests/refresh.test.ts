import { expect, test } from 'bun:test';
import { createRefreshQueue } from '../src/panel/data.ts';

test('rapid period changes only run the active request and latest queued period', async () => {
  const calls: string[] = [];
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queue = createRefreshQueue(async (period, fresh) => {
    calls.push(`${period}:${fresh}`);
    if (calls.length === 1) await gate;
  });
  const pending = queue.request('today', false);
  await queue.request('week', true);
  await queue.request('month', false);
  await queue.request('all', false);
  release?.();
  await pending;
  expect(calls).toEqual(['today:false', 'all:true']);
});
test('disposing drops queued requests', async () => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const calls: string[] = [];
  const queue = createRefreshQueue(async (period) => {
    calls.push(period);
    await gate;
  });
  const pending = queue.request('today', false);
  await queue.request('week', false);
  queue.dispose();
  release?.();
  await pending;
  await queue.request('month', true);
  expect(calls).toEqual(['today']);
});
