import { describe, expect, test } from 'bun:test';
import { remainingLabel, resetLabel } from '../src/panel/format.ts';
import { createGateway } from '../src/service/gateway.ts';
import { usageSchema } from '../src/shared/schema.ts';

describe('Magpie 数据边界', () => {
  test('large responses are cancelled instead of accumulating unbounded data', async () => {
    let cancelled = false;
    const client = createGateway(
      3425,
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              controller.enqueue(new Uint8Array(1024 * 1024));
            },
            cancel() {
              cancelled = true;
            },
          }),
        ),
    );
    await expect(client.quotas(false)).rejects.toThrow('limitExceeded');
    expect(cancelled).toBe(true);
  });
  test('documented period aliases are retried when a server uses that contract', async () => {
    const periods: string[] = [];
    const client = createGateway(3425, async (input) => {
      const period = new URL(input).searchParams.get('period');
      periods.push(period ?? '');
      return Response.json({
        period: period === 'week' ? 'week' : 'month',
        since: '',
        calls: 0,
        input: 0,
        output: 0,
        cache_read: 0,
        cache_write: 0,
        cost: 0,
      });
    });
    expect((await client.usage('week')).period).toBe('week');
    expect(periods).toEqual(['7d', 'week']);
  });
  test('适配实际的 7d 周期，并拒绝错误周期', async () => {
    const summary = {
      since: '',
      calls: 1,
      input: 100,
      output: 20,
      cache_read: 0,
      cache_write: 0,
      cost: 0,
    };
    const client = createGateway(3425, async (input) => {
      expect(input).toEndWith('period=7d');
      return Response.json({ ...summary, period: '7d' });
    });
    expect((await client.usage('week')).period).toBe('week');
    const wrong = createGateway(3425, async () =>
      Response.json({ ...summary, period: '30d' }),
    );
    await expect(wrong.usage('week')).rejects.toThrow('periodMismatch');
  });
  test('保留超额使用，保留未知额度，过滤未声明字段', async () => {
    const client = createGateway(3425, async (input, init) => {
      expect(String(input)).toBe(
        'http://127.0.0.1:3425/v1/magpie/quotas?kept=1',
      );
      expect(new Headers(init?.headers).get('Authorization')).toBe(
        'Bearer magpie-openchamber-usage',
      );
      return Response.json({
        data: [
          {
            provider: 'codex',
            name: 'Codex',
            user: 'test@example.invalid',
            windows: [{ name: 'Weekly', used: 120 }],
          },
          {
            provider: 'custom',
            name: 'Custom',
            windows: [{ name: 'Credits', display: '未知总额度' }],
            privateField: 'must not leave service',
          },
        ],
      });
    });
    const data = await client.quotas(false);
    expect(data.data[0]?.windows[0]?.used).toBe(120);
    expect(remainingLabel({ used: 120 })).toBe('剩余 0.0%');
    expect(remainingLabel({})).toBe('额度未知');
    expect(data.data[1]).not.toHaveProperty('privateField');
  });
  test('认证失败不会暴露上游响应内容', async () => {
    const client = createGateway(
      3425,
      async () => new Response('sensitive upstream response', { status: 403 }),
    );
    await expect(client.usage('today')).rejects.toThrow('forbidden');
  });
  test('错误格式和网络故障明确报错', async () => {
    await expect(
      createGateway(3425, async () => Response.json({ data: 'bad' })).quotas(
        true,
      ),
    ).rejects.toThrow('invalidData');
    await expect(
      createGateway(3425, async () => {
        throw new Error('private diagnostics');
      }).usage('week'),
    ).rejects.toThrow('unreachable');
  });
  test('拒绝将错误的 token 计数显示成零', () => {
    expect(
      usageSchema.safeParse({ period: 'today', since: '', calls: 0 }).success,
    ).toBe(false);
  });
  test('过期的重置时间不会被显示为已获得新额度', () => {
    expect(
      resetLabel('2026-10-22T00:00:00Z', Date.parse('2026-10-23T00:00:00Z')),
    ).toBe('重置时间已到，等待额度更新');
    expect(resetLabel('bad-date')).toBeNull();
  });
});
