import { ASSETS } from '../core/assets';
import type { CharacterAppearance } from '../core/types';

/**
 * First modular appearance preset.
 *
 * These assets are deliberately catalogued by what they are, not by who owns
 * them. Mara is only the preset that currently composes them together.
 */
export const CHARACTER_APPEARANCES = {
  maraPrototype: {
    body: ASSETS.characters.bodies.femaleBase01,
    hair: ASSETS.characters.hair.mara,
    clothing: ASSETS.characters.clothing.maraOutfit
  }
} as const satisfies Record<string, CharacterAppearance>;
