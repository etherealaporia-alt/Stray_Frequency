import type {
  EquipmentSlot,
  GameState,
  ItemKey,
  SaveProgress
} from '../core/types';
import { ITEM_DEFINITIONS } from '../data/items';
import { firstEmptyInventorySlot } from './inventory';

export interface EquipmentMutationHooks {
  save?: SaveProgress;
  stopFishing?: () => void;
}

export interface EquipmentMutationResult {
  changed: boolean;
  shouldStopFishing: boolean;
  message?: string;
  slot?: EquipmentSlot;
  equipped?: ItemKey;
  returned?: ItemKey;
}

export function derivedDefense(state: GameState): number {
  return Object.values(state.equipment).reduce(
    (defense, item) => defense + (item ? (ITEM_DEFINITIONS[item].defense ?? 0) : 0),
    0
  );
}

export function equippedToolAllows(state: GameState, type: 'salvage', tier: number): boolean {
  return Object.values(state.equipment).some((item) => {
    if (!item) return false;
    const definition = ITEM_DEFINITIONS[item];
    return definition.toolType === type && (definition.toolTier ?? 0) >= tier;
  });
}

export function equipFromInventory(
  state: GameState,
  index: number,
  hooks: EquipmentMutationHooks = {}
): EquipmentMutationResult {
  const entry = state.inventorySlots[index];
  if (!entry) return { changed: false, shouldStopFishing: false };
  const definition = ITEM_DEFINITIONS[entry.item];
  if (!definition.equipmentSlot) return { changed: false, shouldStopFishing: false };

  const slot = definition.equipmentSlot;
  const oldItem = state.equipment[slot];
  const shouldStopFishing = slot === 'main_hand'
    && state.fishing.active
    && oldItem !== entry.item;
  if (shouldStopFishing) hooks.stopFishing?.();

  state.equipment[slot] = entry.item;
  state.inventorySlots[index] = oldItem ? { item: oldItem, quantity: 1 } : null;
  void hooks.save?.();

  return {
    changed: true,
    shouldStopFishing,
    slot,
    equipped: entry.item,
    returned: oldItem ?? undefined,
    message: oldItem
      ? `${definition.name} equipped; ${ITEM_DEFINITIONS[oldItem].name} returned to inventory.`
      : `${definition.name} equipped.`
  };
}

export function unequipToInventory(
  state: GameState,
  slot: EquipmentSlot,
  hooks: EquipmentMutationHooks = {}
): EquipmentMutationResult {
  const item = state.equipment[slot];
  if (!item) return { changed: false, shouldStopFishing: false };

  const emptyIndex = firstEmptyInventorySlot(state);
  if (emptyIndex < 0) {
    return {
      changed: false,
      shouldStopFishing: false,
      slot,
      equipped: item,
      message: `Inventory full. ${ITEM_DEFINITIONS[item].name} remains equipped.`
    };
  }

  const shouldStopFishing = slot === 'main_hand' && state.fishing.active;
  if (shouldStopFishing) hooks.stopFishing?.();
  state.inventorySlots[emptyIndex] = { item, quantity: 1 };
  state.equipment[slot] = null;
  void hooks.save?.();

  return {
    changed: true,
    shouldStopFishing,
    slot,
    returned: item,
    message: `${ITEM_DEFINITIONS[item].name} unequipped.`
  };
}
