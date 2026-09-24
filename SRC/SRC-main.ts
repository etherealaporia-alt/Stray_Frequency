import './style.css';

const assetBase = import.meta.env.BASE_URL;

type Panel = 'world' | 'inventory' | 'skills' | 'journal' | 'comms' | 'map';
type RoomId = 'glassmarket' | 'breaker-yard';

type RoomAction = {
  label: string;
  detail: string;
  type:
    | 'goto-breaker-yard'
    | 'goto-glassmarket'
    | 'start-salvaging'
    | 'reset-node'
    | 'flavour';
};

type Room = {
  id: RoomId;
  district: string;
  name: string;
  subtitle: string;
  description: string;
  scene: 'glassmarket' | 'breaker-yard';
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
    subtitle: 'TRADE. TRAVEL. TRY TO STAY ALIVE.',
    description:
      'Rainwater drips from the glass canopy as travellers, scavengers and vendors crowd the old concourse. A half-lit underpass leads away from the market toward the district breaker yards.',
    scene: 'glassmarket',
    actions: [
      {
        label: 'Take the service underpass',
        detail: 'Head for the local salvage yard',
        type: 'goto-breaker-yard'
      },
      {
        label: 'Inspect the departures board',
        detail: 'A harmless world interaction',
        type: 'flavour'
      }
    ]
  },
  'breaker-yard': {
    id: 'breaker-yard',
    district: 'South Dock',
    name: 'Breaker Yard 12',
    subtitle: 'SALVAGE. SORT. SELL.',
    description:
      'A fenced service lot packed with stripped machinery and tagged scrap heaps. The city sends its dead hardware here to be pulled apart by anyone with the nerve and the right tools.',
    scene: 'breaker-yard',
    actions: [
      {
        label: 'Salvage Tier 1 Scrap',
        detail: 'Work the nearby node for materials',
        type: 'start-salvaging'
      },
      {
        label: 'Return to Glassmarket',
        detail: 'Back through the underpass',
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
    '[21:47]  A service underpass sign points toward Breaker Yard 12.',
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

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root missing');

app.innerHTML = `
  <div class="game-shell">
    <header class="masthead">
      <section class="character-card panel" aria-label="Character summary">
        <img src="${assetBase}assets/mara-vale.png" alt="Pixel portrait of Mara Vale" class="portrait" />
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
          <span class="district-name" id="district-name"></span>
          <span class="muted">CYCLE 2147.8.12</span>
          <span>21:47</span>
        </div>
        <div class="weather" title="Light rain">☂</div>
        <div class="skyline" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      </section>
    </header>

    <main class="play-grid">
      <section class="world-column">
        <article class="location-card panel">
          <div class="location-heading">
            <div>
              <div class="breadcrumbs" id="breadcrumbs"></div>
              <h1 id="location-name"></h1>
            </div>
            <p id="location-subtitle"></p>
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
          <svg viewBox="0 0 320 180" role="img" aria-label="Schematic minimap of the local area">
            <rect width="320" height="180" fill="#0b0e12" />
            <g stroke="#262b31" stroke-width="12" fill="none">
              <path d="M28 36H150V60H296"/><path d="M58 156V82H112V112H242V154"/><path d="M178 18V92H286"/><path d="M18 126H76"/>
            </g>
            <g fill="#161a20" stroke="#343a42" stroke-width="2">
              <rect x="16" y="17" width="84" height="44"/><rect x="110" y="76" width="52" height="31"/><rect x="206" y="18" width="72" height="44"/><rect x="196" y="118" width="76" height="40"/><rect x="21" y="93" width="44" height="28"/>
            </g>
            <g class="map-transit"><rect x="44" y="145" width="12" height="12"></rect></g>
            <g class="map-salvage"><rect x="206" y="127" width="16" height="16"></rect></g>
            <g class="map-route"><path d="M66 118 116 95 205 135" /></g>
            <path id="player-marker" class="player-marker" d="M154 75 166 98 142 98Z" />
          </svg>
          <div class="map-legend">
            <span><i class="you"></i>You</span>
            <span><i class="transit"></i>Transit</span>
            <span><i class="salvage"></i>Salvage</span>
          </div>
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

function getCurrentRoom(): Room {
  return rooms[state.roomId];
}

function renderShellDetails() {
  const room = getCurrentRoom();
  const districtName = document.querySelector<HTMLElement>('#district-name');
  const breadcrumbs = document.querySelector<HTMLElement>('#breadcrumbs');
  const locationName = document.querySelector<HTMLElement>('#location-name');
  const locationSubtitle = document.querySelector<HTMLElement>('#location-subtitle');

  if (districtName) districtName.textContent = room.district.toUpperCase();
  if (breadcrumbs) breadcrumbs.innerHTML = `${room.district} <span>›</span> ${room.name}`;
  if (locationName) locationName.textContent = room.name;
  if (locationSubtitle) locationSubtitle.textContent = room.subtitle;
}

function renderScene() {
  const room = getCurrentRoom();
  const target = document.querySelector<HTMLElement>('#scene-wrap');
  if (!target) return;

  if (room.scene === 'glassmarket') {
    target.innerHTML = `
      <div class="scene-stage glassmarket-stage">
        <img src="${assetBase}assets/glassmarket.png" alt="Pixel art view of the rainy Glassmarket Transit Concourse" class="scene scene-image" />
        <div class="scene-tag scene-tag-left">UNDERPASS<br><small>BREAKER YARD 12</small></div>
        <div class="scene-tag scene-tag-right">DEPARTURES<br><small>PLATFORM 4</small></div>
      </div>
    `;
  } else {
    const remaining = state.salvage.remainingTicks;
    const depleted = remaining <= 0;
    target.innerHTML = `
      <div class="scene-stage breaker-stage">
        <div class="yard-backdrop"></div>
        <div class="yard-fence"></div>
        <div class="yard-cabins"></div>
        <div class="yard-light"></div>

        <div class="scrap-node ${depleted ? 'depleted' : ''}" id="scrap-node">
          <div class="node-label">TIER 1 SCRAP</div>
          <div class="node-count">${depleted ? 'PICKED CLEAN' : `${remaining} salvage pulls left`}</div>
          <div class="scrap-piece piece-a"></div>
          <div class="scrap-piece piece-b"></div>
          <div class="scrap-piece piece-c"></div>
          <div class="scrap-piece piece-d"></div>
          <div class="scrap-piece piece-e"></div>
        </div>

        <div class="mara-anchor ${state.salvage.active ? 'visible' : ''}" id="mara-anchor">
          <div class="xp-layer" id="xp-layer"></div>
          <div class="mara-nameplate">Mara Vale</div>
          <div class="mara-sprite ${state.salvage.active ? 'salvaging' : ''}">
            <div class="sprite-shadow"></div>
            <div class="mara-core">
              <div class="mara-head"></div>
              <div class="mara-hair"></div>
              <div class="mara-body"></div>
              <div class="mara-arm arm-back"></div>
              <div class="mara-arm arm-front"></div>
              <div class="mara-leg leg-back"></div>
              <div class="mara-leg leg-front"></div>
              <div class="mara-tool"></div>
            </div>
          </div>
        </div>

        <div class="scene-note">A tagged service lot where scrap is sorted before sale.</div>
      </div>
    `;
  }

  updateMapMarker();
}

function updateMapMarker() {
  const marker = document.querySelector<SVGPathElement>('#player-marker');
  if (!marker) return;

  if (state.roomId === 'glassmarket') {
    marker.setAttribute('d', 'M154 75 166 98 142 98Z');
  } else {
    marker.setAttribute('d', 'M214 114 226 137 202 137Z');
  }
}

function renderLog() {
  const log = document.querySelector<HTMLDivElement>('#log');
  if (!log) return;

  log.innerHTML = state.logs
    .map((line, index) => `<div class="log-line ${index === state.logs.length - 1 ? 'newest' : ''}">${escapeHtml(line)}</div>`)
    .join('');
  log.scrollTop = log.scrollHeight;
}

function renderPanel() {
  const room = getCurrentRoom();
  const target = document.querySelector<HTMLElement>('#active-panel');
  if (!target) return;

  const worldActions = room.actions
    .map((action) => {
      let disabled = false;
      let disabledText = '';

      if (action.type === 'start-salvaging') {
        if (state.salvage.active) {
          disabled = true;
          disabledText = 'Already salvaging...';
        } else if (state.salvage.remainingTicks <= 0) {
          disabled = true;
          disabledText = 'This node has been picked clean.';
        }
      }

      return `
        <button class="world-action ${disabled ? 'disabled' : ''}" data-action="${action.type}" ${disabled ? 'disabled' : ''}>
          <strong>${action.label}</strong>
          <span>${disabled ? disabledText || action.detail : action.detail}</span>
          <b>›</b>
        </button>
      `;
    })
    .join('');

  const worldExtra =
    state.roomId === 'breaker-yard'
      ? `
        <div class="node-status-card">
          <div><span>Gathering node</span><strong>Tier 1 Scrap</strong></div>
          <div><span>Requires</span><strong>Salvaging ${state.salvage.requirement}</strong></div>
          <div><span>Pulls left</span><strong>${state.salvage.remainingTicks}</strong></div>
        </div>
        <div class="resource-summary">
          <div><span class="resource-chip metal"></span>Tier 1 Metal Scrap <strong>${state.inventory['Tier 1 Metal Scrap']}</strong></div>
          <div><span class="resource-chip composite"></span>Tier 1 Composite Scrap <strong>${state.inventory['Tier 1 Composite Scrap']}</strong></div>
        </div>
      `
      : '';

  const content: Record<Panel, string> = {
    world: `
      <div class="panel-kicker">CURRENT LOCATION</div>
      <h3>${room.name}</h3>
      <p>${room.description}</p>
      <div class="action-list">${worldActions}</div>
      ${state.roomId === 'breaker-yard' ? `<button class="secondary-action" data-action="reset-node">Refresh demo node</button>` : ''}
      ${worldExtra}
    `,
    inventory: `
      <div class="panel-kicker">INVENTORY</div>
      <h3>Recovered Materials</h3>
      <div class="inventory-list">
        ${Object.entries(state.inventory)
          .map(
            ([name, count]) => `
              <div class="inventory-row">
                <span>${name}</span>
                <strong>${count}</strong>
              </div>`
          )
          .join('')}
      </div>
      <p class="footnote">Simple placeholder inventory focused on the salvage demo.</p>
    `,
    skills: `
      <div class="panel-kicker">SKILLS</div>
      <h3>Core Skills</h3>
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
    `,
    journal: `
      <div class="panel-kicker">JOURNAL</div>
      <h3>Local Notes</h3>
      <button class="journal-entry"><strong>Breaker Yard 12</strong><span>A practical salvage spot reached via the Glassmarket underpass.</span></button>
      <button class="journal-entry muted-entry"><strong>Placeholder Task</strong><span>Collect a few scrap materials to prove the gathering loop.</span></button>
    `,
    comms: `
      <div class="panel-kicker">COMMS</div>
      <h3>Messages</h3>
      <button class="message"><span class="avatar">RV</span><span><strong>Rhea Venn</strong><small>If you head to the breaker yard, keep anything with a clean power bus.</small></span><time>21:42</time></button>
      <button class="message"><span class="avatar">TA</span><span><strong>Transit Authority</strong><small>Service underpass C remains open to foot traffic.</small></span><time>20:08</time></button>
    `,
    map: `
      <div class="panel-kicker">LOCAL MAP</div>
      <h3>South Dock Route</h3>
      <div class="district-map">
        <div class="map-node ${state.roomId === 'glassmarket' ? 'current' : ''}" style="left:20%;top:44%">Glassmarket</div>
        <div class="map-node ${state.roomId === 'breaker-yard' ? 'current' : ''}" style="left:66%;top:62%">Breaker Yard 12</div>
        <svg viewBox="0 0 100 70" aria-hidden="true"><path d="M24 32 66 46" /></svg>
      </div>
      <p class="footnote">The underpass links the market directly to the local salvage lot.</p>
    `
  };

  target.innerHTML = content[state.panel];

  target.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action as RoomAction['type'];
      handleAction(action);
    });
  });
}

function handleAction(action: RoomAction['type']) {
  switch (action) {
    case 'goto-breaker-yard':
      stopSalvaging(false);
      state.roomId = 'breaker-yard';
      addLog('You head down the service underpass to Breaker Yard 12.');
      renderAll();
      break;
    case 'goto-glassmarket':
      stopSalvaging(false);
      state.roomId = 'glassmarket';
      addLog('You leave the breaker yard and return to Glassmarket.');
      renderAll();
      break;
    case 'start-salvaging':
      startSalvaging();
      break;
    case 'reset-node':
      resetNode();
      break;
    case 'flavour':
      addLog('The departures board flickers between delayed trains and corrupted advertisements.');
      break;
  }
}

function startSalvaging() {
  if (state.salvage.active || state.salvage.remainingTicks <= 0) return;

  state.salvage.active = true;
  addLog('Mara gets to work on the Tier 1 Scrap pile.');
  renderAll();

  state.salvage.intervalId = window.setInterval(() => {
    runSalvageTick();
  }, 1150);
}

function stopSalvaging(withLog: boolean) {
  if (state.salvage.intervalId !== null) {
    clearInterval(state.salvage.intervalId);
    state.salvage.intervalId = null;
  }

  const wasActive = state.salvage.active;
  state.salvage.active = false;

  if (withLog && wasActive) {
    addLog('The local scrap pile has been picked clean.');
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

  const item = Math.random() < 0.5 ? 'Tier 1 Metal Scrap' : 'Tier 1 Composite Scrap';
  state.inventory[item] += 1;
  const finalTick = state.salvage.remainingTicks <= 0;

  addLog(`+${state.salvage.xpPerTick} Salvaging XP · ${item} collected.`);
  renderScene();
  renderPanel();
  renderLog();
  spawnXpPopup(`+${state.salvage.xpPerTick} XP`);

  if (finalTick) {
    window.setTimeout(() => {
      stopSalvaging(true);
      renderAll();
    }, 180);
  }
}

function resetNode() {
  stopSalvaging(false);
  state.salvage.remainingTicks = state.salvage.maxTicks;
  addLog('A fresh Tier 1 Scrap pile is dragged into place for the demo.');
  renderAll();
}

function spawnXpPopup(text: string) {
  const host = document.querySelector<HTMLElement>('#xp-layer');
  if (!host) return;

  const popup = document.createElement('div');
  popup.className = 'xp-popup';
  popup.textContent = text;
  host.appendChild(popup);

  window.setTimeout(() => {
    popup.remove();
  }, 1200);
}

function addLog(message: string) {
  state.logs.push(`[21:48]  ${message}`);
  if (state.logs.length > 40) state.logs.shift();
  renderLog();
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
  renderShellDetails();
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
