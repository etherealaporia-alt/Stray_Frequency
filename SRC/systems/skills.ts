import { MAX_SKILL_LEVEL } from '../core/constants';
import type { CharacterSkill, GameState, SaveProgress, SkillKey } from '../core/types';
import { xpForNextSkillLevel } from '../data/skills';

export { xpForNextSkillLevel } from '../data/skills';

export interface SkillMutationHooks {
  save?: SaveProgress;
}

export interface SkillXpResult {
  skill: CharacterSkill;
  previousLevel: number;
  previousXp: number;
  levelsGained: number;
}

export function getSkill(state: GameState, skillKey: SkillKey): CharacterSkill | undefined {
  return state.skills.find((entry) => entry.skill_key === skillKey);
}

export function skillLevel(state: GameState, skillKey: SkillKey): number {
  return getSkill(state, skillKey)?.level ?? 1;
}

export function grantSkillXp(
  state: GameState,
  skillKey: SkillKey,
  amount: number,
  hooks: SkillMutationHooks = {}
): SkillXpResult {
  let skill = getSkill(state, skillKey);
  if (!skill) {
    skill = { skill_key: skillKey, level: 1, xp: 0 };
    state.skills.push(skill);
  }

  const previousLevel = skill.level;
  const previousXp = skill.xp;
  let remaining = amount;

  while (skill.level < MAX_SKILL_LEVEL) {
    const needed = xpForNextSkillLevel(skill.level) - skill.xp;
    if (remaining < needed) {
      skill.xp += remaining;
      void hooks.save?.();
      return {
        skill,
        previousLevel,
        previousXp,
        levelsGained: skill.level - previousLevel
      };
    }
    remaining -= needed;
    skill.level += 1;
    skill.xp = 0;
  }

  skill.xp = 0;
  void hooks.save?.();
  return {
    skill,
    previousLevel,
    previousXp,
    levelsGained: skill.level - previousLevel
  };
}
