# Stray Frequency UI Contract

## Status

The game shell is structurally locked. This document records the existing layout contract; it does not propose a redesign.

Ordinary feature work may render content inside an existing region. It must not change the region's geometry, placement, stacking, responsive role, or scroll ownership. A shell change requires an explicit decision to unlock the shell and must be reviewed separately from feature work.

## Locked shell regions

The following regions and the relationships between them are locked:

- the game shell and its viewport boundary;
- the masthead;
- the character card/profile;
- the main world/location viewport, including its heading and scene stage;
- the chat/game log;
- the right sidebar;
- the minimap;
- the RuneScape-style menu/tab area; and
- the active/context panel.

The lock includes DOM hierarchy and ordering, grid/flex tracks, widths and heights, gaps, padding that determines geometry, aspect ratios, positioning, stacking, and desktop/mobile rearrangement. Feature modules may populate these surfaces, update their state, and attach interactions. They may not resize or relocate them to make a feature fit.

Shell geometry belongs to the shell and responsive styles. Feature styles must not target shell ancestors with layout-changing declarations or use broad selectors that can override them through specificity or import order. In particular, a feature stylesheet must not redefine the geometry of `.game-shell`, `.masthead`, `.character-card`, `.play-grid`, `.world-column`, `.location-card`, `.scene-wrap`, `.chat`, `.sidebar`, `.minimap`, `.rune-menu`, or `.active-panel`.

## Scroll ownership

On normal desktop gameplay layouts, the application occupies the viewport and the page itself is not a gameplay scroll surface. History and content that are intentionally scrollable remain inside their existing owners, principally the game log and the active/context panel. A feature must not make the document scroll to compensate for oversized feature content.

On narrow/mobile layouts, the existing responsive shell may stack regions and allow the document to scroll vertically so those regions remain reachable. The game log continues to own its history scrolling, and feature-specific controls such as mobile inventory paging retain their existing behavior. Horizontal page scrolling is not part of the contract.

Do not transfer scroll ownership between the document, shell regions, and feature content as an incidental fix. Do not apply arbitrary `overflow: hidden` to the page, shell, panels, or feature containers to conceal layout errors. Existing clipping that is intrinsic to a scene viewport, sprite frame, or locked desktop viewport is part of the shell implementation and is not permission for feature CSS to add more clipping.

## Interaction vocabulary

Desktop and mobile interactions intentionally have different semantics and must remain compatible with the current handlers:

- Desktop hover preserves the existing preview, inspection, and tooltip behavior.
- Desktop double-click preserves the existing perform, equip, deploy, or use behavior for the applicable target.
- Mobile tap means perform or use.
- Mobile hold means inspect or “tell me about it.”
- Mobile drag means move where the target supports movement.

Do not collapse these into a single click model. A refactor must preserve gesture thresholds, cancellation behavior, and protection against a hold or drag also firing an unintended tap action.

## Feature integration rules

New gameplay features must:

1. render into an existing scene, log, or panel boundary;
2. keep gameplay rules outside shell-rendering code;
3. scope feature CSS to a feature-owned root class;
4. fit the existing desktop and mobile geometry;
5. preserve the current interaction vocabulary; and
6. be checked in the major desktop, portrait-mobile, and short landscape-mobile states.

Fishing, gathering, cooking, inventory, and future systems are all subject to this contract. No feature is a reason to change the shell implicitly.
