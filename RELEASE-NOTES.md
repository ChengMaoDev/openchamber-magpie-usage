# v0.2.3

Compact mode now has a separate interface: account rows instead of cards, a three-column request/token/cost summary, and expandable token, app and model breakdowns.

- Both display switches move to the bottom of the page in both layouts.
- Compact mode shows the update time once at the top. Repeated account read times and their disclosure controls are removed; quota reset countdowns remain visible.
- Statistics explanations move into an expandable section. Estimated-cost labels, missing-price warnings, unknown quotas and errors stay visible.
- Open breakdowns stay open during refresh and language changes. The saved layout preference is preserved; switching modes sends no upstream requests.
- English, Simplified Chinese, Traditional Chinese and Japanese supported with host theme colors and keyboard-accessible disclosures.

Validated with TypeScript, lint, 16 tests, official manifest validation and browser regression covering both layouts, persistence, disclosures, refresh failures, languages, themes and widths of 280/380/900 pixels.

Update from OpenChamber Settings → Extensions using the Git URL, or install the release ZIP. npm distribution remains disabled.
