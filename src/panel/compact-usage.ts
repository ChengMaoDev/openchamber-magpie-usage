import type { I18n } from '../i18n/index.ts';
import type { Usage, UsageRow } from '../shared/schema.ts';
import { element, totalTokens } from './format.ts';

export function renderCompactUsage(
  root: HTMLElement,
  usage: Usage,
  i18n: I18n,
  expanded: Set<string>,
) {
  const { t, number, money } = i18n;
  root.replaceChildren();
  const summary = element('dl', 'compact-totals');
  for (const [label, value] of [
    [t('calls'), number(usage.calls)],
    [t('tokens'), number(totalTokens(usage))],
    [t('cost'), money(usage.cost)],
  ]) {
    const metric = element('div');
    metric.append(
      element('dt', '', label),
      element('dd', 'compact-total-value', value),
    );
    summary.append(metric);
  }
  root.append(summary, element('p', 'compact-cost-note', t('costDetail')));
  const detail = (key: string, title: string, meta: string) => {
    const details = element('details', 'compact-disclosure');
    details.open = expanded.has(key);
    const caption = element('summary');
    caption.append(
      element('span', '', title),
      element('span', 'compact-disclosure-meta', meta),
    );
    details.append(caption);
    details.addEventListener('toggle', () => {
      if (!details.isConnected) return;
      if (details.open) expanded.add(key);
      else expanded.delete(key);
    });
    root.append(details);
    return details;
  };
  const tokenDetails = detail(
    'tokens',
    t('tokenDetails'),
    `${t('cache')} ${number(usage.cache_read)}`,
  );
  const tokenList = element('dl', 'compact-token-list');
  for (const [label, amount] of [
    [t('input'), usage.input],
    [t('output'), usage.output],
    [t('cache'), usage.cache_read],
    [t('cacheWrite'), usage.cache_write],
  ] as const) {
    const row = element('div');
    row.append(element('dt', '', label), element('dd', '', number(amount)));
    tokenList.append(row);
  }
  tokenDetails.append(
    tokenList,
    element('p', 'compact-context-note', t('callsDetail')),
    element('p', 'compact-context-note', t('tokensDetail')),
  );
  const ranking = (
    key: string,
    title: string,
    rows: readonly UsageRow[],
    limit?: number,
  ) => {
    const details = detail(key, title, String(rows.length));
    const table = element('table', 'compact-ranking');
    const head = element('thead');
    const labels = element('tr');
    for (const label of [t('name'), t('tokens'), t('cost')]) {
      const th = element('th', '', label);
      th.scope = 'col';
      labels.append(th);
    }
    head.append(labels);
    const body = element('tbody');
    const ordered = [...rows].sort((a, b) => totalTokens(b) - totalTokens(a));
    for (const row of limit ? ordered.slice(0, limit) : ordered) {
      const item = element('tr');
      item.append(
        element('td', '', row.name || row.id),
        element('td', '', number(totalTokens(row))),
        element('td', '', money(row.cost)),
      );
      body.append(item);
    }
    table.append(head, body);
    if (rows.length) details.append(table);
    else details.append(element('p', 'compact-context-note', t('noRecords')));
  };
  ranking('apps', t('apps'), usage.agents);
  ranking('models', t('models'), usage.models, 10);
  const notes = detail('notes', t('statisticsNotes'), '');
  notes.append(element('p', 'compact-context-note', t('footnote')));
  if (usage.unpriced > 0)
    root.append(
      element(
        'p',
        'compact-context-note',
        t('unpriced', { count: number(usage.unpriced) }),
      ),
    );
}
