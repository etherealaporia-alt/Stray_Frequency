import type { GameState, ItemKey, SaveProgress } from '../core/types';
import { ITEM_DEFINITIONS } from '../data/items';

export interface InventoryMutationHooks {
  save?: SaveProgress;
}

function requestSave(hooks: InventoryMutationHooks): void {
  void hooks.save?.();
}

export function firstEmptyInventorySlot(state: GameState): number {
  return state.inventorySlots.findIndex((entry, index) =>
    entry === null && !(state.cooking.active && index === state.cooking.inventoryIndex)
  );
}

export function findInventoryItem(state: GameState, item: ItemKey): number {
  return state.inventorySlots.findIndex((entry) => entry?.item === item);
}

export function addInventoryItem(
  state: GameState,
  item: ItemKey,
  quantity = 1,
  hooks: InventoryMutationHooks = {}
): boolean {
  const definition = ITEM_DEFINITIONS[item];
  if (definition.stackable) {
    const existing = state.inventorySlots.find((entry) => entry?.item === item);
    if (existing) {
      existing.quantity += quantity;
      requestSave(hooks);
      return true;
    }
  }

  const emptyIndex = firstEmptyInventorySlot(state);
  if (emptyIndex < 0) return false;
  state.inventorySlots[emptyIndex] = { item, quantity };
  requestSave(hooks);
  return true;
}

export function consumeInventoryItem(
  state: GameState,
  index: number,
  hooks: InventoryMutationHooks = {}
): boolean {
  const entry = state.inventorySlots[index];
  if (!entry) return false;
  entry.quantity -= 1;
  if (entry.quantity <= 0) state.inventorySlots[index] = null;
  requestSave(hooks);
  return true;
}

export function transformInventoryItem(
  state: GameState,
  index: number,
  result: ItemKey,
  hooks: InventoryMutationHooks = {}
): boolean {
  const entry = state.inventorySlots[index];
  if (!entry) return false;

  const existing = state.inventorySlots.find((slot, slotIndex) =>
    slotIndex !== index && slot?.item === result
  );
  if (existing) {
    existing.quantity += 1;
    return consumeInventoryItem(state, index, hooks);
  }

  if (entry.quantity === 1) {
    state.inventorySlots[index] = { item: result, quantity: 1 };
    requestSave(hooks);
    return true;
  }

  const emptyIndex = firstEmptyInventorySlot(state);
  if (emptyIndex < 0) return false;
  entry.quantity -= 1;
  state.inventorySlots[emptyIndex] = { item: result, quantity: 1 };
  requestSave(hooks);
  return true;
}

export function moveInventoryItem(
  state: GameState,
  from: number,
  to: number,
  hooks: InventoryMutationHooks = {}
): boolean {
  if (
    from === to
    || from < 0
    || to < 0
    || from >= state.inventorySlots.length
    || to >= state.inventorySlots.length
    || (state.cooking.active && to === state.cooking.inventoryIndex)
  ) return false;

  const moving = state.inventorySlots[from];
  if (!moving) return false;
  const displaced = state.inventorySlots[to];
  state.inventorySlots[to] = moving;
  state.inventorySlots[from] = displaced;
  requestSave(hooks);
  return true;
}

/** Ownership includes inventory plus equipped gear; equipment controls usability. */
export function countOwnedItem(state: GameState, item: ItemKey): number {
  const inventoryCount = state.inventorySlots.reduce(
    (total, entry) => total + (entry?.item === item ? entry.quantity : 0),
    0
  );
  const equippedCount = Object.values(state.equipment).filter((equipped) => equipped === item).length;
  return inventoryCount + equippedCount;
}

export function ownsItem(state: GameState, item: ItemKey): boolean {
  return countOwnedItem(state, item) > 0;
}
