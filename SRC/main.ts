import './style.css';

const assetBase = import.meta.env.BASE_URL;

type Panel = 'world' | 'inventory' | 'skills' | 'journal' | 'comms' | 'map';
type RoomId = 'glassmarket' | 'breaker-yard';
type ActionType =
  | 'goto-breaker-yard'
  | 'goto-glassmarket'
  | 'start-salvaging'
  | 'reset-node'
  | 'inspect-board';

type RoomAction = {
  label: string;
  detail: string;
  type: ActionType;
};

type Room = {
  id: RoomId;
  district: string;
  name: string;
  slogan: string;
  description: string;
  sceneImage: string;
  actions: RoomAction[];
};

const panelIcons: Record<Panel, string> = {
  world: '◎',
  inventory: '▣',
  skills: '▥',
  journal: '▤',
  comms: '◌',
  map: '◆'
};

const rooms: Record<RoomId, Room> = {
  glassmarket: {
    id: 'glassmarket',
    district: 'South Dock',
    name: 'Glassmarket Transit Concourse',
    slogan: 'TRADE. TRAVEL. TRY TO STAY ALIVE.',
    description:
      'Rainwater drips from the glass canopy as crowds flow through. Street vendors, travellers and fixers jostle beneath a sky of neon. A signed underpass leads toward the local breaker yard.',
    sceneImage: 'glassmarket.png',
    actions: [
      {
        label: 'Head to Breaker Yard 12',
        detail: 'Take the service underpass behind the market',
        type: 'goto-breaker-yard'
      },
      {
        label: 'Inspect the departures board',
        detail: 'A harmless local interaction',
        type: 'inspect-board'
      }
    ]
  },
  'breaker-yard': {
    id: 'breaker-yard',
    district: 'South Dock',
    name: 'Breaker Yard 12',
    slogan: 'SALVAGE. SORT. SELL.',
    description:
      'A rain-slick salvage lot under the overpass, filled with dead machinery, stacked containers and fenced work zones. It is practical, noisy, and exactly the sort of place where useful scrap turns into a living.',
    sceneImage: 'neon_salvage_yard_under_the_overpass.png',
    actions: [
      {
        label: 'Salvage Tier 1 Scrap',
        detail: 'Work the current node for basic materials',
        type: 'start-salvaging'
      },
      {
        label: 'Return to Glassmarket',
        detail: 'Head back through the underpass',
        type: 'goto-glassmarket'
      }
    ]
  }
};

const state = {
  panel: 'world' as Panel,
  roomId: 'glassmarket' as RoomId,
  logs: [
    '[21:47]  You arrive at Glassmarket Transit Concourse.',
    '[21:47]  A route marker points toward Breaker Yard 12.',
    '[21:46]  New location discovered: Glassmarket Transit Concourse.'
  ],
  inventory: {
    'Tier 1 Metal Scrap': 0,
    'Tier 1 Composite Scrap': 0
  } as Record<string, number>,
  salvage: {
    active: false,
    intervalId: null as number | null,
    xpPerTick: 8,
    requirement: 1,
    remainingTicks: 4,
    maxTicks: 4
  }
};

function asset(path: string) {
  return `${assetBase}assets/${path}`;
}

