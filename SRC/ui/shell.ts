import { ASSET_CSS_VARIABLES } from '../core/assets';
import { gameState } from '../core/state';
import type { Panel } from '../core/types';
import { getRoom } from '../data/rooms';
import { characterCardMarkup } from './character-card';
import { minimapMarkup } from './minimap';

const PANEL_ICONS: Record<Panel, string> = {
  world: '◎',
  inventory: '▣',
  equipment: '♙',
  skills: '▥',
  journal: '▤',
  comms: '◌',
  map: '◆'
};

const PRIMARY_PANELS: Panel[] = ['world', 'inventory', 'equipment', 'skills', 'journal'];
const SECONDARY_PANELS: Panel[] = ['comms', 'map'];

function menuMarkup(panels: Panel[]): string {
  return panels.map((panel) => `
    <button type="button" data-panel="${panel}" class="${panel === 'world' ? 'active' : ''}">
      <span class="menu-icon">${PANEL_ICONS[panel]}</span><small>${panel.toUpperCase()}</small>
    </button>`).join('');
}

/**
 * STRAY FREQUENCY — LOCKED GAME SHELL
 *
 * Feature modules may populate the declared regions. They must not rearrange
 * this hierarchy or change its geometry unless the shell is explicitly unlocked.
 */
export function renderShell(app: HTMLDivElement): void {
  for (const [property, value] of Object.entries(ASSET_CSS_VARIABLES)) {
    app.style.setProperty(property, value);
  }

  app.innerHTML = `
    <div class="game-shell">
      <header class="masthead">
        ${characterCardMarkup()}

        <div class="brand" aria-label="Stray Frequency">
          <div><span>STRAY</span> <b>FREQUENCY</b></div>
          <small>some places never log off</small>
        </div>
      </header>

      <main class="play-grid">
        <section class="world-column">
          <article class="location-card panel">
            <div class="location-heading">
              <div>
                <div class="breadcrumbs" id="breadcrumbs"></div>
                <h1 id="location-title"></h1>
              </div>
              <p id="location-slogan"></p>
            </div>
            <div class="scene-wrap" id="scene-wrap"></div>
          </article>

          <section class="chat panel" aria-label="Game log">
            <div class="chat-tabs" role="tablist">
              <button class="active" type="button">ALL</button>
              <button type="button">GAME</button>
              <button type="button">SYSTEM</button>
            </div>
            <div class="log" id="log" aria-live="polite"></div>
            <form id="chat-form" class="chat-input">
              <span>›</span>
              <input id="chat-message" maxlength="120" autocomplete="off" placeholder="Type a command or message…" aria-label="Chat message" />
              <button type="submit">SEND</button>
            </form>
          </section>
        </section>

        <aside class="sidebar">
          ${minimapMarkup()}
          <nav class="rune-menu rune-menu-top panel" aria-label="Primary game menu">
            ${menuMarkup(PRIMARY_PANELS)}
          </nav>
          <section class="active-panel panel" id="active-panel" aria-live="polite"></section>
          <nav class="rune-menu rune-menu-bottom panel" aria-label="Secondary game menu">
            ${menuMarkup(SECONDARY_PANELS)}
          </nav>
        </aside>
      </main>
    </div>
    <dialog class="skill-details-dialog" id="skill-details-dialog" aria-labelledby="skill-details-title"></dialog>
  `;
}

export function updateShell(): void {
  const room = getRoom(gameState.roomId);
  const district = document.querySelector<HTMLElement>('#district-name');
  const breadcrumbs = document.querySelector<HTMLElement>('#breadcrumbs');
  const title = document.querySelector<HTMLElement>('#location-title');
  const slogan = document.querySelector<HTMLElement>('#location-slogan');

  if (district) district.textContent = room.district.toUpperCase();
  if (breadcrumbs) breadcrumbs.innerHTML = `${room.district} <span>›</span> ${room.name}`;
  if (title) title.textContent = room.name;
  if (slogan) slogan.textContent = room.slogan;
}
