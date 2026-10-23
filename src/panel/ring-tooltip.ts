import { element } from './format.ts';

export function createRingTooltip() {
  const tooltip = element('div', 'ring-tooltip');
  tooltip.id = 'quota-ring-tooltip';
  tooltip.role = 'tooltip';
  tooltip.hidden = true;
  document.body.append(tooltip);
  let anchor: HTMLElement | null = null;
  let hideTimer: number | undefined;
  const cancelHide = () => window.clearTimeout(hideTimer);
  const hide = () => {
    cancelHide();
    anchor?.removeAttribute('aria-describedby');
    anchor = null;
    tooltip.hidden = true;
  };
  const queueHide = () => {
    cancelHide();
    hideTimer = window.setTimeout(hide, 120);
  };
  const show = (target: HTMLElement, text: string) => {
    hide();
    anchor = target;
    tooltip.textContent = text;
    tooltip.hidden = false;
    target.setAttribute('aria-describedby', tooltip.id);
    const bounds = target.getBoundingClientRect();
    const list = target.closest('.quota-list')?.getBoundingClientRect();
    const topLimit = Math.max(8, list?.top ?? 8);
    const bottomLimit = Math.min(
      innerHeight - 8,
      list?.bottom ?? innerHeight - 8,
    );
    const below = bottomLimit - bounds.bottom - 4;
    const above = bounds.top - topLimit - 4;
    const placeBelow = below >= above;
    const besideSpace = Math.max(below, above);
    const overlay = besideSpace < 64;
    const rightSpace = innerWidth - bounds.right - 8;
    const leftSpace = bounds.left - 8;
    const placeRight = rightSpace >= leftSpace;
    tooltip.style.maxWidth = `${Math.max(1, overlay ? Math.max(rightSpace, leftSpace) - 4 : innerWidth - 16)}px`;
    tooltip.style.maxHeight = `${Math.max(0, overlay ? bottomLimit - topLimit : besideSpace)}px`;
    const popup = tooltip.getBoundingClientRect();
    const left = overlay
      ? placeRight
        ? bounds.right + 4
        : bounds.left - popup.width - 4
      : Math.max(8, Math.min(bounds.left, innerWidth - popup.width - 8));
    const top = overlay
      ? topLimit
      : placeBelow
        ? bounds.bottom + 4
        : Math.max(topLimit, bounds.top - popup.height - 4);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') hide();
  };
  const onScroll = (event: Event) => {
    if (event.target instanceof Node && tooltip.contains(event.target)) return;
    hide();
  };
  tooltip.addEventListener('pointerenter', cancelHide);
  tooltip.addEventListener('pointerleave', () => {
    if (document.activeElement !== anchor) queueHide();
  });
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', hide);
  document.addEventListener('scroll', onScroll, true);
  return {
    attach(target: HTMLElement, text: string) {
      target.addEventListener('pointerenter', () => show(target, text));
      target.addEventListener('pointerleave', (event) => {
        if (
          event.relatedTarget instanceof Node &&
          tooltip.contains(event.relatedTarget)
        )
          return;
        if (document.activeElement !== target) queueHide();
      });
      target.addEventListener('focus', () => show(target, text));
      target.addEventListener('blur', hide);
    },
    dispose() {
      hide();
      tooltip.remove();
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', hide);
      document.removeEventListener('scroll', onScroll, true);
    },
  };
}
