# Stray Frequency UI Contract

## Purpose

The interface exists for the player. Structural complexity should support the game rather than make the player operate the software.

The current shell uses a shared desktop/portrait structure and a dedicated compact-landscape HUD. Feature work should respect those boundaries. Layout changes are allowed when they are deliberate UI work; gameplay features should not accidentally reshape the shell simply to make their content fit.

## Core structure

The game is built around:

- a graphical world scene;
- a persistent chat/game log;
- character status;
- a RuneScape-style tab system and active panel; and
- a global control bar.

On desktop and ordinary portrait layouts these regions live in the main shell. In compact mobile landscape, the scene becomes the full-screen canvas and the character status, tabs/panel, and chat are presented as HUD modules over it.

The application chooses the structural grammar. The player may rearrange the supported pieces through Edit Layout, but cannot arbitrarily resize them.

## Desktop and portrait layout

Desktop uses the scene/chat world column alongside the character/sidebar column. The supported layout preferences are:

- global bar at the top or bottom;
- sidebar on the left or right;
- scene/chat ordering; and
- character/tab ordering.

These preferences persist. Layout-edit mode itself does not.

Portrait/mobile layouts may adapt or stack regions as defined by the responsive shell. Feature CSS must not create document-wide horizontal scrolling or silently move ownership of scrolling between regions.

## Compact mobile landscape

Compact landscape is currently detected for coarse-pointer landscape devices with a maximum height of 700px.

In this mode:

- the scene fills the available screen;
- the tab stack, character status, and chat become separate HUD modules;
- the tab/panel module can be collapsed by tapping the active tab;
- chat can be collapsed;
- HUD modules can be moved only while Edit Layout is active;
- positions persist in local storage;
- modules are clamped to the usable screen and may overlap one another;
- the global bar may dock to the top or bottom; and
- the Fullscreen control uses the browser Fullscreen API when available.

HUD modules are movable, not freely resizable.

The compact-landscape implementation is still active work. The target inventory presentation is 28 simultaneously accessible slots in a 4 x 7 grid, with no inventory scrolling or pagination.

## Layout editing

Normal play keeps layout controls locked.

`EDIT LAYOUT` enters an explicit editing state. On desktop it exposes the supported structural swaps. In compact landscape it allows HUD dragging and global-bar docking. `RESET` restores the relevant defaults.

Persistent placement is configuration. The fact that the player is currently editing the layout is transient state.

## Interaction vocabulary

Desktop and touch input intentionally differ where appropriate:

- desktop hover may preview or inspect;
- desktop double-click may perform/use/equip where supported;
- mobile tap performs or uses;
- mobile hold inspects;
- mobile drag moves where movement is supported.

A refactor must avoid causing a hold or drag to fire an unintended tap action.

## Feature integration rules

Gameplay features should:

1. render inside an established scene, log, dialog, or panel boundary;
2. keep gameplay rules outside shell-rendering code;
3. scope feature CSS to feature-owned selectors;
4. work across desktop, portrait mobile, and compact landscape;
5. preserve the intended input vocabulary; and
6. avoid changing shell geometry as an incidental feature fix.

A deliberate shell/HUD redesign is a UI task and should be reviewed as such rather than hidden inside unrelated gameplay work.
