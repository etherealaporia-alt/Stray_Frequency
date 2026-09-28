import {
  ACTIVITY_TICK_MS,
  COOKED_SHRIMP_HEAL,
  COOKING_XP_PER_ITEM,
  COOKING_TICKS_PER_ITEM
} from '../core/constants';
import { appendLog } from '../core/state';
import type { GameState, LogMessage, SaveProgress } from '../core/types';
import { addInventoryItem, consumeInventoryItem } from './inventory';
import { grantSkillXp } from './skills';

export type CookingEvent =
  | 'started'
  | 'tick'
  | 'cooked'
  | 'paused'
  | 'returned'
  | 'cancelled'
  | 'inventory-full'
  | 'health-changed';

export interface CookingHooks {
  save?: SaveProgress;
  log?: LogMessage;
  changed?: (event: CookingEvent) => void;
  persistHealth?: (health: number) => Promise<boolean>;
}

export interface StartCookingResult {
  started: boolean;
  reason?: 'active' | 'other-activity' | 'no-raw-food' | 'wrong-item';
}

function writeLog(state: GameState, hooks: CookingHooks, message: string): void {
  if (hooks.log) hooks.log(message);
  else appendLog(state, message);
}

export function startCooking(
  state: GameState,
  inventoryIndex: number,
  hooks: CookingHooks = {}
): StartCookingResult {
  if (state.cooking.active) return { started: false, reason: 'active' };
  if (state.salvage.active || state.fishing.active) {
    writeLog(state, hooks, 'Finish the current activity before cooking.');
    return { started: false, reason: 'other-activity' };
  }
  if (!state.inventorySlots.some((entry) => entry?.item === 'uncooked_shrimp')) {
    writeLog(state, hooks, 'No Uncooked Shrimp to cook.');
    return { started: false, reason: 'no-raw-food' };
  }

  const pad = state.inventorySlots[inventoryIndex];
  if (pad?.item !== 'portable_induction_pad') {
    return { started: false, reason: 'wrong-item' };
  }

  state.inventorySlots[inventoryIndex] = null;
  state.cooking.active = true;
  state.cooking.intervalId = null;
  state.cooking.ticksRemaining = COOKING_TICKS_PER_ITEM;
  state.cooking.inventoryIndex = inventoryIndex;
  void hooks.save?.();
  writeLog(
    state,
    hooks,
    `Portable Induction Pad deployed. Cooking takes ${COOKING_TICKS_PER_ITEM} ticks per shrimp.`
  );
  hooks.changed?.('started');
  startCookingTimer(state, hooks);
  return { started: true };
}

export function startCookingTimer(state: GameState, hooks: CookingHooks = {}): boolean {
  if (!state.cooking.active || state.cooking.intervalId !== null) return false;
  state.cooking.intervalId = globalThis.setInterval(
    () => runCookingTick(state, hooks),
    ACTIVITY_TICK_MS
  );
  return true;
}

export function pauseCooking(state: GameState, hooks: CookingHooks = {}): void {
  if (state.cooking.intervalId !== null) globalThis.clearInterval(state.cooking.intervalId);
  state.cooking.intervalId = null;
  void hooks.save?.();
  hooks.changed?.('paused');
}

export function returnCookingPad(
  state: GameState,
  hooks: CookingHooks = {},
  message = 'No Uncooked Shrimp remains. The Portable Induction Pad returned to your inventory.'
): boolean {
  if (state.cooking.intervalId !== null) globalThis.clearInterval(state.cooking.intervalId);
  const returnIndex = state.cooking.inventoryIndex;
  state.cooking.active = false;
  state.cooking.intervalId = null;
  state.cooking.ticksRemaining = COOKING_TICKS_PER_ITEM;
  state.cooking.inventoryIndex = null;

  if (returnIndex !== null && state.inventorySlots[returnIndex] === null) {
    state.inventorySlots[returnIndex] = { item: 'portable_induction_pad', quantity: 1 };
    void hooks.save?.();
  } else if (!addInventoryItem(state, 'portable_induction_pad', 1, { save: hooks.save })) {
    writeLog(state, hooks, 'Inventory is full. Make room to return the Portable Induction Pad.');
    state.cooking.active = true;
    state.cooking.intervalId = null;
    state.cooking.ticksRemaining = 1;
    state.cooking.inventoryIndex = returnIndex;
    hooks.changed?.('inventory-full');
    return false;
  }

  writeLog(state, hooks, message);
  hooks.changed?.('returned');
  return true;
}

