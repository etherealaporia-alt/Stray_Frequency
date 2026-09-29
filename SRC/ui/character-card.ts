import { ASSETS } from '../core/assets';
import { characterName, gameState } from '../core/state';
import { derivedDefense } from '../systems/equipment';
import { escapeHtml } from './html';

export function characterCardMarkup(): string {
  return `
      <section class="character-card panel" aria-label="Character summary">
        <img src="${ASSETS.characters.maraPortrait}" alt="Pixel portrait of Mara Vale" class="portrait" />
        <div class="character-copy">
          <div class="eyebrow">PLAYER</div>
          <h2>${escapeHtml(characterName(gameState))}</h2>
          <p class="muted">Unregistered Contractor</p>
        </div>
        <div class="quick-stats" aria-label="Quick stats">
          <div><span class="stat-icon hp">♥</span><strong id="character-health">${gameState.character?.health ?? 10}/${gameState.character?.max_health ?? 10}</strong><small>HP</small></div>
          <div><span class="stat-icon focus">◆</span><strong id="derived-defense">${derivedDefense(gameState)}</strong><small>Defense</small></div>
          <div><span class="stat-icon credits">¢</span><strong>${gameState.character?.credits ?? 0}</strong><small>Credits</small></div>
        </div>
        <button id="logout-button" class="sf-logout character-logout" type="button">LOG OUT</button>
      </section>`;
}

export function refreshCharacterStats(): void {
  const defense = document.querySelector<HTMLElement>('#derived-defense');
  if (defense) defense.textContent = String(derivedDefense(gameState));
}

export function refreshCharacterHealth(): void {
  const health = document.querySelector<HTMLElement>('#character-health');
  if (health) {
    health.textContent = `${gameState.character?.health ?? 10}/${gameState.character?.max_health ?? 10}`;
  }
}
