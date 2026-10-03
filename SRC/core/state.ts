import {
  COOKING_TICKS_PER_ITEM,
  EQUIPMENT_SLOTS,
  INITIAL_LOGS,
  INVENTORY_SLOT_COUNT,
  LOG_LIMIT,
  LOG_TIMESTAMP,
  SALVAGE_MAX_TICKS,
  SALVAGE_REQUIREMENT,
  SALVAGE_XP_PER_TICK,
  STARTER_INVENTORY
} from './constants';
import type {
  EquipmentSlot,
  GameState,
  InventoryEntry,
  InventoryTotals,
  ItemKey,
  TrackedInventoryName
} from './types';

export function createInventorySlots(): InventoryEntry[] {
  const slots: InventoryEntry[] = Array.from({ length: INVENTORY_SLOT_COUNT }, () => null);
  for (const [index, entry] of STARTER_INVENTORY) slots[index] = { ...entry };
  return slots;
}

export function createEquipment(): Record<EquipmentSlot, ItemKey | null> {
  return {
    main_hand: null,
    off_hand: null,
    head: null,
    torso: null,
    legs: null,
    boots: null
  };
}

export function createInventoryTotals(): InventoryTotals {
  return {
    'Tier 1 Metal Scrap': 0,
    'Tier 1 Composite Scrap': 0,
    'Uncooked Shrimp': 0,
    Sardine: 0,
    'Cooked Shrimp': 0,
    'Copper Coils': 0
  };
}

export function createGameState(): GameState {
  return {
    character: null,
    skills: [],
    panel: 'world',
    roomId: 'glassmarket',
    logs: [...INITIAL_LOGS],
    inventorySlots: createInventorySlots(),
    equipment: createEquipment(),
    inventoryTotals: createInventoryTotals(),
    mobileInventoryPage: 0,
    salvage: {
      active: false,
      intervalId: null,
      xpPerTick: SALVAGE_XP_PER_TICK,
      requirement: SALVAGE_REQUIREMENT,
      remainingTicks: SALVAGE_MAX_TICKS,
      maxTicks: SALVAGE_MAX_TICKS,
      resetTimeoutId: null
    },
    fishing: {
      active: false,
      method: null,
      intervalId: null
    },
    cooking: {
      active: false,
      intervalId: null,
      ticksRemaining: COOKING_TICKS_PER_ITEM,
      inventoryIndex: null
    }
  };
}

export const gameState = createGameState();

export function characterName(state: GameState = gameState): string {
  return state.character?.name ?? 'Contractor';
}

export function appendLog(state: GameState, message: string, timestamp = LOG_TIMESTAMP): void {
  state.logs.push(`[${timestamp}]  ${message}`);
  if (state.logs.length > LOG_LIMIT) state.logs.shift();
}

/**
 * Rebuild the compatibility totals from inventory cells only. Equipment is
 * intentionally excluded to match the previous display semantics.
 */
export function recalculateInventoryTotals(
  state: GameState,
  itemName: (key: ItemKey) => string
): InventoryTotals {
  const totals = createInventoryTotals();
  for (const entry of state.inventorySlots) {
    if (!entry) continue;
    const name = itemName(entry.item);
    if (Object.prototype.hasOwnProperty.call(totals, name)) {
      totals[name as TrackedInventoryName] += entry.quantity;
    }
  }
  state.inventoryTotals = totals;
  return totals;
}

/** Reset only the progress-backed state, preserving the monolith's session UI state. */
export function resetCharacterProgress(state: GameState = gameState): void {
  if (state.cooking.intervalId !== null) globalThis.clearInterval(state.cooking.intervalId);

  state.inventorySlots.splice(0, state.inventorySlots.length, ...createInventorySlots());
  for (const [slot] of EQUIPMENT_SLOTS) state.equipment[slot] = null;
  state.skills.splice(0, state.skills.length);
  state.cooking.active = false;
  state.cooking.intervalId = null;
  state.cooking.ticksRemaining = COOKING_TICKS_PER_ITEM;
  state.cooking.inventoryIndex = null;
  state.inventoryTotals = createInventoryTotals();
}
