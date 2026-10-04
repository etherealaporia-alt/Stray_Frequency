import { ASSETS } from '../core/assets';
import type { ItemDefinition, ItemKey } from '../core/types';

export const ITEM_DEFINITIONS: Record<ItemKey, ItemDefinition> = {
  salvage_bar: {
    key: 'salvage_bar',
    name: 'Powered Salvage Bar',
    description: 'A powered utility breaker for prying, splitting and stripping Tier 1 scrap.',
    asset: ASSETS.items.tools.breaker,
    stackable: false,
    equipmentSlot: 'main_hand',
    toolType: 'salvage',
    toolTier: 1
  },
  metal_scrap: {
    key: 'metal_scrap',
    name: 'Tier 1 Metal Scrap',
    description: 'Bolts, plates and structural metal recovered from salvage.',
    panelDescription: 'Bolts, plates and structural metal recovered from salvage.',
    asset: ASSETS.items.resources.scrap,
    stackable: true
  },
  composite_scrap: {
    key: 'composite_scrap',
    name: 'Tier 1 Composite Scrap',
    description: 'Mixed housings, casings and recoverable composite material.',
    panelDescription: 'Mixed housings, tubing, casings and recoverable composite parts.',
    asset: ASSETS.items.resources.synthetics,
    stackable: true
  },
  uncooked_shrimp: {
    key: 'uncooked_shrimp',
    name: 'Uncooked Shrimp',
    description: 'A small South Dock catch taken with a fishing net.',
    asset: ASSETS.items.food.shrimp,
    stackable: true
  },
  sardine: {
    key: 'sardine',
    name: 'Sardine',
    description: 'A small oily fish caught from South Dock Pier with a fishing rod.',
    asset: ASSETS.items.food.sardine,
    stackable: true
  },
  copper_coils: {
    key: 'copper_coils',
    name: 'Copper Coils',
    description: 'Copper wiring coils recovered from a scrap node.',
    asset: ASSETS.items.resources.copperCoils,
    stackable: true
  },
  cooked_shrimp: {
    key: 'cooked_shrimp',
    name: 'Cooked Shrimp',
    description: 'A cooked meal that restores 3 HP when used.',
    asset: ASSETS.items.food.cookedShrimp,
    stackable: true,
    usable: true
  },
  portable_induction_pad: {
    key: 'portable_induction_pad',
    name: 'Portable Induction Pad',
    description: 'Double-click to deploy. Cooks each Uncooked Shrimp over 3 ticks.',
    asset: ASSETS.items.tools.inductionHeatingPad,
    stackable: false,
    usable: true
  },
  fishing_net: {
    key: 'fishing_net',
    name: 'Fishing Net',
    description: 'Equip in Main Hand to net shrimp at South Dock Pier.',
    asset: ASSETS.items.tools.fishingNet,
    stackable: false,
    equipmentSlot: 'main_hand'
  },
  fishing_rod: {
    key: 'fishing_rod',
    name: 'Fishing Rod',
    description: 'Equip in Main Hand to catch sardines at South Dock Pier.',
    asset: ASSETS.items.tools.fishingRod,
    stackable: false,
    equipmentSlot: 'main_hand'
  },
  t1_light_armor: {
    key: 't1_light_armor',
    name: 'T1 Light Armour',
    description: 'A lightweight torso shell that keeps the body protected without slowing movement.',
    asset: ASSETS.items.resources.synthetics,
    stackable: false,
    equipmentSlot: 'torso',
    defense: 7
  }
};

export function itemName(item: ItemKey): string {
  return ITEM_DEFINITIONS[item].name;
}
