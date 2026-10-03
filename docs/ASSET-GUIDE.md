# Stray Frequency Asset Guide

## Source of truth

`public/` is the source of truth for static game assets. The current hierarchy is intentionally organized by responsibility and must not be moved, renamed, deleted, flattened, or otherwise reorganized as part of the modular architecture refactor.

```text
public/
├── animations/
│   ├── fishing/
│   │   ├── mara-net.png
│   │   └── mara-rod.png
│   └── salvaging/
│       └── mara-breaker.png
├── assets/
│   └── items/
│       ├── food/
│       │   ├── sardine.png
│       │   └── shrimp.png
│       ├── resources/
│       │   ├── scrap.png
│       │   └── synthetics.png
│       └── tools/
│           ├── breaker.png
│           ├── fishing-net.png
│           └── fishing-rod.png
└── environments/
    ├── nodes/
    │   ├── salvage-node.png
    │   ├── sardine-node.png
    │   ├── scrap-node.png
    │   └── shrimp-node.png
    └── south-dock/
        ├── breakers-yard-12.png
        └── pier.png
```

The top-level `animations/`, `assets/`, and `environments/` directories are siblings. Code must not assume that every file lives below `assets/`.

## Central asset references

`SRC/core/assets.ts` is the required application-level source of truth for asset locations. It should expose named references grouped by purpose, and it should be the only TypeScript module that constructs public asset URLs. Data, systems, and UI modules consume those named references instead of embedding path strings.

The Vite configuration deploys the application below `/Stray_Frequency/`. Public URLs must therefore be derived from `import.meta.env.BASE_URL` and a path relative to `public/`. Do not hard-code `/Stray_Frequency/`, a root-leading `/assets/...` URL, or a development-only `/` base in gameplay or UI code.

Conceptually, URL construction is:

```ts
const publicAsset = (relativePath: string) =>
  `${import.meta.env.BASE_URL}${relativePath.replace(/^\/+/, '')}`;
```

For example, the breaker tool's relative public path is `assets/items/tools/breaker.png`, while its animation path is `animations/salvaging/mara-breaker.png`. CSS must not independently repeat these URLs. A UI module can pass a named asset URL through markup, an inline background-image value, or a CSS custom property when a stylesheet needs it.

Vite copies public files but does not validate runtime string URLs. Asset preloading also currently treats load errors as non-fatal. A successful TypeScript or production build is therefore not proof that asset references resolve; asset paths require an explicit existence check.

## Audited old-to-current mappings

The following mappings were verified by identical file hashes between the old generated asset and the current public file:

| Old flat filename | Current relative public path |
| --- | --- |
| `cyberpunk_salvage_swing_sprite_sheet.png` | `animations/salvaging/mara-breaker.png` |
| `cyberpunk_salvage_crowbar_tool.png` | `assets/items/tools/breaker.png` |
| `cyberpunk_scrap_metal_pile.png` | `assets/items/resources/scrap.png` |
| `neon_cyberpunk_scrap_pile.png` | `assets/items/resources/synthetics.png` |
| `neon_cyberpunk_scrapyard_heap.png` | `environments/nodes/salvage-node.png` |
| `neon_salvage_yard_under_the_overpass.png` | `environments/south-dock/breakers-yard-12.png` |

The reorganized hierarchy also supplies the current role-specific paths below. These are canonical current paths, not permission to retain the old filenames:

| Role | Current relative public path |
| --- | --- |
| South Dock pier scene | `environments/south-dock/pier.png` |
| Shrimp fishing node | `environments/nodes/shrimp-node.png` |
| Sardine fishing node | `environments/nodes/sardine-node.png` |
| Mara net animation | `animations/fishing/mara-net.png` |
| Mara rod animation | `animations/fishing/mara-rod.png` |
| Fishing net item | `assets/items/tools/fishing-net.png` |
| Fishing rod item | `assets/items/tools/fishing-rod.png` |
| Shrimp item | `assets/items/food/shrimp.png` |
| Sardine item | `assets/items/food/sardine.png` |

## Known unresolved and invalid assets

These are audited pre-existing repository facts, not fixes included in the architecture refactor:

- The application references `mara-vale.png`, but no corresponding file exists under the current `public/` hierarchy.
- The application references `glassmarket.png`, but no corresponding file exists under the current `public/` hierarchy.
- Old copies of those two files exist only in the tracked, stale `dist/` output. Generated output is not an asset source of truth and must not be copied back or used to invent a new public path without an explicit asset decision.
- `public/environments/nodes/scrap-node.png` is two bytes containing only a CRLF sequence. It is not a valid PNG. Its filename and location are documented as they exist; repairing or replacing it is separate asset work.

Callers must not silently guess replacements for unresolved assets. Keep any unresolved reference explicit in `assets.ts`, report it during validation, and correct it only when an authoritative current asset is supplied.

## Adding assets later

When an asset is intentionally added after this refactor:

1. place it in the appropriate existing category or agree on a hierarchy change separately;
2. add one named reference in `SRC/core/assets.ts`;
3. consume that name from data or UI code rather than copying the path;
4. verify the file under both the Vite development server and the `/Stray_Frequency/` production base; and
5. check that no feature stylesheet introduced a raw deployment-specific URL.
