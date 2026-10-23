# v0.3.0

Quota displays now offer three saved layouts: Relaxed cards, Medium account rows and Compact small rings. The button beside Refresh switches every quota value and progress indicator between remaining and used. Warning colors consistently indicate accounts approaching exhaustion.

- Compact rings use a flat grid, with inline account names and expandable reset, balance and error details. Duplicate services keep consistent account numbers across layouts.
- Work Status keeps its bottom controls visible and scrolls the account area when needed. Sidebar request, token, cost and app/model statistics keep their complete layout in every quota mode.
- Only the sidebar and Work Status section are registered. The extension no longer adds a page in the main workspace.
- Display preferences persist, previous compact preferences migrate to Medium, and layout/value switches send no upstream requests.
- English, Simplified Chinese, Traditional Chinese and Japanese follow the host, including live changes; unsupported languages fall back to English. Long localized labels wrap within narrow panels.
- Unknown quotas remain unknown, empty states span the quota area, and zero-percent rings have no stray arc. Refresh and layout switches preserve expanded details and keyboard focus.

Validation: TypeScript, Biome, unit tests, official manifest/asset validation, and browser regression using synthetic data across themes, languages, 280/380/900px widths, six-account/multiple-window fixtures, preference migration, errors and recovery.

Install or update through OpenChamber Settings → Extensions using the Git URL or release ZIP. Reload an existing folder installation so the host refreshes the extension registration. npm distribution remains disabled.

---

新增“宽松／中等／紧凑”三档额度布局；刷新旁的按钮统一切换剩余／已用。紧凑模式为无边框小圆环，账户名同行，明细按需展开。工作状态区保留底部设置，账户较多时局部滚动；侧栏的完整统计不受额度模式影响。移除主区域独立页面入口，仅保留侧栏和工作状态面板。

支持英文、简体中文、繁体中文、日文，跟随宿主语言与主题；保留旧偏好迁移、错误提示及未知额度显示。继续通过 GitHub／ZIP 分发，不发布 npm。
