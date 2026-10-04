# Stray Frequency Asset Guide

## Source of truth

`public/` is the source of truth for static game assets. `SRC/core/assets.ts` is the application-level source of truth for URLs used by TypeScript.

The application is now deployed at the root of `strayfrequency.co.uk`, and Vite is configured with `base: '/'`. Asset code must still use `import.meta.env.BASE_URL` rather than hard-coding the production domain or assuming a deployment prefix. This keeps local development and future deployment changes sane.

## Current public hierarchy

```text
public/
├── animations/
│   ├── fishing/
│   │   ├── mara-net.png
│   │   └── mara-rod.png
│   └── salvaging/
│       └── mara-breaker.png
├── assets/items/
│   ├── food/
│   │   ├── cooked-shrimp.png
│   │   ├── sardine.png
│   │   └── shrimp.png
│   ├── resources/
│   │   ├── copper-coils.png
│   │   ├── scrap.png
│   │   └── synthetics.png
│   └── tools/
│       ├── breaker.png
│       ├── fishing-net.png
│       ├── fishing-rod.png
│       └── induction-heating-pad.png
├── characters/
│   ├── bodies/character-base-type-01.png
│   ├── clothing/
│   │   ├── mara-outfit.png
│   │   ├── mara-outfit-back.png
│   │   └── mara-outfit-front.png
│   └── hair/mara-hair.png
├── environments/
│   ├── nodes/
│   │   ├── salvage-node.png
│   │   ├── sardine-node.png
│   │   ├── scrap-node.png
│   │   └── shrimp-node.png
│   └── south-dock/
│       ├── breakers-yard-12.png
│       ├── glass-market.png
│       ├── mara-character-portrait.png
│       └── pier.png
├── icons/
│   └── PWA/application icons
└── manifest.webmanifest
```

The hierarchy is organized by responsibility. Do not flatten, rename, or reorganize it casually.

## Central asset references

`SRC/core/assets.ts` constructs public URLs through:

```ts
const baseUrl = import.meta.env.BASE_URL;

export function assetUrl(publicRelativePath: string): string {
  return `${baseUrl}${publicRelativePath.replace(/^\/+/, '')}`;
}
```

Data and UI code should consume named references from `ASSETS` instead of embedding paths repeatedly.

CSS that needs an application asset should preferably receive it through a named reference/CSS custom property rather than independently duplicating a path.

## Character composition

Character appearance is composed from registered layers sharing a canonical canvas. Current prototype layers include the female base body, Mara hair, and Mara clothing front/back layers.

Preserve registration and layer alignment when replacing or adding character artwork. A visually similar image with different canvas registration is not a drop-in replacement.

## Current environment and gameplay assets

The current application references canonical assets for:

- Glassmarket;
- Breaker Yard 12;
- South Dock Pier;
- salvage and fishing interaction nodes;
- salvaging and fishing animations;
- fishing and salvage tools;
- scrap/synthetic resources;
- shrimp and sardine food items; and
- Mara's current portrait and prototype character layers.

The historical missing `glassmarket.png` / `mara-vale.png` references documented by the old guide are no longer current application references. `assets.ts` now points to `glass-market.png` and `mara-character-portrait.png`.

## Validation caveat

Vite copies `public/` files but does not prove that runtime string URLs resolve. The image preloader also treats load failures as non-fatal. A successful TypeScript/build pass therefore does not guarantee that every referenced image exists or is a valid image.

`public/environments/nodes/scrap-node.png` remains a known suspicious legacy file and should be validated/replaced before it becomes an authoritative gameplay asset.

## Adding assets

When adding an asset:

1. place it in the appropriate existing category, or agree on a hierarchy change separately;
2. add or update its named reference in `SRC/core/assets.ts`;
3. consume that named reference from data/UI code;
4. preserve canonical registration for layered character assets;
5. verify the asset under the local Vite server and production build; and
6. avoid introducing production-domain or old `/Stray_Frequency/` path assumptions.
