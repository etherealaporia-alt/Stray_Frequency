import { MAX_SKILL_LEVEL } from '../core/constants';
import type { SkillKey } from '../core/types';

export interface SkillDefinition {
  key: SkillKey;
  name: string;
  icon: string;
  description: string;
}

export const SKILL_DEFINITIONS: ReadonlyArray<SkillDefinition> = [
  {
    key: 'firearms',
    name: 'Firearms',
    icon: '⌖',
    description: 'Placeholder: ranged weapon handling, accuracy, and firearm proficiency.'
  },
  {
    key: 'close_combat',
    name: 'Close Combat',
    icon: '⚔',
    description: 'Placeholder: melee technique and close-quarters combat proficiency.'
  },
  {
    key: 'survivability',
    name: 'Survivability',
    icon: '♥',
    description: 'Placeholder: endurance, defensive tactics, and recovery.'
  },
  {
    key: 'salvaging',
    name: 'Salvaging',
    icon: '⛭',
    description: 'Placeholder: scrap recovery, tool use, and salvage yield.'
  },
  {
    key: 'metalworking',
    name: 'Metalworking',
    icon: '⚒',
    description: 'Placeholder: processing and shaping recovered metals.'
  },
  {
    key: 'fabrication',
    name: 'Fabrication',
    icon: '▦',
    description: 'Placeholder: constructing useful gear and components.'
  },
  {
    key: 'fishing',
    name: 'Fishing',
    icon: '◒',
    description: 'Placeholder: locating, catching, and preparing fish.'
  },
  {
    key: 'cooking',
    name: 'Cooking',
    icon: '♨',
    description: 'Placeholder: preparing meals and useful consumables.'
  }
] as const;

export const STARTING_SKILLS = SKILL_DEFINITIONS.map(({ key, name }) => [key, name] as const);

export const SKILL_ICONS: Record<SkillKey, string> = Object.fromEntries(
  SKILL_DEFINITIONS.map(({ key, icon }) => [key, icon])
) as Record<SkillKey, string>;

export const SKILL_DESCRIPTIONS: Record<SkillKey, string> = Object.fromEntries(
  SKILL_DEFINITIONS.map(({ key, description }) => [key, description])
) as Record<SkillKey, string>;

export const SKILL_UNLOCK_LEVELS = Array.from({ length: MAX_SKILL_LEVEL }, (_, index) => index + 1);

export function xpForNextSkillLevel(level: number): number {
  return level >= MAX_SKILL_LEVEL
    ? 0
    : Math.max(83, Math.floor(83 * Math.pow(1.12, level - 1)));
}

export function isSkillKey(value: unknown): value is SkillKey {
  return typeof value === 'string' && SKILL_DEFINITIONS.some(({ key }) => key === value);
}
