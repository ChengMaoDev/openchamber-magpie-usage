import type { Quota } from '../shared/schema.ts';

export function quotaAccounts(quotas: readonly Quota[]) {
  const counts = new Map<string, number>();
  const indices = new Map<string, number>();
  const identities = new Map<string, number>();
  for (const quota of quotas)
    counts.set(quota.name, (counts.get(quota.name) ?? 0) + 1);
  return quotas
    .map((quota) => {
      const index = (indices.get(quota.name) ?? 0) + 1;
      indices.set(quota.name, index);
      const identity = JSON.stringify([
        quota.provider,
        quota.user ?? '',
        quota.name,
      ]);
      const occurrence = identities.get(identity) ?? 0;
      identities.set(identity, occurrence + 1);
      return {
        quota,
        key: `${identity}:${occurrence}`,
        name:
          (counts.get(quota.name) ?? 0) > 1
            ? `${quota.name} ${index}`
            : quota.name,
      };
    })
    .sort(
      (a, b) => Number(Boolean(b.quota.last)) - Number(Boolean(a.quota.last)),
    );
}
