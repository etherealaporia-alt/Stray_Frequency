# Stray Frequency

**Stray Frequency** is a cyberpunk browser RPG about making a life in a city that already had its golden age.

The player is not a chosen hero. They are another resident of South Dock: working, trading, gathering, helping people, making enemies, finding opportunities, and gradually becoming part of a place that continues to live despite economic decline and failing infrastructure.

The project's guiding aim is simple:

> **Make somewhere people enjoy existing in.**

## Current status

Stray Frequency is an active prototype. The current build includes Supabase-backed accounts and characters, persistent progression, location navigation, inventory and equipment, gathering activities, fishing and cooking, room-based multiplayer chat, desktop/mobile interaction handling, a PWA foundation, and an experimental compact landscape HUD.

The live prototype is served from `https://strayfrequency.co.uk`.

## Technology

- TypeScript
- Vite
- Supabase Auth, PostgreSQL, RLS, RPCs and Realtime
- GitHub Pages deployment
- Resend-backed transactional authentication email

## Run locally

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Vite will print the local development address.

## Validate and build

```bash
npm run build
```

The build runs TypeScript checking before the Vite production build. There is currently no automated test suite or lint script.

## Source layout

```text
SRC/
  main.ts              application bootstrap
  core/                shared types, state, constants and asset URLs
  data/                static game definitions
  services/            Supabase and persistence boundaries
  systems/             gameplay rules and state mutation
  ui/                  rendering and input orchestration
  styles/              modular CSS
```

The broad dependency rule is: **data describes things; state represents the current game; systems implement rules; services own external infrastructure; UI renders state and translates input into actions.** See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for details.

## Project documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — application boundaries and module responsibilities.
- [`docs/UI-CONTRACT.md`](docs/UI-CONTRACT.md) — current shell/layout rules and interaction vocabulary.
- [`docs/ASSET-GUIDE.md`](docs/ASSET-GUIDE.md) — static asset conventions and known asset issues.
- [`BACKLOG.md`](BACKLOG.md) — official project backlog.

Documentation records the current implementation contract, not immutable game design. When an explicit design decision changes the contract, update the documentation with the implementation.

## Deployment

`main` is the authoritative branch. `.github/workflows/deploy.yml` builds and deploys the production site to GitHub Pages. Vite uses a root base path (`/`) because the project is served from its custom domain.

Static asset URLs should continue to derive from `import.meta.env.BASE_URL`; feature code should not hard-code a hosting path.

## Security boundary

Persistent game results are server-authoritative. The browser may request an action; it must not dictate the persistent result. Supabase RLS and server-side RPCs enforce the current persistence boundary.

## Development principle

Stray Frequency should remain a game about a place and the people living there, rather than a collection of disconnected progression systems. Technical work should support that goal without turning ordinary player convenience into unnecessary software friction.
