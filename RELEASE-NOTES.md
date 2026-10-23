# v0.3.1

Compact mode now shows one small ring per account, including Antigravity, Google AI Studio and other providers with multiple quota entries. Accounts with multiple entries explicitly show the lowest remaining or highest used value and the entry count; percentages are never summed or averaged. Unknown entries are counted separately.

- Rings no longer expand into cards when clicked, keeping the grid in place.
- Hover or keyboard focus shows original quota entries, reset times, balances and errors. Tooltips scroll within the available space and avoid the header and bottom controls; Escape dismisses them.
- Medium and Relaxed layouts continue to show every original entry. The saved Remaining/Used button updates all layouts without fetching new data.
- Summary labels and counts support English, Simplified Chinese, Traditional Chinese and Japanese.

Validation: 22 tests / 763 assertions, TypeScript, Biome, official manifest validation and browser regression covering multi-entry Antigravity/AI Studio fixtures, unknown entries, zero quotas, themes, languages, 280/380/900px widths, keyboard access and tooltip bounds in a 240px frame.

Install or update using the Git URL or release ZIP in OpenChamber Settings → Extensions. npm distribution remains disabled.

---

紧凑模式统一为每个账户一个小圆环，适用于 Antigravity、Google AI Studio 等所有供应商。多项额度明确显示最低剩余／最高已用及条目数量，未知条目单独提示，不求和或平均。

取消点击展开卡片；悬停或键盘聚焦查看原始额度、重置时间等明细，提示框在可用空间内滚动，不遮挡顶部按钮和底部设置。中等、宽松模式保留全部原始条目，继续支持四种语言及 GitHub／ZIP 分发。
