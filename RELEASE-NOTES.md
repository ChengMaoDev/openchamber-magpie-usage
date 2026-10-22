# v0.2.1

Magpie quotas and usage inside OpenChamber, using its official extension SDK.

This release adds npm distribution as `openchamber-magpie-usage@0.2.1`. The package ships the prebuilt panel, local service, icon and license notices, with no runtime dependencies or install hooks. CI validates the npm tarball contents and its OpenChamber manifest. Existing quota and usage behavior is unchanged from v0.2.0.

Install with `npm install --prefix ./openchamber-extensions --no-save openchamber-magpie-usage@0.2.1`, then add the absolute path to `openchamber-extensions/node_modules/openchamber-magpie-usage` in OpenChamber Settings → Extensions. OpenChamber does not directly accept npm package names.

- English, Simplified Chinese, Traditional Chinese and Japanese follow the OpenChamber language, including live changes, number formats and error messages. Other locales fall back to English.
- Per-account subscription limits and reset times, with a compact Work Status section.
- Today, 7-day, 30-day and all-time token and estimated-cost statistics, grouped by app and model.
- Serialized refreshes coalesce fast period changes and ignore obsolete usage results. Failed refreshes retain valid data with an explicit warning.
- Numeric and ISO reset timestamps are supported. Unknown quotas stay unknown.
- Account names are hidden by default and can be shown explicitly.
- Magpie icon reused with attribution and the upstream MIT notice; this is an independent community extension.
- Prebuilt ZIP and SHA-256 checksum; Git URL installs include committed bundles and need no build step.

Requires OpenChamber 2.5.0+ and a local Magpie with the quotas and usage APIs. Validated against Magpie 0.1.1318 on macOS. Linux and Windows are not runtime-tested. The built-in OpenChamber Usage settings page is not extended by this SDK extension.

Install from Settings → Extensions using the repository URL or the release ZIP. Approve the local-service permission, then open **Magpie Usage**.
