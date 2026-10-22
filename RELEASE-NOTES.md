# v0.2.0

Magpie quotas and usage inside OpenChamber, using its official extension SDK.

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
