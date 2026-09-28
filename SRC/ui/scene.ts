import {
  ASSETS,
  ASSET_CSS_VARIABLES
} from '../core/assets';
import { COOKING_TICKS_PER_ITEM } from '../core/constants';
import { characterName, gameState } from '../core/state';
import { getRoom } from '../data/rooms';
import { escapeHtml } from './html';
import { updateMinimap } from './minimap';

function cookingMaraMarkup(): string {
  return `<div class="mara-anchor asset-mara-anchor cooking-mara visible" id="cooking-mara-anchor"><div class="mara-nameplate">${characterName(gameState)}</div><div class="asset-mara-sprite salvaging cooking" aria-hidden="true"></div></div>`;
}

export function renderScene(): void {
  const room = getRoom(gameState.roomId);
  const target = document.querySelector<HTMLElement>('#scene-wrap');
  if (!target) return;

  target.style.setProperty(
    '--asset-mara-salvage',
    ASSET_CSS_VARIABLES['--asset-mara-salvage']
  );

  if (room.id === 'glassmarket') {
    target.innerHTML = `
      <div class="scene-stage glassmarket-stage">
        <img src="${escapeHtml(room.sceneImage ?? '')}" alt="Pixel art view of the rainy Glassmarket Transit Concourse" class="scene scene-image" />
        <div class="scene-tag scene-tag-left">UNDERPASS<br><small>BREAKER YARD 12</small></div>
        <div class="scene-tag scene-tag-right">DEPARTURES<br><small>PLATFORM 4</small></div>
      </div>`;
  } else if (room.id === 'breaker-yard') {
    const depleted = gameState.salvage.remainingTicks <= 0;
    target.innerHTML = `
      <div class="scene-stage breaker-stage asset-breaker-stage">
        <img src="${escapeHtml(room.sceneImage ?? '')}" alt="Pixel art view of Breaker Yard 12 beneath the overpass" class="scene scene-image" />
        <div class="scrap-node asset-scrap-node breaker-scrap-node gather-node ${depleted ? 'depleted' : ''}" id="scrap-node" data-node-action="start-salvaging" role="button" tabindex="0" aria-label="Tier 1 Scrap node. Double-click to salvage.">
          <div class="node-label">TIER 1 SCRAP</div>
          <img src="${ASSETS.environments.nodes.salvage}" alt="Tier 1 Scrap salvage node" />
        </div>
        <div class="mara-anchor asset-mara-anchor breaker-mara-anchor ${gameState.salvage.active ? 'visible' : ''}" id="mara-anchor">
          <div class="xp-layer" id="xp-layer"></div>
          <div class="mara-nameplate">${characterName(gameState)}</div>
          <div class="asset-mara-sprite ${gameState.salvage.active ? 'salvaging' : ''}" aria-hidden="true"></div>
        </div>
        <div class="scene-tag scene-tag-left">SALVAGE LOT<br><small>PERSONAL DEMO NODE</small></div>
        <div class="scene-tag scene-tag-right">SOUTH DOCK<br><small>BREAKER YARD 12</small></div>
      </div>`;
  } else {
    const fishingMethod = gameState.fishing.method;
    const fishingSprite = fishingMethod === 'sardine'
      ? ASSETS.animations.fishing.maraRod
      : ASSETS.animations.fishing.maraNet;
    target.innerHTML = `
      <div class="scene-stage pier-stage">
        <img src="${escapeHtml(room.sceneImage ?? '')}" alt="South Dock Pier" class="scene scene-image" />
        <div class="scrap-node gather-node fishing-node shrimp-node" data-node-action="start-fishing-shrimp" role="button" tabindex="0" aria-label="Shrimp fishing spot. Double-click to net shrimp.">
          <div class="node-label">SHRIMP SPOT</div><img src="${ASSETS.environments.nodes.shrimp}" alt="Shrimp fishing spot" /><div class="node-count">${fishingMethod === 'shrimp' ? 'NETTING' : 'READY'}</div>
        </div>
        <div class="scrap-node gather-node fishing-node sardine-node" data-node-action="start-fishing-sardine" role="button" tabindex="0" aria-label="Sardine fishing spot. Double-click to fish for sardines.">
          <div class="node-label">SARDINE SPOT</div><img src="${ASSETS.environments.nodes.sardine}" alt="Sardine fishing spot" /><div class="node-count">${fishingMethod === 'sardine' ? 'FISHING' : 'READY'}</div>
        </div>
        <div class="mara-anchor fishing-mara-anchor ${gameState.fishing.active ? 'visible' : ''}" id="mara-anchor">
          <div class="xp-layer" id="xp-layer"></div><div class="mara-nameplate">${characterName(gameState)}</div>
          ${fishingMethod ? `<div class="fishing-mara-sprite ${fishingMethod}" style="background-image:url('${escapeHtml(fishingSprite)}')" aria-hidden="true"></div>` : ''}
        </div>
        <div class="scene-tag scene-tag-left">SOUTH DOCK<br><small>WATERFRONT</small></div>
        <div class="scene-tag scene-tag-right">PIER<br><small>FISHING</small></div>
      </div>`;
  }

  if (gameState.cooking.active) {
    const stage = target.querySelector<HTMLElement>('.scene-stage');
    stage?.insertAdjacentHTML(
      'beforeend',
      `<div class="portable-induction-scene" role="group" aria-label="Portable Induction Pad cooking shrimp"><span>INDUCTION PAD</span><i></i><small>${gameState.cooking.ticksRemaining} / ${COOKING_TICKS_PER_ITEM} TICKS</small><button type="button" class="cancel-cooking-button" data-cancel-cooking aria-label="Cancel cooking">×</button></div>`
    );
    stage?.insertAdjacentHTML('beforeend', cookingMaraMarkup());
  }

  updateMinimap();
}
