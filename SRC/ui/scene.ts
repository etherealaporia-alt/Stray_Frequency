import { ASSETS, ASSET_CSS_VARIABLES } from '../core/assets';
import { COOKING_TICKS_PER_ITEM } from '../core/constants';
import { characterName, gameState } from '../core/state';
import { SOUTH_DOCK_FISHING_AREA } from '../data/fishing-areas';
import { NODE_PRESENTATIONS } from '../data/node-presentations';
import { getRoom } from '../data/rooms';
import { activityAnchorStyle, assignActivityAnchor, releaseActivityAnchor } from './activity-anchors';
import { escapeHtml } from './html';
import { updateMinimap } from './minimap';

function cookingMaraMarkup(): string {
  return `<div class="mara-anchor asset-mara-anchor cooking-mara visible" id="cooking-mara-anchor"><div class="mara-nameplate">${characterName(gameState)}</div><div class="asset-mara-sprite salvaging cooking" aria-hidden="true"></div></div>`;
}

export function renderScene(): void {
  const room = getRoom(gameState.roomId);
  const target = document.querySelector<HTMLElement>('#scene-wrap');
  if (!target) return;

  target.style.setProperty('--asset-mara-salvage', ASSET_CSS_VARIABLES['--asset-mara-salvage']);

  if (room.id === 'glassmarket') {
    target.innerHTML = `
      <div class="scene-stage glassmarket-stage">
        <img src="${escapeHtml(room.sceneImage ?? '')}" alt="Pixel art view of the rainy Glassmarket Transit Concourse" class="scene scene-image" />
        <div class="scene-tag scene-tag-left">UNDERPASS<br><small>BREAKER YARD 12</small></div>
        <div class="scene-tag scene-tag-right">DEPARTURES<br><small>PLATFORM 4</small></div>
      </div>`;
  } else if (room.id === 'breaker-yard') {
    const depleted = gameState.salvage.remainingTicks <= 0;
    const presentation = NODE_PRESENTATIONS.breakerYardTier1Scrap;
    const actorId = gameState.character?.id ?? 'local-player';
    const anchor = gameState.salvage.active ? assignActivityAnchor(presentation, actorId) : null;
    if (!gameState.salvage.active) releaseActivityAnchor(presentation.id, actorId);

    target.innerHTML = `
      <div class="scene-stage breaker-stage asset-breaker-stage">
        <img src="${escapeHtml(room.sceneImage ?? '')}" alt="Pixel art view of Breaker Yard 12 beneath the overpass" class="scene scene-image" />
        <div class="scrap-node asset-scrap-node breaker-scrap-node gather-node ${depleted ? 'depleted' : ''}" id="scrap-node" data-node-action="start-salvaging" role="button" tabindex="0" aria-label="Tier 1 Scrap node. Double-click to salvage.">
          <div class="node-label">TIER 1 SCRAP</div>
          <img src="${ASSETS.environments.nodes.salvage}" alt="Tier 1 Scrap salvage node" />
        </div>
        ${anchor ? `<div class="activity-anchor breaker-activity-anchor" data-activity-anchor="${anchor.id}" style="${activityAnchorStyle(anchor)}">
          <div class="mara-anchor asset-mara-anchor breaker-mara-anchor visible" id="mara-anchor">
            <div class="mara-nameplate">${characterName(gameState)}</div>
            <div class="asset-mara-sprite salvaging" aria-hidden="true"></div>
          </div>
        </div>` : ''}
        <div class="xp-layer breaker-xp-layer" id="xp-layer"></div>
        <div class="scene-tag scene-tag-left">SALVAGE LOT<br><small>PERSONAL DEMO NODE</small></div>
        <div class="scene-tag scene-tag-right">SOUTH DOCK<br><small>BREAKER YARD 12</small></div>
      </div>`;
  } else {
    const method = gameState.fishing.method;
    const actorId = gameState.character?.id ?? 'local-player';
    const presentation = SOUTH_DOCK_FISHING_AREA.presentation;
    const anchor = gameState.fishing.active ? assignActivityAnchor(presentation, actorId) : null;
    if (!gameState.fishing.active) releaseActivityAnchor(presentation.id, actorId);
    const fishingSprite = method === 'rod' ? ASSETS.animations.fishing.maraRod : ASSETS.animations.fishing.maraNet;

    target.innerHTML = `
      <div class="scene-stage pier-stage">
        <img src="${escapeHtml(room.sceneImage ?? '')}" alt="South Dock Pier" class="scene scene-image" />
        <div class="fishing-water-area gather-node" data-node-action="start-fishing-equipped" role="button" tabindex="0" aria-label="South Dock saltwater fishing area. Double-click to fish using the equipped net or rod."></div>
        ${anchor && method ? `<div class="activity-anchor fishing-activity-anchor" data-activity-anchor="${anchor.id}" style="${activityAnchorStyle(anchor)}">
          <div class="mara-anchor fishing-mara-anchor visible" id="mara-anchor">
            <div class="mara-nameplate">${characterName(gameState)}</div>
            <div class="fishing-mara-sprite ${method}" style="background-image:url('${escapeHtml(fishingSprite)}')" aria-hidden="true"></div>
          </div>
        </div>` : ''}
        <div class="xp-layer fishing-xp-layer" id="xp-layer"></div>
        <div class="scene-tag scene-tag-left">SOUTH DOCK<br><small>SALTWATER</small></div>
        <div class="scene-tag scene-tag-right">PIER<br><small>FISHING</small></div>
      </div>`;
  }

  if (gameState.cooking.active) {
    const stage = target.querySelector<HTMLElement>('.scene-stage');
    stage?.insertAdjacentHTML('beforeend', `<div class="portable-induction-scene" role="group" aria-label="Portable Induction Pad cooking shrimp"><span>INDUCTION PAD</span><i></i><small>${gameState.cooking.ticksRemaining} / ${COOKING_TICKS_PER_ITEM} TICKS</small><button type="button" class="cancel-cooking-button" data-cancel-cooking aria-label="Cancel cooking">×</button></div>`);
    stage?.insertAdjacentHTML('beforeend', cookingMaraMarkup());
  }

  updateMinimap();
}
