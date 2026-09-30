import type { CharacterAppearance } from '../core/types';
import { escapeHtml } from './html';

export interface CharacterRendererOptions {
  className?: string;
  ariaLabel?: string;
}

function layerMarkup(kind: string, asset?: string): string {
  if (!asset) return '';
  return `<img class="character-render-layer character-render-layer-${kind}" src="${escapeHtml(asset)}" alt="" aria-hidden="true" />`;
}

/**
 * Composes registered character layers on one shared square canvas.
 *
 * All source layers occupy the same coordinate space. CSS scales the complete
 * canvas as a unit, preserving registration between body, hair and clothing.
 */
export function characterRendererMarkup(
  appearance: CharacterAppearance,
  options: CharacterRendererOptions = {}
): string {
  const className = options.className ? ` ${escapeHtml(options.className)}` : '';
  const ariaLabel = escapeHtml(options.ariaLabel ?? 'Character appearance preview');

  return `
    <div class="character-renderer${className}" role="img" aria-label="${ariaLabel}">
      ${layerMarkup('body', appearance.body)}
      ${layerMarkup('hair', appearance.hair)}
      ${layerMarkup('clothing', appearance.clothing)}
    </div>`;
}