function injectRuntimeStyles() {
  if (document.getElementById('sf-runtime-styles')) return;

  const style = document.createElement('style');
  style.id = 'sf-runtime-styles';
  style.textContent = `
    .sf-scene-stage {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      isolation: isolate;
    }

    .sf-scene-stage > .scene {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      image-rendering: pixelated;
      display: block;
    }

    .sf-scene-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .sf-scene-chip {
      position: absolute;
      display: inline-flex;
      flex-direction: column;
      gap: 2px;
      padding: 6px 8px;
      background: rgba(8, 10, 12, 0.84);
      border: 1px solid rgba(209, 96, 134, 0.45);
      border-radius: 8px;
      color: #f1b625;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      line-height: 1.15;
      z-index: 3;
    }

    .sf-scene-chip small {
      color: #b9b9b5;
      font-size: 9px;
      letter-spacing: 0.08em;
    }

    .sf-glassmarket-underpass {
      left: 14px;
      top: 14px;
    }

    .sf-glassmarket-departures {
      right: 14px;
      top: 14px;
      text-align: right;
    }

    .sf-scene-sheen {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(to bottom, rgba(0,0,0,0.10), transparent 45%, rgba(0,0,0,0.16)),
        radial-gradient(circle at 25% 15%, rgba(255, 160, 30, 0.10), transparent 30%);
      z-index: 1;
    }

    .sf-breaker-node {
      position: absolute;
      left: 17%;
      bottom: 6%;
      width: min(28vw, 260px);
      max-width: 34%;
      min-width: 140px;
      z-index: 2;
      filter: drop-shadow(0 14px 14px rgba(0,0,0,0.42));
    }

    .sf-breaker-node img,
    .sf-tool-icon,
    .sf-item-icon,
    .sf-resource-card img {
      display: block;
      width: 100%;
      height: auto;
      image-rendering: pixelated;
    }

    .sf-breaker-node-label {
      position: absolute;
      left: 4px;
      bottom: calc(100% + 8px);
      padding: 5px 8px;
      background: rgba(8, 10, 12, 0.88);
      border: 1px solid rgba(209, 96, 134, 0.45);
      border-radius: 8px;
      color: #f1269a;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      z-index: 3;
    }

    .sf-breaker-node-status {
      position: absolute;
      left: 4px;
      top: calc(100% + 8px);
      padding: 4px 8px;
      background: rgba(8, 10, 12, 0.88);
      border: 1px solid rgba(74, 70, 64, 0.8);
      border-radius: 8px;
      color: #d9d9d6;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
      z-index: 3;
    }

    .sf-breaker-node.depleted {
      opacity: 0.72;
      filter: grayscale(0.25) brightness(0.82);
    }

    .sf-mara-anchor {
      position: absolute;
      left: 44%;
      bottom: 8%;
      width: min(24vw, 235px);
      max-width: 29%;
      min-width: 120px;
      z-index: 2;
      pointer-events: none;
      filter: drop-shadow(0 12px 18px rgba(0,0,0,0.52));
    }

    .sf-mara-nameplate {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 4px);
      transform: translateX(-50%);
      padding: 4px 8px;
      background: rgba(8, 10, 12, 0.86);
      border: 1px solid rgba(74, 70, 64, 0.95);
      border-radius: 999px;
      color: #d9d9d6;
      font-size: 10px;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }

    .sf-mara-sprite {
      width: 100%;
      aspect-ratio: 1 / 1;
      background-image: url('${asset('cyberpunk_salvage_swing_sprite_sheet.png')}');
      background-repeat: no-repeat;
      background-size: 300% 100%;
      background-position: 0% 0;
      image-rendering: pixelated;
    }

    .sf-mara-anchor.active .sf-mara-sprite {
      animation: sf-salvage-frames 0.78s steps(3) infinite;
    }

    @keyframes sf-salvage-frames {
      from { background-position: 0% 0; }
      to { background-position: 100% 0; }
    }

    .sf-xp-layer {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 10px);
      transform: translateX(-50%);
      width: 180px;
      height: 64px;
      pointer-events: none;
    }

    .sf-xp-popup {
      position: absolute;
      left: 50%;
      bottom: 0;
      transform: translateX(-50%);
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(8, 10, 12, 0.92);
      border: 1px solid rgba(241, 182, 37, 0.55);
      color: #f1b625;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      animation: sf-xp-rise 1.15s ease forwards;
    }

    @keyframes sf-xp-rise {
      0% { opacity: 0; transform: translate(-50%, 8px); }
      12% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -40px); }
    }

    .sf-gather-summary,
    .sf-resource-grid,
    .sf-tool-card,
    .sf-item-grid {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .sf-gather-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .sf-summary-card,
    .sf-resource-card,
    .sf-tool-card,
    .sf-item-card {
      border: 1px solid #303437;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
      padding: 10px;
    }

    .sf-summary-card span,
    .sf-tool-card span,
    .sf-item-card span {
      display: block;
      color: #858784;
      font-size: 11px;
      margin-bottom: 5px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .sf-summary-card strong,
    .sf-tool-card strong,
    .sf-item-card strong {
      display: block;
      color: #d9d9d6;
      font-size: 15px;
      line-height: 1.25;
    }

    .sf-resource-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .sf-resource-card,
    .sf-item-card {
      display: grid;
      grid-template-columns: 62px minmax(0, 1fr);
      align-items: center;
      gap: 10px;
    }

    .sf-resource-card img,
    .sf-item-card img,
    .sf-tool-icon {
      width: 62px;
      height: 62px;
      object-fit: contain;
      image-rendering: pixelated;
    }

    .sf-resource-card strong,
    .sf-item-card strong {
      display: block;
      font-size: 14px;
      color: #d9d9d6;
      line-height: 1.2;
      margin-bottom: 4px;
    }

    .sf-resource-card small,
    .sf-item-card small,
    .sf-tool-card p {
      display: block;
      color: #858784;
      font-size: 11px;
      line-height: 1.35;
      margin: 0;
    }

    .sf-resource-card em {
      display: inline-block;
      margin-top: 6px;
      font-style: normal;
      color: #f1b625;
      font-size: 11px;
    }

    .sf-tool-card {
      grid-template-columns: 72px minmax(0, 1fr);
      align-items: center;
    }

    .sf-node-reset {
      width: 100%;
      margin-top: 12px;
      padding: 10px 12px;
      border: 1px solid #4a4640;
      background: rgba(255,255,255,0.03);
      color: #f1b625;
      text-align: left;
      cursor: pointer;
    }

    .sf-map-label {
      position: absolute;
      padding: 4px 6px;
      border: 1px solid #505456;
      background: #111518;
      font-size: 9px;
      white-space: nowrap;
      transform: translate(-50%, -50%);
      z-index: 1;
    }

    .sf-map-label.current {
      border-color: #f1269a;
      color: #f1269a;
    }

    .sf-map-label.secondary {
      color: #d9d9d6;
    }

    @media (max-width: 820px) {
      .sf-breaker-node {
        left: 8%;
        bottom: 5%;
        max-width: 42%;
      }

      .sf-mara-anchor {
        left: 48%;
        bottom: 6%;
        max-width: 40%;
      }

      .sf-gather-summary,
      .sf-resource-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root missing');

injectRuntimeStyles();

app.innerHTML = `
  <div class="game-shell">
    <header class="masthead">
      <section class="character-card panel" aria-label="Character summary">
        <img src="${asset('mara-vale.png')}" alt="Pixel portrait of Mara Vale" class="portrait" />
        <div class="character-copy">
          <div class="eyebrow">PLAYER</div>
          <h2>Mara Vale</h2>
          <p class="muted">Unregistered Contractor</p>
          <div class="level-row"><span>Level 34</span><span>12,480 / 22,000 XP</span></div>
          <div class="xp-track"><span></span></div>
          <p class="character-quote">“Still here. Still breathing. That's a win.”</p>
        </div>
        <div class="quick-stats" aria-label="Quick stats">
          <div><span class="stat-icon hp">♥</span><strong>86%</strong><small>HP</small></div>
          <div><span class="stat-icon focus">ϟ</span><strong>63%</strong><small>Focus</small></div>
          <div><span class="stat-icon credits">¢</span><strong>1,842</strong><small>Credits</small></div>
        </div>
      </section>

      <div class="brand" aria-label="Stray Frequency">
        <div><span>STRAY</span> <b>FREQUENCY</b></div>
        <small>some places never log off</small>
      </div>

      <section class="district-status panel" aria-label="District status">
        <div>
          <span class="district-name" id="district-name">SOUTH DOCK</span>
          <span class="muted">CYCLE 2147.8.12</span>
          <span>21:47</span>
        </div>
        <div class="weather" title="Heavy rain">☂</div>
        <div class="skyline" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      </section>
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
        </section>

        <nav class="rune-menu panel" aria-label="Game menu">
          ${(['world', 'inventory', 'skills', 'journal', 'comms', 'map'] as Panel[])
            .map(
              (panel) => `
                <button type="button" data-panel="${panel}" class="${panel === 'world' ? 'active' : ''}">
                  <span class="menu-icon">${panelIcons[panel]}</span>
                  <small>${panel.toUpperCase()}</small>
                </button>`
            )
            .join('')}
        </nav>

        <section class="active-panel panel" id="active-panel" aria-live="polite"></section>
      </aside>
    </main>
  </div>
`;

function getCurrentRoom() {
  return rooms[state.roomId];
}

function updateShell() {
  const room = getCurrentRoom();
  const district = document.querySelector<HTMLElement>('#district-name');
  const breadcrumbs = document.querySelector<HTMLElement>('#breadcrumbs');
  const title = document.querySelector<HTMLElement>('#location-title');
  const slogan = document.querySelector<HTMLElement>('#location-slogan');

  if (district) district.textContent = room.district.toUpperCase();
  if (breadcrumbs) breadcrumbs.innerHTML = `${room.district} <span>›</span> ${room.name}`;
  if (title) title.textContent = room.name;
  if (slogan) slogan.textContent = room.slogan;
}

function updateMinimap() {
  const marker = document.querySelector<SVGPathElement>('#player-marker');
  const minimap = document.querySelector('.minimap') as HTMLElement | null;
  if (!marker || !minimap) return;

  if (state.roomId === 'glassmarket') {
    marker.setAttribute('d', 'M154 75 166 98 142 98Z');
  } else {
    marker.setAttribute('d', 'M224 122 236 145 212 145Z');
  }

  minimap.querySelectorAll('.sf-map-label').forEach((node) => node.remove());

  const glassmarket = document.createElement('div');
  glassmarket.className = `sf-map-label ${state.roomId === 'glassmarket' ? 'current' : 'secondary'}`;
  glassmarket.style.left = '48%';
  glassmarket.style.top = '38%';
  glassmarket.textContent = 'Glassmarket';

  const breaker = document.createElement('div');
  breaker.className = `sf-map-label ${state.roomId === 'breaker-yard' ? 'current' : 'secondary'}`;
  breaker.style.left = '72%';
  breaker.style.top = '72%';
  breaker.textContent = 'Breaker Yard 12';

  minimap.style.position = 'relative';
  minimap.appendChild(glassmarket);
  minimap.appendChild(breaker);
}

function renderScene() {
  const room = getCurrentRoom();
  const target = document.querySelector<HTMLElement>('#scene-wrap');
  if (!target) return;

  if (room.id === 'glassmarket') {
    target.innerHTML = `
      <div class="sf-scene-stage">
        <img src="${asset(room.sceneImage)}" alt="Pixel art view of the rainy Glassmarket Transit Concourse" class="scene" />
        <div class="sf-scene-overlay">
          <div class="sf-scene-chip sf-glassmarket-underpass">UNDERPASS<small>BREAKER YARD 12</small></div>
          <div class="sf-scene-chip sf-glassmarket-departures">DEPARTURES<small>PLATFORM 4</small></div>
          <div class="sf-scene-sheen"></div>
        </div>
      </div>
    `;
  } else {
    const pullsLeft = state.salvage.remainingTicks;
    const nodeState = pullsLeft > 0 ? `${pullsLeft} pulls left` : 'Picked clean';
    target.innerHTML = `
      <div class="sf-scene-stage">
        <img src="${asset(room.sceneImage)}" alt="Pixel art view of Breaker Yard 12 beneath the overpass" class="scene" />
        <div class="sf-scene-overlay">
          <div class="sf-breaker-node ${pullsLeft <= 0 ? 'depleted' : ''}">
            <div class="sf-breaker-node-label">Tier 1 Scrap</div>
            <img src="${asset('neon_cyberpunk_scrap_pile.png')}" alt="Tier 1 scrap node" />
            <div class="sf-breaker-node-status">${nodeState}</div>
          </div>

          <div class="sf-mara-anchor ${state.salvage.active ? 'active' : ''}">
            <div class="sf-xp-layer" id="sf-xp-layer"></div>
            <div class="sf-mara-nameplate">Mara Vale</div>
            <div class="sf-mara-sprite" aria-hidden="true"></div>
          </div>

          <div class="sf-scene-chip sf-glassmarket-underpass">SALVAGE LOT<small>PERSONAL DEMO NODE</small></div>
          <div class="sf-scene-chip sf-glassmarket-departures">SOUTH DOCK<small>BREAKER YARD 12</small></div>
          <div class="sf-scene-sheen"></div>
        </div>
      </div>
    `;
  }

  updateMinimap();
}

function renderLog() {
  const log = document.querySelector<HTMLDivElement>('#log');
  if (!log) return;
  log.innerHTML = state.logs
    .map((line, index) => `<div class="log-line ${index === state.logs.length - 1 ? 'newest' : ''}">${escapeHtml(line)}</div>`)
    .join('');
  log.scrollTop = log.scrollHeight;
}

function worldActionsMarkup(actions: RoomAction[]) {
  return `
    <div class="action-list">
      ${actions
        .map((action) => {
          let detail = action.detail;
          let disabled = false;

          if (action.type === 'start-salvaging') {
            if (state.salvage.active) {
              disabled = true;
              detail = 'Mara is already salvaging this node';
            } else if (state.salvage.remainingTicks <= 0) {
              disabled = true;
              detail = 'This node has been picked clean';
            }
          }

          return `
            <button type="button" data-action="${action.type}" ${disabled ? 'disabled' : ''}>
              <span>${action.type === 'start-salvaging' ? '⛭' : action.type === 'goto-breaker-yard' ? '↗' : action.type === 'goto-glassmarket' ? '↙' : '⌕'}</span>
              ${action.label}
              <b>›</b>
            </button>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderPanel() {
  const room = getCurrentRoom();
  const target = document.querySelector<HTMLElement>('#active-panel');
  if (!target) return;

  const worldContent =
    room.id === 'glassmarket'
      ? `
        <div class="panel-kicker">CURRENT LOCATION</div>
        <h3>${room.name}</h3>
        <p>${room.description}</p>
        <p class="world-note">The service underpass gives you a direct route to the local gathering area.</p>
        ${worldActionsMarkup(room.actions)}
      `
      : `
        <div class="panel-kicker">CURRENT LOCATION</div>
        <h3>${room.name}</h3>
        <p>${room.description}</p>
        ${worldActionsMarkup(room.actions)}

        <div class="sf-gather-summary">
          <div class="sf-summary-card">
            <span>Gathering node</span>
            <strong>Tier 1 Scrap</strong>
          </div>
          <div class="sf-summary-card">
            <span>Pulls left</span>
            <strong>${state.salvage.remainingTicks}</strong>
          </div>
          <div class="sf-summary-card">
            <span>Requires</span>
            <strong>Salvaging ${state.salvage.requirement}</strong>
          </div>
          <div class="sf-summary-card">
            <span>Yield rule</span>
            <strong>50% metal / 50% composite</strong>
          </div>
        </div>

        <div class="sf-tool-card">
          <img class="sf-tool-icon" src="${asset('cyberpunk_salvage_crowbar_tool.png')}" alt="Salvage tool" />
          <div>
            <span>Equipped tool</span>
            <strong>Powered Salvage Bar</strong>
            <p>A rough utility breaker used to pry, split and strip low-tier scrap.</p>
          </div>
        </div>

        <div class="sf-resource-grid">
          <div class="sf-resource-card">
            <img src="${asset('cyberpunk_scrap_metal_pile.png')}" alt="Tier 1 Metal Scrap" />
            <div>
              <strong>Tier 1 Metal Scrap</strong>
              <small>Bolts, plates and structural metal recovered from salvage.</small>
              <em>Owned: ${state.inventory['Tier 1 Metal Scrap']}</em>
            </div>
          </div>
          <div class="sf-resource-card">
            <img src="${asset('neon_cyberpunk_scrapyard_heap.png')}" alt="Tier 1 Composite Scrap" />
            <div>
              <strong>Tier 1 Composite Scrap</strong>
              <small>Mixed housings, tubing, casings and recoverable composite parts.</small>
              <em>Owned: ${state.inventory['Tier 1 Composite Scrap']}</em>
            </div>
          </div>
        </div>

        <button class="sf-node-reset" type="button" data-action="reset-node">Reset demo node</button>
      `;

  const inventoryContent = `
    <div class="panel-kicker">INVENTORY</div>
    <h3>Carried Materials</h3>
    <div class="sf-item-grid">
      <div class="sf-item-card">
        <img src="${asset('cyberpunk_salvage_crowbar_tool.png')}" alt="Powered Salvage Bar" />
        <div>
          <span>Tool</span>
          <strong>Powered Salvage Bar</strong>
          <small>Used to work Tier 1 Scrap nodes in Breaker Yard 12.</small>
        </div>
      </div>

      <div class="sf-item-card">
        <img src="${asset('cyberpunk_scrap_metal_pile.png')}" alt="Tier 1 Metal Scrap" />
        <div>
          <span>Material</span>
          <strong>Tier 1 Metal Scrap × ${state.inventory['Tier 1 Metal Scrap']}</strong>
          <small>Placeholder material for metalworking routes.</small>
        </div>
      </div>

      <div class="sf-item-card">
        <img src="${asset('neon_cyberpunk_scrapyard_heap.png')}" alt="Tier 1 Composite Scrap" />
        <div>
          <span>Material</span>
          <strong>Tier 1 Composite Scrap × ${state.inventory['Tier 1 Composite Scrap']}</strong>
          <small>Placeholder material for fabrication routes.</small>
        </div>
      </div>
    </div>
    <p class="footnote">This panel is now using the generated asset icons rather than CSS mock items.</p>
  `;

  const skillsContent = `
    <div class="panel-kicker">SKILLS</div>
    <h3>Capability</h3>
    <div class="skill-list">
      ${[
        ['Firearms', 38],
        ['Close Combat', 34],
        ['Survivability', 41],
        ['Salvaging', 9],
        ['Metalworking', 6],
        ['Fabrication', 5],
        ['Fishing', 3],
        ['Cooking', 2]
      ]
        .map(
          ([name, level]) => `
            <div><span>${name}</span><strong>${level}</strong><i><em style="width:${Math.min(100, Number(level) * 2)}%"></em></i></div>`
        )
        .join('')}
    </div>
  `;

  const journalContent = `
    <div class="panel-kicker">JOURNAL</div>
    <h3>Stories & Jobs</h3>
    <button class="journal-entry"><strong>Breaker Yard 12</strong><span>A direct gathering room linked from Glassmarket. Good for testing salvage nodes and asset placement.</span></button>
    <button class="journal-entry"><strong>South Dock Routine</strong><span>Travel between hubs and work local nodes without breaking the UI shell.</span></button>
    <button class="journal-entry muted-entry"><strong>Prototype Goal</strong><span>Collect scrap, prove the core loop, then layer in production.</span></button>
  `;

  const commsContent = `
    <div class="panel-kicker">COMMS</div>
    <h3>Messages</h3>
    <button class="message"><span class="avatar">RV</span><span><strong>Rhea Venn</strong><small>If you work the yard, keep anything useful and ignore the obvious tetanus.</small></span><time>21:41</time></button>
    <button class="message"><span class="avatar">BY</span><span><strong>Breaker Yard 12</strong><small>Low-tier scrap available. Personal salvage bays open.</small></span><time>21:36</time></button>
    <button class="message"><span class="avatar">TA</span><span><strong>Transit Authority</strong><small>Service underpass remains open to foot traffic.</small></span><time>20:08</time></button>
  `;

  const mapContent = `
    <div class="panel-kicker">CITY MAP</div>
    <h3>South Dock</h3>
    <div class="district-map">
      <div class="map-node ${state.roomId === 'glassmarket' ? 'current' : ''}" style="left:32%;top:42%">Glassmarket</div>
      <div class="map-node ${state.roomId === 'breaker-yard' ? 'current' : ''}" style="left:68%;top:64%">Breaker Yard 12</div>
      <div class="map-node" style="left:16%;top:68%">Dock 9</div>
      <div class="map-node locked" style="left:70%;top:16%">???</div>
      <svg viewBox="0 0 100 70" aria-hidden="true"><path d="M28 33 52 44 68 50" /><path d="M14 54 28 33" /></svg>
    </div>
    <p class="footnote">Glassmarket now links directly to the salvage room used by the gathering prototype.</p>
  `;

  const content: Record<Panel, string> = {
    world: worldContent,
    inventory: inventoryContent,
    skills: skillsContent,
    journal: journalContent,
    comms: commsContent,
    map: mapContent
  };

  target.innerHTML = content[state.panel];

  target.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action as ActionType | undefined;
      if (action) handleAction(action);
    });
  });
}

function addLog(message: string) {
  state.logs.push(`[21:48]  ${message}`);
  if (state.logs.length > 36) state.logs.shift();
  renderLog();
}

function handleAction(action: ActionType) {
  switch (action) {
    case 'goto-breaker-yard':
      stopSalvaging(false);
      state.roomId = 'breaker-yard';
      addLog('You head through the service underpass to Breaker Yard 12.');
      renderAll();
      return;

    case 'goto-glassmarket':
      stopSalvaging(false);
      state.roomId = 'glassmarket';
      addLog('You leave the yard and return to Glassmarket.');
      renderAll();
      return;

    case 'start-salvaging':
      startSalvaging();
      return;

    case 'reset-node':
      stopSalvaging(false);
      state.salvage.remainingTicks = state.salvage.maxTicks;
      addLog('A fresh Tier 1 Scrap pile is set aside for the demo.');
      renderAll();
      return;

    case 'inspect-board':
      addLog('The departures board flickers between delays and broken advertising loops.');
      return;
  }
}

function startSalvaging() {
  if (state.roomId !== 'breaker-yard') return;
  if (state.salvage.active || state.salvage.remainingTicks <= 0) return;

  state.salvage.active = true;
  addLog('Mara steps into the bay and starts salvaging the node.');
  renderAll();

  state.salvage.intervalId = window.setInterval(() => {
    runSalvageTick();
  }, 1200);
}

function stopSalvaging(withLog: boolean) {
  if (state.salvage.intervalId !== null) {
    clearInterval(state.salvage.intervalId);
    state.salvage.intervalId = null;
  }

  const wasActive = state.salvage.active;
  state.salvage.active = false;

  if (withLog && wasActive) {
    addLog('The current scrap pile has been picked clean.');
  }
}

function runSalvageTick() {
  if (!state.salvage.active) return;

  if (state.salvage.remainingTicks <= 0) {
    stopSalvaging(true);
    renderAll();
    return;
  }

  state.salvage.remainingTicks -= 1;

  const resource = Math.random() < 0.5 ? 'Tier 1 Metal Scrap' : 'Tier 1 Composite Scrap';
  state.inventory[resource] += 1;

  const finalTick = state.salvage.remainingTicks <= 0;

  addLog(`+${state.salvage.xpPerTick} Salvaging XP · ${resource} collected.`);
  renderScene();
  renderPanel();
  renderLog();
  spawnXpPopup(`+${state.salvage.xpPerTick} XP`);

  if (finalTick) {
    window.setTimeout(() => {
      stopSalvaging(true);
      renderAll();
    }, 220);
  }
}

function spawnXpPopup(text: string) {
  const host = document.querySelector<HTMLElement>('#sf-xp-layer');
  if (!host) return;

  const popup = document.createElement('div');
  popup.className = 'sf-xp-popup';
  popup.textContent = text;
  host.appendChild(popup);

  window.setTimeout(() => {
    popup.remove();
  }, 1200);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    };
    return entities[character] ?? character;
  });
}

function renderAll() {
  updateShell();
  renderScene();
  renderPanel();
  renderLog();
}

document.querySelectorAll<HTMLButtonElement>('.rune-menu button').forEach((button) => {
  button.addEventListener('click', () => {
    const panel = button.dataset.panel as Panel;
    state.panel = panel;
    document.querySelectorAll('.rune-menu button').forEach((item) => {
      item.classList.toggle('active', item === button);
    });
    renderPanel();
  });
});

document.querySelector<HTMLFormElement>('#chat-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector<HTMLInputElement>('#chat-message');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  addLog(`Mara: ${value}`);
  input.value = '';
});

renderAll();
