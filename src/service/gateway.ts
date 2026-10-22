import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { DataError } from '../shared/errors.ts';
import { type Period, quotasSchema, usageSchema } from '../shared/schema.ts';

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export { DataError as GatewayError } from '../shared/errors.ts';

export async function discoverPort(): Promise<number> {
  const folder = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  let content: string;
  try {
    content = await readFile(join(folder, 'magpie/settings.json'), 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return 3425;
    throw new DataError('settingsRead');
  }
  try {
    return z
      .object({ port: z.number().int().min(1).max(65535).default(3425) })
      .parse(JSON.parse(content)).port;
  } catch {
    throw new DataError('settingsInvalid');
  }
}

export function createGateway(port: number, fetcher: Fetcher = fetch) {
  const origin = `http://127.0.0.1:${port}`;
  const read = async (path: string): Promise<unknown> => {
    let response: Response;
    try {
      response = await fetcher(`${origin}${path}`, {
        headers: {
          Authorization: 'Bearer magpie-openchamber-usage',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      });
    } catch {
      throw new DataError('unreachable');
    }
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 403) throw new DataError('forbidden');
      if (response.status === 404) throw new DataError('unsupported');
      throw new DataError('upstream');
    }
    try {
      const reader = response.body?.getReader();
      if (!reader) throw new DataError('invalidData');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 8 * 1024 * 1024) {
            await reader.cancel();
            throw new DataError('limitExceeded');
          }
          chunks.push(part.value);
        }
      } finally {
        reader.releaseLock();
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      if (error instanceof DataError) throw error;
      throw new DataError('invalidData');
    }
  };
  return {
    async quotas(fresh: boolean) {
      const result = quotasSchema.safeParse(
        await read(`/v1/magpie/quotas${fresh ? '' : '?kept=1'}`),
      );
      if (!result.success) throw new DataError('invalidData');
      return result.data;
    },
    async usage(period: Period) {
      const wirePeriod =
        period === 'week' ? '7d' : period === 'month' ? '30d' : period;
      let result = usageSchema.safeParse(
        await read(`/v1/magpie/usage?period=${wirePeriod}`),
      );
      if (
        result.success &&
        result.data.period !== period &&
        wirePeriod !== period
      ) {
        result = usageSchema.safeParse(
          await read(`/v1/magpie/usage?period=${period}`),
        );
      }
      if (!result.success) throw new DataError('invalidData');
      if (result.data.period !== period) throw new DataError('periodMismatch');
      return result.data;
    },
  };
}
