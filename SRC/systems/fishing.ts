import { ACTIVITY_TICK_MS, FISHING_XP_PER_TICK } from '../core/constants';
import { appendLog, characterName } from '../core/state';
import type {
  FishingMethod,
  GameState,
  ItemKey,
  LogMessage,
  SaveProgress,
  TrackedInventoryName
} from '../core/types';
import { addInventoryItem } from './inventory';
import { grantSkillXp } from './skills';

export type FishingEvent = 'started' | 'stopped' | 'tick' | 'inventory-full';

export interface FishingHooks {
  save?: SaveProgress;
  log?: LogMessage;
  changed?: (event: FishingEvent) => void;
  popup?: (text: string) => void;
}

export interface FishingRequirement {
  item: Extract<ItemKey, 'fishing_net' | 'fishing_rod'>;
  itemName: 'Fishing Net' | 'Fishing Rod';
  catchItem: Extract<ItemKey, 'uncooked_shrimp' | 'sardine'>;
  catchName: Extract<TrackedInventoryName, 'Uncooked Shrimp' | 'Sardine'>;
}

export interface FishingAvailability {
  available: boolean;
  reason: 'wrong-room' | 'active' | 'other-activity' | 'missing-tool' | null;
  message?: string;
}

export interface FishingActionPresentation {
  disabled: boolean;
  detail: string;
}

export type StartFishingResult =
  | { started: true; method: FishingMethod }
  | { started: false; reason: FishingAvailability['reason'] };

function writeLog(state: GameState, hooks: FishingHooks, message: string): void {
  if (hooks.log) hooks.log(message);
  else appendLog(state, message);
}

export function getFishingRequirement(method: FishingMethod): FishingRequirement {
  return method === 'shrimp'
    ? {
        item: 'fishing_net',
        itemName: 'Fishing Net',
        catchItem: 'uncooked_shrimp',
        catchName: 'Uncooked Shrimp'
      }
    : {
        item: 'fishing_rod',
        itemName: 'Fishing Rod',
        catchItem: 'sardine',
        catchName: 'Sardine'
      };
}

export function getFishingAvailability(
  state: GameState,
  method: FishingMethod
): FishingAvailability {
  if (state.roomId !== 'south-dock-pier') return { available: false, reason: 'wrong-room' };
  if (state.fishing.active) return { available: false, reason: 'active' };
  if (state.salvage.active || state.cooking.active) {
    return {
      available: false,
      reason: 'other-activity',
      message: 'Finish the current activity before fishing.'
    };
  }
  const requirement = getFishingRequirement(method);
  if (state.equipment.main_hand !== requirement.item) {
    return {
      available: false,
      reason: 'missing-tool',
      message: `Equip the ${requirement.itemName} in Main Hand before fishing here.`
    };
  }
  return { available: true, reason: null };
}

export function getFishingActionPresentation(
  state: GameState,
  method: FishingMethod,
  defaultDetail: string
): FishingActionPresentation {
  if (state.fishing.active) {
    return { disabled: true, detail: `${characterName(state)} is already fishing` };
  }
  if (state.salvage.active || state.cooking.active) {
    return { disabled: true, detail: 'Finish the current activity before fishing' };
  }
  const requirement = getFishingRequirement(method);
  if (state.equipment.main_hand !== requirement.item) {
    return { disabled: true, detail: `Equip the ${requirement.itemName} in Main Hand` };
  }
  return { disabled: false, detail: defaultDetail };
}

export function startFishing(
  state: GameState,
  method: FishingMethod,
  hooks: FishingHooks = {}
): StartFishingResult {
  const availability = getFishingAvailability(state, method);
  if (!availability.available) {
    if (availability.reason === 'other-activity' || availability.reason === 'missing-tool') {
      writeLog(state, hooks, availability.message!);
    }
    return { started: false, reason: availability.reason };
  }

  state.fishing.active = true;
  state.fishing.method = method;
  writeLog(
    state,
    hooks,
    `${characterName(state)} starts ${method === 'shrimp' ? 'netting shrimp' : 'fishing for sardines'} at South Dock Pier.`
  );
  hooks.changed?.('started');
  state.fishing.intervalId = globalThis.setInterval(
    () => runFishingTick(state, hooks),
    ACTIVITY_TICK_MS
  );
  return { started: true, method };
}

export function stopFishing(state: GameState, hooks: FishingHooks = {}): boolean {
  const wasActive = state.fishing.active;
  if (state.fishing.intervalId !== null) {
    globalThis.clearInterval(state.fishing.intervalId);
    state.fishing.intervalId = null;
  }
  state.fishing.active = false;
  state.fishing.method = null;
  if (wasActive) hooks.changed?.('stopped');
  return wasActive;
}

export function runFishingTick(state: GameState, hooks: FishingHooks = {}): ItemKey | null {
  const method = state.fishing.method;
  if (!state.fishing.active || !method) return null;

  const requirement = getFishingRequirement(method);
  if (!addInventoryItem(state, requirement.catchItem, 1, { save: hooks.save })) {
    stopFishing(state, hooks);
    writeLog(state, hooks, 'Inventory full. Fishing stops.');
    hooks.changed?.('inventory-full');
    return null;
  }

  state.inventoryTotals[requirement.catchName] =
    (state.inventoryTotals[requirement.catchName] ?? 0) + 1;
  grantSkillXp(state, 'fishing', FISHING_XP_PER_TICK, { save: hooks.save });
  writeLog(
    state,
    hooks,
    `${requirement.catchName} collected. +${FISHING_XP_PER_TICK} Fishing XP.`
  );
  hooks.changed?.('tick');
  hooks.popup?.(`+1 ${requirement.catchName}`);
  return requirement.catchItem;
}
