import { gameState } from '../core/state';

export function minimapMarkup(): string {
  return `
    <section class="minimap panel" aria-label="Minimap">
      <div class="panel-title"><span>MINIMAP</span><span>N ↑</span></div>
      <svg viewBox="0 0 320 180" role="img" aria-label="Schematic minimap of South Dock">
        <rect width="320" height="180" fill="#0b0e12" />
        <g stroke="#262b31" stroke-width="12" fill="none">
          <path d="M22 28H140V62H300"/><path d="M46 160V82H108V112H246V154"/><path d="M176 14V92H286"/><path d="M18 126H74"/>
        </g>
        <g fill="#161a20" stroke="#343a42" stroke-width="2">
          <rect x="18" y="15" width="74" height="38"/><rect x="110" y="76" width="52" height="31"/><rect x="206" y="18" width="72" height="44"/><rect x="196" y="118" width="76" height="40"/><rect x="21" y="93" width="44" height="28"/>
        </g>
        <g class="map-shops"><rect x="53" y="31" width="12" height="12" rx="2"/><rect x="224" y="39" width="12" height="12" rx="2"/></g>
        <g class="map-transit"><rect x="42" y="142" width="11" height="11"/></g>
        <g class="map-npcs"><circle cx="232" cy="135" r="6"/></g>
        <path class="player-marker" id="player-marker" d="M154 75 166 98 142 98Z" />
      </svg>
      <div class="map-legend"><span><i class="you"></i>You</span><span><i class="npc"></i>Salvage</span><span><i class="shop"></i>Market</span><span><i class="transit"></i>Transit</span></div>
    </section>`;
}

export function updateMinimap(): void {
  const marker = document.querySelector<SVGPathElement>('#player-marker');
  if (!marker) return;

  marker.setAttribute(
    'd',
    gameState.roomId === 'glassmarket'
      ? 'M154 75 166 98 142 98Z'
      : gameState.roomId === 'breaker-yard'
        ? 'M224 122 236 145 212 145Z'
        : 'M272 57 284 80 260 80Z'
  );
}
