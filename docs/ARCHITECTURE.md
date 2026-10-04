# Stray Frequency Architecture

## Purpose

Stray Frequency is a browser RPG built with TypeScript, Vite, Supabase and a deliberately small module architecture. The goal is separation of responsibility, not a framework inside the game.

`SRC/main.ts` is the bootstrap. Gameplay rules, persistence, data definitions and shell markup belong in their respective modules.

## Dependency direction

```text
main
  -> UI orchestration
       -> systems
       -> services
       -> data
       -> core

systems -> data -> core
systems --------> core
services -> data/core and external services
data ------------> core
core ------------> no application layer
```

Lower layers should not import UI modules. Systems should not depend on the DOM. Data modules describe things rather than mutating runtime state.

## Source responsibilities

### `core/`

Shared domain types, constants, runtime state and asset URL construction. `assets.ts` is the central TypeScript source for public asset references.

### `data/`

Static definitions for items, rooms, skills and other authored game data. Data says what exists; systems decide what happens.

### `systems/`

Gameplay rules and state mutation: inventory, equipment, navigation, gathering, fishing, cooking, skills and related mechanics.

### `services/`

External-infrastructure boundary. Supabase authentication/database/realtime access and character persistence live here. UI and gameplay systems should not operate the Supabase client directly.

### `ui/`

Rendering and input orchestration. `gateway.ts` owns account/character entry flows. `shell.ts` owns the main shell, layout editor, compact-landscape HUD arrangement and fullscreen integration. Focused modules render scenes, panels, character state, minimap/log content and interactions.

### `styles/`

`styles/index.css` is the single stylesheet entry point. Styles are split by responsibility and include dedicated responsive/mobile-landscape layers. Import order matters.

## Application flow

1. `main.ts` loads the stylesheet and calls the gateway bootstrap.
2. The gateway restores the Supabase session and routes to authentication, character creation, or the game.
3. Persistence loads the signed-in character's progress into `gameState`.
4. `startGame` renders the shell, binds interactions, renders current regions and resumes relevant activities.
5. UI handlers request gameplay actions; systems/services update authoritative state and the UI refreshes affected regions.

## Persistent-state boundary

The browser may request an action. It must not dictate a persistent result.

Authoritative persistent changes belong behind Supabase Row Level Security and server-side RPC/database rules. Client-side checks are useful for UX but are not a security boundary.

## Authentication and multiplayer

Supabase Auth owns account sessions. Email confirmation is sent through the configured custom SMTP provider.

Room chat is cloud-backed and uses Supabase realtime/database operations. `ROOM` is multiplayer chat for the current room; `GAME` and `SYSTEM` remain local presentation channels. Current Nearby data is persisted room membership, not full online-presence truth.

## UI architecture

The world is presented as location -> scene -> interaction nodes -> actions rather than free WASD movement.

Desktop/portrait use the shared shell. Compact mobile landscape reparents status, tabs/panel and chat into movable HUD containers over a full-screen scene. Layout configuration persists; editing state does not.

See [UI-CONTRACT.md](./UI-CONTRACT.md) for the current shell/HUD contract.

## Assets

Public assets live under `public/`. Runtime references are centralized through `SRC/core/assets.ts` and derived from `import.meta.env.BASE_URL`.

The production site currently uses the root deployment base `/`, but feature code should not hard-code the production domain or historical GitHub Pages prefix.

See [ASSET-GUIDE.md](./ASSET-GUIDE.md).

## Adding a gameplay system

1. Put static definitions in `data/` and genuinely shared vocabulary in `core/`.
2. Implement rules/state mutation in a focused `systems/<feature>.ts` module.
3. Keep systems independent of the DOM.
4. Route persistent changes through the authoritative service/server boundary.
5. Render the feature through existing UI scene/panel/dialog boundaries.
6. Scope styles to the feature and verify desktop, portrait and compact-landscape behavior.
7. Run TypeScript checking and the production build.
8. Explicitly verify runtime asset references where assets changed.

## Repository documentation

- root `README.md` — project/repository entry point;
- root `BACKLOG.md` — official working backlog;
- `docs/UI-CONTRACT.md` — current interface structure and layout rules;
- `docs/ASSET-GUIDE.md` — asset hierarchy and reference policy;
- this file — module/dependency architecture.
