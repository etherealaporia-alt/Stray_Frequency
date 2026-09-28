# Stray Frequency

Stray Frequency is a browser RPG prototype built with TypeScript, Vite, and Supabase. It currently includes account and character flows, cloud-backed character progress, room navigation, inventory and exact-slot equipment, skills, the game log, minimap, salvage gathering, fishing, cooking, and desktop/mobile interaction handling.

This repository preserves a structurally locked game shell. Feature work should extend the existing scene and panel regions without redesigning their geometry. Read [docs/UI-CONTRACT.md](docs/UI-CONTRACT.md) before changing layout code.

## Run locally

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Validate and build

```bash
npx tsc --project .
npm run build
```

`npm run build` also runs TypeScript checking before the Vite production build. The repository does not currently define an automated test suite or lint script.

Vite is configured with the GitHub Pages base path `/Stray_Frequency/`. Static asset URLs are derived from `import.meta.env.BASE_URL`; do not hard-code that deployment prefix in feature code.

## Source layout

```text
SRC/
  main.ts              application bootstrap
  core/                shared types, state, constants, and asset URLs
  data/                static item, room, and skill definitions
  services/            Supabase and progress persistence
  systems/             gameplay rules and state mutations
  ui/                  shell/region rendering and input orchestration
  styles/              ordered modular CSS entry and responsibility files
```

The dependency rule is simple: data describes things, state represents the current game, systems implement rules, services own external infrastructure, and UI renders state and translates input into system actions. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for module-level guidance.

## Assets

The current `public/` hierarchy is authoritative and must not be flattened or reorganized casually. `SRC/core/assets.ts` is the application source of truth for public paths. See [docs/ASSET-GUIDE.md](docs/ASSET-GUIDE.md) for the audited tree, current mappings, and known unresolved files.

## Character progress persistence

Inventory, equipment, skills, and cooking progress are stored in the signed-in character's Supabase `characters.progress` JSONB column. Apply `supabase/migrations/20260927143000_add_character_progress.sql` before using cloud saves. Existing browser-local progress is imported once and removed after a successful cloud save.

## Deployment

`.github/workflows/deploy.yml` builds pushes to `main` with Node.js 22 and deploys `dist/` to GitHub Pages. Refactor work should be reviewed and merged into `main`; feature branches are not deployed automatically.
