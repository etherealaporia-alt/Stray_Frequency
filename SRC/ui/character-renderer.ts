import type { CharacterAppearance, CharacterLayerSet } from '../core/types';
import { escapeHtml } from './html';

export interface CharacterRendererOptions {
  className?: string;
  ariaLabel?: string;
}

function layerMarkup(kind: string, asset?: string): string {
  if (!asset) return '';
  return `<img class="character-render-layer character-render-layer-${kind}" src="${escapeHtml(asset)}" alt="" aria-hidden="true" />`;
}

function normalizeLayers(value?: string | CharacterLayerSet): CharacterLayerSet {
  if (!value) return {};
  return typeof value === 'string' ? { main: value } : value;
}

export function characterRendererMarkup(
  appearance: CharacterAppearance,
  options: CharacterRendererOptions = {}
): string {
  const className = options.className ? ` ${escapeHtml(options.className)}` : '';
  const ariaLabel = escapeHtml(options.ariaLabel ?? 'Character appearance preview');
  const hair = normalizeLayers(appearance.hair);
  const clothing = normalizeLayers(appearance.clothing);

  return `
    <div class="character-renderer${className}" role="img" aria-label="${ariaLabel}">
      ${layerMarkup('clothing-back', clothing.back)}
      ${layerMarkup('hair-back', hair.back)}
      ${layerMarkup('body', appearance.body)}
      ${layerMarkup('hair-main', hair.main)}
      ${layerMarkup('clothing-main', clothing.main)}
      ${layerMarkup('clothing-front', clothing.front)}
      ${layerMarkup('hair-front', hair.front)}
    </div>`;
}