export function cancelCooking(state: GameState, hooks: CookingHooks = {}): boolean {
  if (!state.cooking.active) return false;
  const returned = returnCookingPad(
    state,
    hooks,
    'Cooking canceled. The Portable Induction Pad returned to your inventory.'
  );
  if (returned) hooks.changed?.('cancelled');
  return returned;
}

export function runCookingTick(state: GameState, hooks: CookingHooks = {}): boolean {
  if (!state.cooking.active) return false;
  if (state.cooking.ticksRemaining > 1) {
    state.cooking.ticksRemaining -= 1;
    void hooks.save?.();
    hooks.changed?.('tick');
    return true;
  }

  const rawIndex = state.inventorySlots.findIndex((entry) => entry?.item === 'uncooked_shrimp');
  if (rawIndex < 0) {
    returnCookingPad(state, hooks);
    return false;
  }

  const raw = state.inventorySlots[rawIndex];
  if (!raw) return false;
  const cookedIndex = state.inventorySlots.findIndex((entry, index) =>
    index !== state.cooking.inventoryIndex && entry?.item === 'cooked_shrimp'
  );

  if (cookedIndex >= 0) {
    state.inventorySlots[cookedIndex]!.quantity += 1;
    consumeInventoryItem(state, rawIndex, { save: hooks.save });
  } else if (raw.quantity > 1) {
    const cookedSlot = state.inventorySlots.findIndex((entry, index) =>
      entry === null && index !== state.cooking.inventoryIndex
    );
    if (cookedSlot < 0) {
      returnCookingPad(
        state,
        hooks,
        'Not enough inventory space to cook another shrimp. Cooking canceled and the pad returned.'
      );
      return false;
    }
    raw.quantity -= 1;
    state.inventorySlots[cookedSlot] = { item: 'cooked_shrimp', quantity: 1 };
    void hooks.save?.();
  } else {
    state.inventorySlots[rawIndex] = { item: 'cooked_shrimp', quantity: 1 };
    void hooks.save?.();
  }

  state.inventoryTotals['Uncooked Shrimp'] = Math.max(
    0,
    state.inventoryTotals['Uncooked Shrimp'] - 1
  );
  state.inventoryTotals['Cooked Shrimp'] += 1;
  grantSkillXp(state, 'cooking', COOKING_XP_PER_ITEM, { save: hooks.save });
  writeLog(
    state,
    hooks,
    `Portable Induction Pad cooked 1 Uncooked Shrimp. +${COOKING_XP_PER_ITEM} Cooking XP.`
  );

  if (!state.inventorySlots.some((entry) => entry?.item === 'uncooked_shrimp')) {
    returnCookingPad(state, hooks);
    return true;
  }

  state.cooking.ticksRemaining = COOKING_TICKS_PER_ITEM;
  void hooks.save?.();
  hooks.changed?.('cooked');
  return true;
}

export async function useCookedShrimp(
  state: GameState,
  inventoryIndex: number,
  hooks: CookingHooks = {}
): Promise<boolean> {
  const entry = state.inventorySlots[inventoryIndex];
  if (entry?.item !== 'cooked_shrimp') return false;

  const health = state.character?.health ?? 10;
  const maxHealth = state.character?.max_health ?? 10;
  if (health >= maxHealth) {
    writeLog(state, hooks, 'HP is already full. Cooked Shrimp was not used.');
    return false;
  }

  consumeInventoryItem(state, inventoryIndex, { save: hooks.save });
  state.inventoryTotals['Cooked Shrimp'] -= 1;
  const newHealth = Math.min(maxHealth, health + COOKED_SHRIMP_HEAL);
  if (state.character) state.character.health = newHealth;
  writeLog(state, hooks, `Cooked Shrimp restored ${newHealth - health} HP.`);
  hooks.changed?.('health-changed');

  if (hooks.persistHealth && !(await hooks.persistHealth(newHealth))) {
    writeLog(state, hooks, 'HP updated locally but could not be saved.');
  }
  return true;
}
