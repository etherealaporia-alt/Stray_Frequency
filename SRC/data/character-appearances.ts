import { ASSETS } from '../core/assets';
import type { CharacterAppearance } from '../core/types';

export const CHARACTER_APPEARANCES = {
  maraPrototype: {
    body: ASSETS.characters.bodies.femaleBase01,
    hair: { main: ASSETS.characters.hair.mara },
    clothing: {
      back: ASSETS.characters.clothing.maraOutfitBack,
      front: ASSETS.characters.clothing.maraOutfitFront
    }
  }
} as const satisfies Record<string, CharacterAppearance>;
