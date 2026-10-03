STRAY FREQUENCY cleanup pass

UPLOAD/REPLACE:
- SRC/core/assets.ts
- SRC/core/constants.ts
- SRC/data/items.ts

APPLY cleanup-large-files.patch to the current refactor/modular-architecture branch.
It makes three narrowly scoped edits:
- panels.ts: removes the hidden Breaker Yard summary/resource markup and unused yield import.
- gathering.css: removes the temporary :has() hiding workaround.
- salvage.ts: makes final-tick XP popup ordering deterministic after the depletion scene rebuild.

The patch deliberately does not change desktop shell geometry or activity-anchor geometry.
