import { prepareCharacterPresentation } from '../core/character-presentation';
import { EQUIPMENT_SLOTS, MAX_SKILL_LEVEL } from '../core/constants';
import { prepareCurrentScene } from '../core/scene-loader';
import { gameState, recalculateInventoryTotals, resetCharacterProgress } from '../core/state';
import type { CharacterSkill, GameState, ItemKey, StoredCharacterProgress } from '../core/types';
import { ITEM_DEFINITIONS, itemName } from '../data/items';
import { isSkillKey, xpForNextSkillLevel } from '../data/skills';
import { fetchGameSnapshot } from './supabase';

function applyProgress(value: unknown, state: GameState): boolean {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<StoredCharacterProgress>;
  if (progress.version !== 1) return false;
  resetCharacterProgress(state);

  if (Array.isArray(progress.inventory)) {
    state.inventorySlots.fill(null);
    progress.inventory.slice(0, state.inventorySlots.length).forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const candidate = entry as { item?: unknown; quantity?: unknown };
      if (typeof candidate.item !== 'string'
        || !Object.prototype.hasOwnProperty.call(ITEM_DEFINITIONS, candidate.item)
        || !Number.isSafeInteger(candidate.quantity)
        || Number(candidate.quantity) < 1) return;
      state.inventorySlots[index] = { item: candidate.item as ItemKey, quantity: Number(candidate.quantity) };
    });
  }

  if (progress.equipment && typeof progress.equipment === 'object') {
    for (const [slot] of EQUIPMENT_SLOTS) {
      const item = progress.equipment[slot];
      state.equipment[slot] = typeof item === 'string'
        && Object.prototype.hasOwnProperty.call(ITEM_DEFINITIONS, item)
        && ITEM_DEFINITIONS[item as ItemKey].equipmentSlot === slot
        ? item as ItemKey : null;
    }
  }

  if (Array.isArray(progress.skills)) {
    const seen = new Set<string>();
    const skills = progress.skills.flatMap((entry): CharacterSkill[] => {
      if (!entry || typeof entry !== 'object') return [];
      const candidate = entry as { skill_key?: unknown; level?: unknown; xp?: unknown };
      if (!isSkillKey(candidate.skill_key) || seen.has(candidate.skill_key)) return [];
      if (!Number.isSafeInteger(candidate.level) || Number(candidate.level) < 1 || Number(candidate.level) > MAX_SKILL_LEVEL) return [];
      if (!Number.isSafeInteger(candidate.xp) || Number(candidate.xp) < 0) return [];
      const level = Number(candidate.level), xp = Number(candidate.xp);
      if ((level === MAX_SKILL_LEVEL && xp > 0) || (level < MAX_SKILL_LEVEL && xp >= xpForNextSkillLevel(level))) return [];
      seen.add(candidate.skill_key);
      return [{ skill_key: candidate.skill_key, level, xp }];
    });
    state.skills.splice(0, state.skills.length, ...skills);
  }

  recalculateInventoryTotals(state, itemName);
  return true;
}

export function applyGameSnapshot(value: unknown, state: GameState = gameState): boolean {
  if (!value || typeof value !== 'object' || !state.character) return false;
  const snapshot = value as Record<string, unknown>;
  if (typeof snapshot.location_id === 'string') {
    state.character.location_id = snapshot.location_id;
    if (snapshot.location_id === 'glassmarket' || snapshot.location_id === 'breaker-yard' || snapshot.location_id === 'south-dock-pier') {
      state.roomId = snapshot.location_id;
    }
  }
  if (typeof snapshot.credits === 'number') state.character.credits = snapshot.credits;
  if (typeof snapshot.health === 'number') state.character.health = snapshot.health;
  if (typeof snapshot.max_health === 'number') state.character.max_health = snapshot.max_health;
  const progress = snapshot.progress;
  if (applyProgress(progress, state)) {
    state.character.progress = progress as StoredCharacterProgress;
    return true;
  }
  return false;
}

export async function loadCharacterProgress(state: GameState = gameState): Promise<void> {
  if (!state.character) return;
  const { data, error } = await fetchGameSnapshot();
  if (error) {
    console.error('Could not load authoritative game state.', error);
    return;
  }
  applyGameSnapshot(data, state);
  await Promise.all([
    prepareCurrentScene(state.roomId),
    prepareCharacterPresentation(state)
  ]);
}

/**
 * Legacy compatibility hook. Persistent gameplay is server-authoritative now;
 * callers must use performGameAction rather than writing progress directly.
 */
export function saveCharacterProgress(): Promise<boolean> {
  return Promise.resolve(true);
}

/** Health is mutated only by authoritative game actions. */
export function persistCharacterHealth(): Promise<boolean> {
  return Promise.resolve(false);
}
