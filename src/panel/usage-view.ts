import type { I18n } from '../i18n/index.ts';
import type { Usage, UsageRow } from '../shared/schema.ts';
import { element, totalTokens } from './format.ts';

export function renderUsage(root: HTMLElement, usage: Usage, i18n: I18n) {
  const { t, number, money } = i18n;
  root.replaceChildren();
  const metrics = element('div', 'metrics');
  for (const [label, value, detail] of [
    [t('calls'), number(usage.calls), t('callsDetail')],
    [t('tokens'), number(totalTokens(usage)), t('tokensDetail')],
    [t('cost'), money(usage.cost), t('costDetail')],
    [t('cache'), number(usage.cache_read), t('cacheDetail')],
  ]) {
    const metric = element('div');
    metric.append(
      element('p', 'muted', label),
      element('p', 'metric-value', value),
      element('p', 'metric-detail', detail),
    );
    metrics.append(metric);
  }
  root.append(
    metrics,
    element(
      'p',
      'muted',
      t('breakdown', {
        input: number(usage.input),
        output: number(usage.output),
        write: number(usage.cache_write),
      }),
    ),
  );
  const ranking = (title: string, rows: readonly UsageRow[]) => {
    const section = element('section', 'rank');
    section.append(element('h2', 'section-heading', title));
    for (const row of [...rows].sort(
      (a, b) => totalTokens(b) - totalTokens(a),
    )) {
      const item = element('div', 'rank-row');
      item.append(
        element('span', 'rank-name', row.name || row.id),
        element(
          'span',
          'rank-value',
          `${number(totalTokens(row))} token · ${money(row.cost)}`,
        ),
      );
      section.append(item);
    }
    if (rows.length === 0)
      section.append(element('p', 'muted', t('noRecords')));
    root.append(section);
  };
  ranking(t('apps'), usage.agents);
  ranking(
    t('models'),
    [...usage.models]
      .sort((a, b) => totalTokens(b) - totalTokens(a))
      .slice(0, 10),
  );
  root.append(
    element(
      'p',
      'footnote',
      `${t('footnote')} ${usage.unpriced > 0 ? t('unpriced', { count: number(usage.unpriced) }) : ''}`,
    ),
  );
}
