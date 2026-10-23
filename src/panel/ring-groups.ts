import type { QuotaWindow } from '../shared/schema.ts';
import type { QuotaDisplay } from './display-mode.ts';
import { quotaValues } from './quota-values.ts';

export function ringGroups(
  windows: readonly QuotaWindow[],
  display: QuotaDisplay,
) {
  if (windows.length <= 1) {
    return (windows.length ? windows : [undefined]).map((window, index) => ({
      key: JSON.stringify([window?.name, window?.model, index]),
      window,
      grouped: false,
      unknownCount:
        window && quotaValues(window)[display] === undefined ? 1 : 0,
    }));
  }
  let selected: QuotaWindow | undefined;
  let selectedValue: number | undefined;
  let unknownCount = 0;
  for (const window of windows) {
    const value = quotaValues(window)[display];
    if (value === undefined) {
      unknownCount++;
      continue;
    }
    if (
      selectedValue === undefined ||
      (display === 'remaining' ? value < selectedValue : value > selectedValue)
    ) {
      selected = window;
      selectedValue = value;
    }
  }
  return [{ key: 'group', window: selected, grouped: true, unknownCount }];
}
