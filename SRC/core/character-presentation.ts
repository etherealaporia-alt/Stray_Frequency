import { preloadImage } from './assets';
import type { CharacterAppearance, CharacterLayerSet, GameState } from './types';
import { CHARACTER_APPEARANCES } from '../data/character-appearances';
import { ITEM_DEFINITIONS } from '../data/items';

function layerUrls(layer: string | CharacterLayerSet | undefined): string[] {
  if (!layer) return [];
  if (typeof layer === 'string') return [layer];
  return [layer.back, layer.main, layer.front].filter((url): url is string => Boolean(url));
}

function appearanceUrls(appearance: CharacterAppearance): string[] {
  return [
    appearance.body,
    ...layerUrls(appearance.hair),
    ...layerUrls(appearance.clothing)
  ];
}

export async function prepareCharacterPresentation(state: GameState): Promise<void> {
  const itemKeys = new Set(
    [
      ...state.inventorySlots.map((entry) => entry?.item),
      ...Object.values(state.equipment)
    ].filter((key): key is NonNullable<typeof key> => Boolean(key))
  );

  const urls = new Set<string>(appearanceUrls(CHARACTER_APPEARANCES.maraPrototype));
  for (const key of itemKeys) urls.add(ITEM_DEFINITIONS[key].asset);

  await Promise.all([...urls].map(preloadImage));
}
