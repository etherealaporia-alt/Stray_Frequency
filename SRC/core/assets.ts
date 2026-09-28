const baseUrl = import.meta.env.BASE_URL;

/** Resolve a path from Vite's configured deployment base (currently /Stray_Frequency/). */
export function assetUrl(publicRelativePath: string): string {
  return `${baseUrl}${publicRelativePath.replace(/^\/+/, '')}`;
}

export const ASSETS = {
  animations: {
    fishing: {
      maraNet: assetUrl('animations/fishing/mara-net.png'),
      maraRod: assetUrl('animations/fishing/mara-rod.png')
    },
    salvaging: {
      maraBreaker: assetUrl('animations/salvaging/mara-breaker.png')
    }
  },
  items: {
    food: {
      sardine: assetUrl('assets/items/food/sardine.png'),
      shrimp: assetUrl('assets/items/food/shrimp.png')
    },
    resources: {
      scrap: assetUrl('assets/items/resources/scrap.png'),
      synthetics: assetUrl('assets/items/resources/synthetics.png')
    },
    tools: {
      breaker: assetUrl('assets/items/tools/breaker.png'),
      fishingNet: assetUrl('assets/items/tools/fishing-net.png'),
      fishingRod: assetUrl('assets/items/tools/fishing-rod.png')
    }
  },
  environments: {
    nodes: {
      salvage: assetUrl('environments/nodes/salvage-node.png'),
      sardine: assetUrl('environments/nodes/sardine-node.png'),
      shrimp: assetUrl('environments/nodes/shrimp-node.png')
    },
    southDock: {
      breakerYard12: assetUrl('environments/south-dock/breakers-yard-12.png'),
      pier: assetUrl('environments/south-dock/pier.png')
    }
  }
} as const;

export const LEGACY_UNRESOLVED_ASSETS = {
  maraValePortrait: assetUrl('assets/mara-vale.png'),
  glassmarketScene: assetUrl('assets/glassmarket.png')
} as const;

export const LEGACY_VISUAL_EQUIVALENTS = {
  poweredSalvageBar: ASSETS.items.tools.breaker,
  portableInductionPad: ASSETS.items.tools.breaker,
  metalScrap: ASSETS.items.resources.scrap,
  compositeScrap: ASSETS.items.resources.synthetics,
  copperCoils: ASSETS.items.resources.synthetics,
  cookedShrimp: ASSETS.items.resources.synthetics
} as const;

export const CORE_ASSET_URLS = [
  LEGACY_UNRESOLVED_ASSETS.maraValePortrait,
  LEGACY_UNRESOLVED_ASSETS.glassmarketScene,
  ASSETS.environments.southDock.breakerYard12,
  ASSETS.environments.southDock.pier,
  ASSETS.environments.nodes.salvage,
  ASSETS.environments.nodes.shrimp,
  ASSETS.environments.nodes.sardine,
  ASSETS.animations.salvaging.maraBreaker,
  ASSETS.animations.fishing.maraNet,
  ASSETS.animations.fishing.maraRod,
  ASSETS.items.tools.breaker,
  ASSETS.items.tools.fishingNet,
  ASSETS.items.tools.fishingRod,
  ASSETS.items.resources.scrap,
  ASSETS.items.resources.synthetics,
  ASSETS.items.food.shrimp,
  ASSETS.items.food.sardine
] as const;

export const ASSET_CSS_VARIABLES = {
  '--asset-mara-salvage': `url("${ASSETS.animations.salvaging.maraBreaker}")`
} as const;
