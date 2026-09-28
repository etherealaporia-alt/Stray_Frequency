import { EQUIPMENT_SLOTS, MAX_SKILL_LEVEL } from '../core/constants';
import {
  gameState,
  recalculateInventoryTotals,
  resetCharacterProgress
} from '../core/state';
import type {
  CharacterSkill,
  GameState,
  ItemKey,
  StoredCharacterProgress
} from '../core/types';
import { ITEM_DEFINITIONS, itemName } from '../data/items';
import { isSkillKey, xpForNextSkillLevel } from '../data/skills';
import {
  fetchCharacterProgress,
  updateCharacterHealth,
  updateCharacterProgress
} from './supabase';

let progressSaveQueue: Promise<void> = Promise.resolve();

function legacyCharacterProgressStorageKey(state: GameState): string | null {
  return state.character ? `stray-frequency:character:${state.character.id}:progress` : null;
}

function serializeCharacterProgress(state: GameState): StoredCharacterProgress {
  return {
    version: 1,
    inventory: state.inventorySlots.map((entry) => entry ? { ...entry } : null),
    equipment: { ...state.equipment },
    skills: state.skills.map((skill) => ({ ...skill })),
    cooking: {
      active: state.cooking.active,
      ticksRemaining: state.cooking.ticksRemaining,
      inventoryIndex: state.cooking.inventoryIndex
    }
  };
}

export function saveCharacterProgress(state: GameState = gameState): Promise<boolean> {
  const characterId = state.character?.id;
  if (!characterId) return Promise.resolve(false);

  const progress = serializeCharacterProgress(state);
  const save = progressSaveQueue.then(async () => {
    const { data, error } = await updateCharacterProgress(characterId, progress);

    if (error || !data) {
      console.error('Could not save character progress to Supabase.', error ?? 'Character row not found.');
      return false;
    }

    if (state.character?.id === characterId) state.character.progress = progress;
    return true;
  });

  progressSaveQueue = save.then(() => undefined, () => undefined);
  return save;
}

function firstEmptyInventorySlot(state: GameState): number {
  return state.inventorySlots.findIndex((entry, index) =>
    entry === null && !(state.cooking.active && index === state.cooking.inventoryIndex)
  );
}

