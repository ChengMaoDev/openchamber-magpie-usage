# v0.2.5

Fixes adjacent quota cards touching in the Work Status section. Its standard layout now uses a single-column grid, preserving the existing 10-pixel card gap instead of overriding the container with block layout.

Compact mode retains its separated account rows. Display switches stay at the bottom and quota fetching is unchanged.

Validated with TypeScript, lint, 16 tests, official manifest validation and browser regression that measures Work Status card spacing at 280/380/900 pixels and checks both themes and display modes.

Update through OpenChamber Settings → Extensions or install the release ZIP. npm distribution remains disabled.
