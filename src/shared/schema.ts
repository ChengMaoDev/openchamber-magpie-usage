import { z } from 'zod';

const count = z.number().finite().nonnegative();
const text = z.string().optional();
const timestamp = z
  .union([z.string(), z.number().finite(), z.null()])
  .optional()
  .transform((value) => {
    if (value === null || value === undefined || value === '') return undefined;
    const numeric =
      typeof value === 'number'
        ? value
        : /^\d+(\.\d+)?$/.test(value)
          ? Number(value)
          : null;
    const date = new Date(
      numeric === null ? value : numeric < 1e12 ? numeric * 1000 : numeric,
    );
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
  });
export const periodSchema = z.enum(['today', 'week', 'month', 'all']);
export type Period = z.infer<typeof periodSchema>;
const responsePeriodSchema = z
  .enum(['today', 'week', 'month', 'all', '7d', '30d'])
  .transform(
    (value): Period =>
      value === '7d' ? 'week' : value === '30d' ? 'month' : value,
  );

const quotaWindowSchema = z.object({
  name: z.string(),
  used: z.number().finite().optional(),
  remaining: z.number().finite().optional(),
  resetsAt: timestamp,
  resetSecs: count.optional(),
  display: text,
  model: text,
  aside: z.boolean().optional(),
});
export const quotaSchema = z.object({
  provider: z.string(),
  name: z.string(),
  kind: text,
  plan: text,
  user: text,
  balance: text,
  error: text,
  readAt: timestamp,
  until: timestamp,
  last: z.boolean().optional(),
  windows: z.array(quotaWindowSchema).default([]),
});
export const quotasSchema = z.object({ data: z.array(quotaSchema) });
const counters = {
  calls: count,
  input: count,
  output: count,
  cache_read: count,
  cache_write: count,
  cost: count,
  unpriced: count.default(0),
};
const usageRowSchema = z.object({ id: z.string(), name: text, ...counters });
export const usageSchema = z.object({
  period: responsePeriodSchema,
  since: z.string(),
  ...counters,
  agents: z.array(usageRowSchema).default([]),
  models: z.array(usageRowSchema).default([]),
});
export type Quota = z.infer<typeof quotaSchema>;
export type QuotaWindow = z.infer<typeof quotaWindowSchema>;
export type Usage = z.infer<typeof usageSchema>;
export type UsageRow = z.infer<typeof usageRowSchema>;
