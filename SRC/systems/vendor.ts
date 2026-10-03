import { recalculateInventoryTotals } from '../core/state';
import type { GameState, ItemKey } from '../core/types';
import { itemName } from '../data/items';
import { addInventoryItem } from './inventory';

export interface VendorTradeHooks {
  save?: () => void | Promise<unknown>;
  log?: (message: string) => void;
  persistCredits?: (credits: number) => void | Promise<unknown>;
}

export function countInventoryItem(state: GameState, item: ItemKey): number {
  return state.inventorySlots.reduce((total, entry) => total + (entry?.item === item ? entry.quantity : 0), 0);
}

function removeInventoryItem(state: GameState, item: ItemKey, quantity: number): boolean {
  let remaining = quantity;
  for (let index = 0; index < state.inventorySlots.length && remaining > 0; index += 1) {
    const entry = state.inventorySlots[index];
    if (!entry || entry.item !== item) continue;
    const taken = Math.min(entry.quantity, remaining);
    entry.quantity -= taken;
    remaining -= taken;
    if (entry.quantity <= 0) state.inventorySlots[index] = null;
  }
  return remaining === 0;
}

export function buyPoweredSalvageBar(
  state: GameState,
  hooks: VendorTradeHooks = {}
): { success: boolean; message: string } {
  const character = state.character;
  if (!character) return { success: false, message: 'No active character is present.' };

  if (character.credits < 100) {
    return { success: false, message: 'The vendor wants 100 credits for a Powered Salvage Bar.' };
  }

  if (!addInventoryItem(state, 'salvage_bar', 1, { save: hooks.save })) {
    return { success: false, message: 'You have no room left for a Powered Salvage Bar.' };
  }

  character.credits -= 100;
  recalculateInventoryTotals(state, itemName);
  void hooks.persistCredits?.(character.credits);
  void hooks.save?.();
  return { success: true, message: 'You bought a Powered Salvage Bar for 100 credits.' };
}

export function sellMetalScrap(
  state: GameState,
  quantity = 1,
  hooks: VendorTradeHooks = {}
): { success: boolean; message: string } {
  const character = state.character;
  if (!character) return { success: false, message: 'No active character is present.' };

  const amount = Math.max(1, Math.round(quantity));
  if (countInventoryItem(state, 'metal_scrap') < amount) {
    return { success: false, message: 'You do not have enough Tier 1 Metal Scrap to sell.' };
  }

  const sold = removeInventoryItem(state, 'metal_scrap', amount);
  if (!sold) {
    return { success: false, message: 'The vendor could not complete the sale.' };
  }

  character.credits += amount * 5;
  recalculateInventoryTotals(state, itemName);
  void hooks.persistCredits?.(character.credits);
  void hooks.save?.();
  return { success: true, message: `Sold ${amount} Tier 1 Metal Scrap for ${amount * 5} credits.` };
}

export function vendorTradeSummary(state: GameState): { credits: number; scrap: number; canBuy: boolean } {
  return {
    credits: state.character?.credits ?? 0,
    scrap: countInventoryItem(state, 'metal_scrap'),
    canBuy: (state.character?.credits ?? 0) >= 100
  };
}
