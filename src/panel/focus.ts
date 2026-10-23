export function rememberFocus(root: HTMLElement) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active))
    return () => {};
  const ringId = active.dataset.focusId;
  const group = active.closest('.display-modes, .controls, .account-setting');
  const groupName = group?.className;
  const tabId = active.dataset.id;
  return () => {
    if (active.isConnected) return;
    const selector = ringId
      ? `[data-focus-id="${CSS.escape(ringId)}"]`
      : groupName
        ? `.${CSS.escape(groupName)} ${tabId ? `[data-id="${CSS.escape(tabId)}"]` : '[role="switch"]'}`
        : null;
    if (selector)
      root.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  };
}
