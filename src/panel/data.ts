import type { connectHost } from '@openchamber/sdk';
import type { z } from 'zod';
import { DataError, errorResponseSchema } from '../shared/errors.ts';
import {
  type Period,
  quotasSchema,
  type Usage,
  usageSchema,
} from '../shared/schema.ts';

type Host = ReturnType<typeof connectHost>;
async function read<T>(
  host: Host,
  path: string,
  schema: z.ZodType<T>,
  query: Record<string, string>,
): Promise<T> {
  const result = await host.serviceRequest({ method: 'GET', path, query });
  let data: unknown;
  try {
    data = JSON.parse(result.body);
  } catch {
    throw new DataError('invalidData');
  }
  if (result.status !== 200) {
    const error = errorResponseSchema.safeParse(data);
    throw new DataError(error.success ? error.data.code : 'unknownError');
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new DataError('invalidData');
  return parsed.data;
}
export function createLoader(host: Host, compact: boolean) {
  return async (period: Period, fresh: boolean) =>
    Promise.allSettled([
      read(host, '/quotas', quotasSchema, { fresh: fresh ? '1' : '0' }),
      compact
        ? Promise.resolve<Usage | null>(null)
        : read(host, '/usage', usageSchema, { period }),
    ] as const);
}
export type LoadResult = Awaited<ReturnType<ReturnType<typeof createLoader>>>;

export function createRefreshQueue(
  run: (period: Period, fresh: boolean) => Promise<void>,
) {
  let active = false;
  let pending: { period: Period; fresh: boolean } | null = null;
  let disposed = false;
  return {
    async request(period: Period, fresh: boolean) {
      if (disposed) return;
      pending = { period, fresh: fresh || Boolean(pending?.fresh) };
      if (active) return;
      active = true;
      try {
        while (pending && !disposed) {
          const job = pending;
          pending = null;
          await run(job.period, job.fresh);
        }
      } finally {
        active = false;
      }
    },
    dispose() {
      disposed = true;
      pending = null;
    },
  };
}