function applyCharacterProgress(value: unknown, state: GameState): boolean {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<StoredCharacterProgress>;
  if (progress.version !== 1) return false;

  resetCharacterProgress(state);

  if (Array.isArray(progress.inventory)) {
    state.inventorySlots.fill(null);
    progress.inventory.slice(0, state.inventorySlots.length).forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const candidate = entry as { item?: unknown; quantity?: unknown };
      if (
        typeof candidate.item !== 'string'
        || !Object.prototype.hasOwnProperty.call(ITEM_DEFINITIONS, candidate.item)
      ) return;
      if (!Number.isSafeInteger(candidate.quantity) || Number(candidate.quantity) < 1) return;
      state.inventorySlots[index] = {
        item: candidate.item as ItemKey,
        quantity: Number(candidate.quantity)
      };
    });
  }

  if (progress.equipment && typeof progress.equipment === 'object') {
    for (const [slot] of EQUIPMENT_SLOTS) {
      const item = progress.equipment[slot];
      state.equipment[slot] = typeof item === 'string'
        && Object.prototype.hasOwnProperty.call(ITEM_DEFINITIONS, item)
        && ITEM_DEFINITIONS[item as ItemKey].equipmentSlot === slot
        ? item as ItemKey
        : null;
    }
  }

  const cookingIndex = progress.cooking?.inventoryIndex;
  if (
    progress.cooking?.active === true
    && Number.isInteger(progress.cooking.ticksRemaining)
    && progress.cooking.ticksRemaining >= 1
    && progress.cooking.ticksRemaining <= 3
    && typeof cookingIndex === 'number'
    && Number.isInteger(cookingIndex)
    && cookingIndex >= 0
    && cookingIndex < state.inventorySlots.length
    && state.inventorySlots[cookingIndex] === null
  ) {
    state.cooking.active = true;
    state.cooking.ticksRemaining = progress.cooking.ticksRemaining;
    state.cooking.inventoryIndex = cookingIndex;
  }

  if (Array.isArray(progress.skills)) {
    const seen = new Set<string>();
    const skills = progress.skills.flatMap((entry): CharacterSkill[] => {
      if (!entry || typeof entry !== 'object') return [];
      const candidate = entry as { skill_key?: unknown; level?: unknown; xp?: unknown };
      if (!isSkillKey(candidate.skill_key)) return [];
      if (
        seen.has(candidate.skill_key)
        || typeof candidate.level !== 'number'
        || !Number.isSafeInteger(candidate.level)
        || candidate.level < 1
        || candidate.level > MAX_SKILL_LEVEL
      ) return [];
      if (
        typeof candidate.xp !== 'number'
        || !Number.isSafeInteger(candidate.xp)
        || candidate.xp < 0
        || (candidate.level === MAX_SKILL_LEVEL && candidate.xp > 0)
        || (candidate.level < MAX_SKILL_LEVEL && candidate.xp >= xpForNextSkillLevel(candidate.level))
      ) return [];

      seen.add(candidate.skill_key);
      return [{
        skill_key: candidate.skill_key,
        level: candidate.level,
        xp: candidate.xp
      }];
    });
    state.skills.splice(0, state.skills.length, ...skills);
  }

  recalculateInventoryTotals(state, itemName);

  if (
    !state.inventorySlots.some((entry) => entry?.item === 'fishing_net')
    && state.equipment.main_hand !== 'fishing_net'
  ) {
    const netIndex = firstEmptyInventorySlot(state);
    if (netIndex >= 0) {
      state.inventorySlots[netIndex] = { item: 'fishing_net', quantity: 1 };
      void saveCharacterProgress(state);
    }
  }

  if (
    !state.cooking.active
    && !state.inventorySlots.some((entry) => entry?.item === 'portable_induction_pad')
  ) {
    const emptyIndex = firstEmptyInventorySlot(state);
    if (emptyIndex >= 0) {
      state.inventorySlots[emptyIndex] = { item: 'portable_induction_pad', quantity: 1 };
      void saveCharacterProgress(state);
    } else {
      const cookedIndex = state.inventorySlots.findIndex((entry) => entry?.item === 'cooked_shrimp');
      if (cookedIndex >= 0) {
        const cooked = state.inventorySlots[cookedIndex]!;
        const otherCookedIndex = state.inventorySlots.findIndex((entry, index) =>
          index !== cookedIndex && entry?.item === 'cooked_shrimp'
        );
        if (otherCookedIndex >= 0) {
          state.inventorySlots[otherCookedIndex]!.quantity += cooked.quantity;
        } else {
          state.inventoryTotals['Cooked Shrimp'] = Math.max(
            0,
            state.inventoryTotals['Cooked Shrimp'] - cooked.quantity
          );
        }
        state.inventorySlots[cookedIndex] = otherCookedIndex >= 0
          ? null
          : { item: 'portable_induction_pad', quantity: 1 };
        void saveCharacterProgress(state);
        state.logs.push('[21:48]  Recovered the Portable Induction Pad from its previous cooking save.');
      }
    }
  }

  return true;
}

export async function loadCharacterProgress(state: GameState = gameState): Promise<void> {
  const characterId = state.character?.id;
  const legacyKey = legacyCharacterProgressStorageKey(state);
  if (!characterId || !legacyKey) return;

  resetCharacterProgress(state);

  const { data, error } = await fetchCharacterProgress(characterId);
  if (error) console.warn('Could not load character progress from Supabase.', error);

  let restored = !error && applyCharacterProgress(data?.progress, state);
  let importedLegacy = false;
  if (!restored) {
    try {
      const raw = localStorage.getItem(legacyKey);
      if (raw) {
        importedLegacy = applyCharacterProgress(JSON.parse(raw), state);
        restored = importedLegacy;
      }
    } catch (legacyError) {
      console.warn('Could not import legacy local progress.', legacyError);
    }
  }

  if (!restored) resetCharacterProgress(state);
  if (!error && data?.progress && restored) {
    state.character!.progress = data.progress as StoredCharacterProgress;
    try {
      localStorage.removeItem(legacyKey);
    } catch {
      // Legacy cleanup is best effort.
    }
    return;
  }

  const saved = await saveCharacterProgress(state);
  if (saved && importedLegacy) {
    try {
      localStorage.removeItem(legacyKey);
    } catch {
      // Legacy cleanup is best effort.
    }
  }
}

/** Persist health after the caller has applied the local gameplay update. */
export async function persistCharacterHealth(
  health: number,
  state: GameState = gameState
): Promise<boolean> {
  const characterId = state.character?.id;
  if (!characterId) return false;

  const { error } = await updateCharacterHealth(characterId, health);
  return !error;
}
