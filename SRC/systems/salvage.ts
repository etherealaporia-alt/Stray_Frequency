import {
  ACTIVITY_TICK_MS,
  SALVAGE_COMPOSITE_CUTOFF,
  SALVAGE_METAL_CUTOFF,
  SALVAGE_RESET_MS,
  SALVAGE_REQUIREMENT
} from '../core/constants';
import { appendLog, characterName } from '../core/state';
import type {
  GameState,
  ItemKey,
  LogMessage,
  SaveProgress,
  TrackedInventoryName
} from '../core/types';
import { ITEM_DEFINITIONS } from '../data/items';
import { equippedToolAllows } from './equipment';
import { addInventoryItem } from './inventory';
import { grantSkillXp } from './skills';

export type SalvageEvent =
  | 'started' | 'stopped' | 'tick' | 'inventory-full' | 'depleted' | 'replenished' | 'reset';

export interface SalvageHooks {
  save?: SaveProgress;
  log?: LogMessage;
  changed?: (event: SalvageEvent) => void;
  popup?: (text: string) => void;
  random?: () => number;
}

export interface SalvageAvailability {
  available: boolean;
  reason: 'wrong-room' | 'active' | 'depleted' | 'other-activity' | 'missing-tool' | null;
  message?: string;
}

export interface SalvageActionPresentation { disabled: boolean; detail: string; }
export type StartSalvageResult =
  | { started: true }
  | { started: false; reason: SalvageAvailability['reason'] };
export interface SalvageTickResult {
  collected?: ItemKey;
  finalTick?: boolean;
  stopped?: 'inactive' | 'already-depleted' | 'inventory-full';
}

function writeLog(state: GameState, hooks: SalvageHooks, message: string): void {
  if (hooks.log) hooks.log(message);
  else appendLog(state, message);
}

export function getSalvageAvailability(state: GameState): SalvageAvailability {
  if (state.roomId !== 'breaker-yard') return { available:false, reason:'wrong-room' };
  if (state.salvage.active) return { available:false, reason:'active' };
  if (state.salvage.remainingTicks <= 0) return { available:false, reason:'depleted' };
  if (state.fishing.active || state.cooking.active) return { available:false, reason:'other-activity', message:'Finish the current activity before salvaging.' };
  if (!equippedToolAllows(state,'salvage',SALVAGE_REQUIREMENT)) return { available:false, reason:'missing-tool', message:'A Tier 1 salvage tool must be equipped in Main Hand to work this node.' };
  return { available:true, reason:null };
}

export function getSalvageActionPresentation(state: GameState, defaultDetail: string): SalvageActionPresentation {
  if (state.salvage.active) return { disabled:true, detail:`${characterName(state)} is already salvaging this node` };
  if (state.salvage.remainingTicks <= 0) return { disabled:true, detail:'This node has been picked clean' };
  if (state.fishing.active || state.cooking.active) return { disabled:true, detail:'Finish the current activity before salvaging' };
  return { disabled:false, detail:defaultDetail };
}

export function startSalvaging(state: GameState, hooks: SalvageHooks = {}): StartSalvageResult {
  const availability=getSalvageAvailability(state);
  if (!availability.available) {
    if (availability.reason === 'other-activity' || availability.reason === 'missing-tool') writeLog(state,hooks,availability.message!);
    return { started:false, reason:availability.reason };
  }
  state.salvage.active=true;
  writeLog(state,hooks,`${characterName(state)} steps into the bay and starts salvaging the node.`);
  hooks.changed?.('started');
  state.salvage.intervalId=globalThis.setInterval(()=>runSalvageTick(state,hooks),ACTIVITY_TICK_MS);
  return { started:true };
}

export function stopSalvaging(state: GameState, withLog: boolean, hooks: SalvageHooks = {}): boolean {
  if (state.salvage.intervalId !== null) {
    globalThis.clearInterval(state.salvage.intervalId);
    state.salvage.intervalId=null;
  }
  const wasActive=state.salvage.active;
  state.salvage.active=false;
  if (withLog && wasActive) writeLog(state,hooks,'The current scrap pile has been picked clean.');
  if (wasActive) hooks.changed?.('stopped');
  return wasActive;
}

export function resetSalvageNode(state: GameState, hooks: SalvageHooks = {}): void {
  stopSalvaging(state,false,hooks);
  if (state.salvage.resetTimeoutId !== null) {
    globalThis.clearTimeout(state.salvage.resetTimeoutId);
    state.salvage.resetTimeoutId=null;
  }
  state.salvage.remainingTicks=state.salvage.maxTicks;
  writeLog(state,hooks,'A fresh Tier 1 Scrap pile is set aside for the demo.');
  hooks.changed?.('reset');
}

export function runSalvageTick(state: GameState, hooks: SalvageHooks = {}): SalvageTickResult {
  if (!state.salvage.active) return { stopped:'inactive' };
  if (state.salvage.remainingTicks <= 0) {
    stopSalvaging(state,true,hooks);
    return { stopped:'already-depleted' };
  }

  state.salvage.remainingTicks-=1;
  const roll=(hooks.random ?? Math.random)();
  const item: ItemKey = roll < SALVAGE_METAL_CUTOFF
    ? 'metal_scrap'
    : roll < SALVAGE_COMPOSITE_CUTOFF ? 'composite_scrap' : 'copper_coils';

  if (!addInventoryItem(state,item,1,{ save:hooks.save })) {
    stopSalvaging(state,false,hooks);
    writeLog(state,hooks,'Inventory full. Salvaging stops.');
    hooks.changed?.('inventory-full');
    return { stopped:'inventory-full' };
  }

  const resource=ITEM_DEFINITIONS[item].name as TrackedInventoryName;
  state.inventoryTotals[resource]+=1;
  grantSkillXp(state,'salvaging',state.salvage.xpPerTick,{ save:hooks.save });

  const finalTick=state.salvage.remainingTicks <= 0;

  writeLog(state,hooks,`+${state.salvage.xpPerTick} Salvaging XP · ${resource} collected.`);
  hooks.changed?.('tick');

  if (finalTick) {
    stopSalvaging(state,false,hooks);
    state.salvage.resetTimeoutId=globalThis.setTimeout(()=>{
      state.salvage.resetTimeoutId=null;
      state.salvage.remainingTicks=state.salvage.maxTicks;
      writeLog(state,hooks,'The scrap node has replenished.');
      hooks.changed?.('replenished');
    },SALVAGE_RESET_MS);
    writeLog(state,hooks,`The scrap node is depleted. It will replenish in ${SALVAGE_RESET_MS / 1_000} seconds.`);
    hooks.changed?.('depleted');
  }

  hooks.popup?.(`+${state.salvage.xpPerTick} XP`);
  return { collected:item, finalTick };
}
