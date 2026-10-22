# v0.2.2

Adds a persistent **Compact mode** switch next to **Show account names** in the Magpie Usage panel.

- Reduces card padding, gaps, metric sizes and ranking row spacing; hides repetitive metric helper text.
- Keeps quota percentages, progress bars, reset times, balances, cost caveats and errors visible. Usage statistics remain available in the panel and full page.
- Remembers the selection across reloads. Switching density does not issue upstream requests. An explicit choice made while stored preferences are loading takes precedence.
- Adds English, Simplified Chinese, Traditional Chinese and Japanese labels. The Work Status section defaults to compact density when no preference is saved.

Validation: TypeScript and lint checks, 16 tests, official extension-manifest validation, and browser regression for persistence, live languages, themes, failures and widths of 280/380/900 pixels. No browser script errors observed.

Install or update through **OpenChamber → Settings → Extensions** using the repository URL or release ZIP. Folder installs must reload after rebuilding. npm distribution remains disabled; this is an OpenChamber extension and must not be added to OpenCode's Plugins page.
