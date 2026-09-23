# Stray Frequency — UI Prototype

First coded UI pass for the browser RPG **Stray Frequency**.

## Current layout

- Persistent character profile at top-left.
- Large current-location scene and location title.
- Persistent game/chat log below the scene.
- Minimap in the right sidebar.
- RuneScape-like right-side menu for World, Inventory, Skills, Journal, Comms and Map.
- Active right-side panel swaps without moving the rest of the interface.
- Contextual world actions append entries to the game log.
- Responsive layout for narrower screens.

The Glassmarket and Mara Vale art are cropped from the concept UI generated during design exploration and are placeholders for proper game assets.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL Vite prints.

## Build

```bash
npm run build
```

## Next likely steps

1. Define the world/location data model.
2. Decide what the minimap represents and how navigation works.
3. Replace hard-coded panel data with state loaded from game data.
4. Establish reusable pixel-art UI assets and typography.
5. Add the first real location-to-location movement loop.
