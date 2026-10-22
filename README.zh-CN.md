# Magpie 用量 · OpenChamber 社区扩展

[English](README.md) · [下载发布版](https://github.com/ChengMaoDev/openchamber-magpie-usage/releases)

通过 OpenChamber 官方 `@openchamber/sdk` 和 Magpie 查询接口，查看订阅额度、Token 与估算费用。此项目是独立社区扩展，不代表 Magpie 或 OpenChamber 官方。

## 安装

需要 OpenChamber **2.5.0+** 网页版或桌面版，Magpie 必须运行在 **OpenChamber 服务所在机器**。已针对 macOS 上的 Magpie **0.1.1318** 验证；Linux 和 Windows 尚未进行运行验证。

1. 打开 **设置 → 扩展 → 添加扩展**。
2. 填入 `https://github.com/ChengMaoDev/openchamber-magpie-usage`，或选择 Release 的 ZIP。
3. 审阅并批准“运行本地服务”。
4. 点击右侧栏的 **Magpie Usage**；可从扩展页面菜单打开完整页面，也可在工作状态区启用 **Magpie** 区块。

Git URL 安装支持通过 OpenChamber 更新。文件夹安装修改源码后需要重新构建并加载；ZIP 需手动替换。安装包已包含编译产物，使用时无需 Bun、系统 Node 或安装依赖。

当前官方 SDK 没有向内置 **设置 → 用量** 注册供应商的入口，因此本扩展提供独立侧栏、完整页面和工作状态区。VS Code、手机当前不加载此类扩展。

这是 **OpenChamber 扩展**，请通过 **设置 → 扩展** 使用上述 Git URL 或 ZIP 安装。不要把包名添加到 **OpenCode → 插件** 或 `plugins` 配置中，该加载器无法加载此扩展，会报 `Plugin entrypoint not found`。现已停止 npm 分发。

## 功能和统计口径

- 分账户显示额度、余额、重置时间和错误，标记最近使用账户，不将多个账户百分比相加。
- 今日、近 7 天、近 30 天、全部的调用、输入／输出／缓存 Token 与估算费用。
- 按应用、模型展示消耗；范围是本机 Magpie 记录的所有调用，不限当前会话。
- 支持英文、简体中文、繁体中文、日文，跟随 OpenChamber 的语言并即时切换。其他语言回退英文。数字、货币和时间格式同时切换；供应商返回的标签与错误保持原文。扩展入口固定名为 **Magpie Usage**。
- 默认隐藏账户名，可手动显示。这只是界面偏好，供应商名称或错误文字仍可能包含账户信息。
- 新增“紧凑模式”开关并保存选择，收紧卡片、行距及统计辅助文字，保留额度、重置时间、估算费用说明和错误提示。切换只改变布局，不额外请求数据；工作状态区在未设置偏好时默认紧凑。
- 页面可见时每 60 秒读取缓存额度；首次打开和手动刷新查询最新额度。每个账户显示上游实际读取时间。
- 快速切换周期合并为最新请求，旧结果不会显示在新周期下；失败保留有效数据并提示，暂停自动刷新，手动刷新成功后恢复。

Token 总量为输入、输出、缓存读取和缓存写入之和，不重复加入推理 Token。费用沿用 Magpie 的 API 价格估算，**不等于订阅账单**；缺少定价的调用会提示。

## 连接与权限

扩展页面通过 `host.serviceRequest()` 连接 OpenChamber 启动的服务。服务只监听 `127.0.0.1`，每个请求均验证宿主分配的认证信息，包括健康检查。

服务仅从 `~/.config/magpie/settings.json` 提取端口，宿主传入 `XDG_CONFIG_HOME` 时遵循它；文件不存在则使用 `3425`。只访问本机 Magpie 固定的额度和用量 GET 接口，不跟随重定向，不支持远程 Magpie。

不调用模型、不收集遥测、不读取供应商凭证、不改 OpenCode 配置、不读对话正文。返回内容受大小限制和 schema 校验，无关字段在服务端移除。OpenChamber 本地服务以你的用户权限运行，安装时请审阅授权。本服务不提供 shell 或任意 URL 代理。

## 开发

```sh
bun install --frozen-lockfile
bun run verify
bun run package
```

`panel/`、`service/` 是 Git URL 安装所需的已提交构建产物。ZIP 与 SHA-256 校验文件输出到 `release/`。本机真实接口验证可运行 `bun scripts/verify-live.ts` 和 `bun scripts/verify-bundle.ts`；浏览器回归仅用模拟数据，见英文 README。

## 许可与图标

扩展代码采用 [MIT](LICENSE)。Magpie SVG 来自其 MIT 许可仓库，保持原图形，仅添加 `currentColor` 适配主题。固定来源、版权和完整许可见 [第三方声明](THIRD-PARTY-NOTICES.md)。图标使用不代表官方认可，也不授予或主张商标权。
