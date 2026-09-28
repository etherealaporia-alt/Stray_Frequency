# Stray Frequency Architecture

## Purpose

The application is split by responsibility while preserving the behavior and presentation of the pre-refactor prototype. The modules are deliberately small and direct: this is a browser RPG architecture, not a framework inside the application.

`SRC/main.ts` is the application bootstrap. It imports the root stylesheet, finds the application mount point, and starts the gateway. It must not accumulate gameplay rules, data definitions, persistence logic, or shell markup.

## Dependency direction

The intended dependency flow is:

```text
main
  -> UI orchestration
       -> systems
       -> services
       -> data
       -> core

systems -> data -> core
systems --------> core
services -> data/core and other services
data ------------> core
core ------------> no application layer
```

There are no circular imports. Lower layers do not import UI modules. Systems do not access the DOM, and data modules do not mutate game state.

## Source responsibilities

### `core/`

- `types.ts` defines the shared domain vocabulary: characters, rooms, items, equipment slots, progress payloads, and runtime state.
- `constants.ts` holds stable gameplay and UI constants such as inventory capacity, activity timing, XP amounts, salvage probabilities, and equipment slot order.
- `state.ts` owns the current in-memory `gameState`, initial-state factories, log insertion, and compatibility projections such as inventory totals.
- `assets.ts` is the only TypeScript module that constructs public asset URLs. Every URL is based on `import.meta.env.BASE_URL`.

Core is not a place for feature workflows or DOM rendering.

### `data/`

- `items.ts` describes item identities, copy, stack/equipment metadata, and named asset references.
- `rooms.ts` describes locations and the actions each location offers.
- `skills.ts` describes skills, their presentation metadata, unlock levels, and the existing XP curve.

Data describes what exists. It does not decide when an action is allowed or perform state changes.

### `systems/`

- `inventory.ts` handles inventory ownership, stacking, movement, consumption, and ownership queries.
- `equipment.ts` implements exact-slot equip/unequip behavior and derived equipment capability.
- `navigation.ts` implements room transitions and the existing location restoration rule.
- `salvage.ts`, `fishing.ts`, and `cooking.ts` own their activity rules, timers, rewards, and mutual-exclusion checks.
- `skills.ts` applies XP and level changes using the curve defined by skill data.

Systems mutate the supplied `GameState` and report effects through narrow hooks for logging, persistence, rendering, or deterministic randomness. They do not render HTML and do not know shell geometry.

Ownership and equipment are intentionally distinct. Inventory plus equipped slots determines what the character possesses; the exact equipment slot determines what the character can currently use. Equipping a main-hand item therefore does not mean every owned tool is usable.

### `services/`

- `supabase.ts` owns the Supabase client and all authentication/character database operations.
- `persistence.ts` serializes, validates, loads, repairs, and saves the version 1 character progress payload, including the existing one-time local-storage import path.

Services are the external-infrastructure boundary. UI and systems do not operate the Supabase client directly.

### `ui/`

- `gateway.ts` renders and coordinates login, registration, email-confirmation messaging, character creation, character lookup, and entry into the game.
- `shell.ts` owns the locked shell markup and shell-level text updates.
- `scene.ts`, `panels.ts`, `character-card.ts`, `minimap.ts`, and `log.ts` render their existing regions from state.
- `interactions.ts` translates buttons, keyboard events, chat input, and system callbacks into actions and targeted rerenders.
- `mobile-input.ts` preserves the tap, hold, drag, and double-tap gesture vocabulary separately from desktop click/double-click behavior.
- `html.ts` contains the shared HTML escaping helper.

UI may decide what to render and which system action to call. Gameplay eligibility, rewards, timers, inventory mutation, and persistence formats do not belong in UI modules.

## Application flow

1. `main.ts` imports `styles/index.css` and calls `bootstrap`.
2. The gateway restores the Supabase session and routes to authentication, character creation, or the game.
3. Persistence loads the character's versioned progress into `gameState`.
4. `startGame` renders the locked shell, binds stable shell interactions, renders each region, and resumes an active cooking timer when required.
5. UI handlers call a system. The system updates state and invokes hooks; the UI hook refreshes only the regions the monolith refreshed for that event.

## Styles

`styles/index.css` is the single stylesheet entry point. Its import order is behaviorally significant.

The monolithic stylesheet contained multiple historical phases and overlapping media queries. The refactor moved those rules without rewriting them. Files ending in `-legacy`, `-canonical`, or `-fit` retain those source phases so selectors, specificity, and cascade order stay identical. This means some shell-related declarations remain distributed across phase files rather than being consolidated aggressively. Consolidation should wait for visual regression coverage.

Feature files such as `inventory.css`, `gathering.css`, `fishing.css`, and `cooking.css` may style content inside existing regions. They must not change shell tracks, region dimensions, positioning, scroll ownership, or responsive rearrangement. See [UI-CONTRACT.md](./UI-CONTRACT.md).

## Adding a gameplay system

1. Add static definitions to `data/` and shared types/constants to `core/` only when genuinely shared.
2. Implement eligibility checks and state mutation in a focused `systems/<feature>.ts` module.
3. Accept the state and narrow hooks; do not query the DOM or import UI.
4. Add persistence fields only through a versioned, validated change in `services/persistence.ts`.
5. Render the feature inside an existing shell region from `ui/`, and translate user input into system calls.
6. Put scoped feature rules in `styles/<feature>.css` and append its import at the correct intentional cascade position.
7. Verify desktop hover/double-click semantics and mobile tap/hold/drag semantics separately.
8. Run TypeScript checking and the production Vite build, then verify all named asset references under the configured deployment base.

## Related contracts

- [UI-CONTRACT.md](./UI-CONTRACT.md) defines the structurally locked shell.
- [ASSET-GUIDE.md](./ASSET-GUIDE.md) records the current public asset hierarchy and URL policy.
