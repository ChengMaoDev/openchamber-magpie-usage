import { z } from 'zod';

export const displayModeSchema = z.enum(['comfortable', 'medium', 'compact']);
export type DisplayMode = z.infer<typeof displayModeSchema>;
export const quotaDisplaySchema = z.enum(['used', 'remaining']);
export type QuotaDisplay = z.infer<typeof quotaDisplaySchema>;

export function restoreDisplayMode(
  value: unknown,
  legacyCompact: unknown,
  fallback: DisplayMode,
): DisplayMode {
  const parsed = displayModeSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return typeof legacyCompact === 'boolean'
    ? legacyCompact
      ? 'medium'
      : 'comfortable'
    : fallback;
}
