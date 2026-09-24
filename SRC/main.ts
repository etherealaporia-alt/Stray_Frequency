import './style.css';

const assetBase = import.meta.env.BASE_URL;

type Panel = 'world' | 'inventory' | 'skills' | 'journal' | 'comms' | 'map';

const panelIcons: Record<Panel, string> = {
  world: '◎',
  inventory: '▣',
  skills: '▥',
  journal: '▤',
  comms: '◌',
  map: '◆'
};

const state = {
  panel: 'world' as Panel,
  logs: [
    '[21:47]  You arrive at Glassmarket Transit Concourse.',
    '[21:47]  Rhea Venn is arguing with a vending machine. Classic.',
    '[21:46]  You spent 20 credits on noodles. Mediocre, but warm.',
    '[21:42]  New location discovered: Glassmarket Transit Concourse.'
  ]
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
          <span class="district-name">SOUTH DOCK</span>
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
              <div class="breadcrumbs">South Dock <span>›</span> Glassmarket</div>
              <h1>Glassmarket Transit Concourse</h1>
            </div>
            <p>TRADE. TRAVEL. TRY TO STAY ALIVE.</p>
          </div>
          <div class="scene-wrap">
            <img src="${assetBase}assets/glassmarket.png" alt="Pixel art view of the rainy Glassmarket Transit Concourse" class="scene" />
            <div class="scene-tag scene-tag-left">KURO NOODLES<br><small>OPEN LATE</small></div>
            <div class="scene-tag scene-tag-right">DEPARTURES<br><small>PLATFORM 4</small></div>
          </div>
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
          <svg viewBox="0 0 320 180" role="img" aria-label="Schematic minimap of Glassmarket">
            <rect width="320" height="180" fill="#0b0e12" />
            <g stroke="#262b31" stroke-width="12" fill="none">
              <path d="M22 28H140V62H300"/><path d="M46 160V82H108V112H246V154"/><path d="M176 14V92H286"/><path d="M18 126H74"/>
            </g>
            <g fill="#161a20" stroke="#343a42" stroke-width="2">
              <rect x="18" y="15" width="74" height="38"/><rect x="110" y="76" width="52" height="31"/><rect x="206" y="18" width="72" height="44"/><rect x="196" y="118" width="76" height="40"/><rect x="21" y="93" width="44" height="28"/>
            </g>
            <g class="map-shops"><rect x="53" y="31" width="12" height="12" rx="2"/><rect x="224" y="39" width="12" height="12" rx="2"/><rect x="218" y="132" width="12" height="12" rx="2"/></g>
            <g class="map-npcs"><circle cx="125" cy="49" r="6"/><circle cx="171" cy="119" r="6"/><circle cx="260" cy="86" r="6"/></g>
            <g class="map-transit"><rect x="42" y="142" width="11" height="11"/></g>
            <path class="player-marker" d="M154 75 166 98 142 98Z" />
          </svg>
          <div class="map-legend"><span><i class="you"></i>You</span><span><i class="npc"></i>NPC</span><span><i class="shop"></i>Shop</span><span><i class="transit"></i>Transit</span></div>
        </section>

        <nav class="rune-menu panel" aria-label="Game menu">
          ${(['world','inventory','skills','journal','comms','map'] as Panel[]).map(p => `
            <button type="button" data-panel="${p}" class="${p === 'world' ? 'active' : ''}">
              <span class="menu-icon">${panelIcons[p]}</span>
              <small>${p.toUpperCase()}</small>
            </button>`).join('')}
        </nav>

        <section class="active-panel panel" id="active-panel" aria-live="polite"></section>
      </aside>
    </main>
  </div>
`;

function renderLog() {
  const log = document.querySelector<HTMLDivElement>('#log');
  if (!log) return;
  log.innerHTML = state.logs.map((line, i) => `<div class="log-line ${i === 0 ? 'newest' : ''}">${escapeHtml(line)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}

function renderPanel() {
  const target = document.querySelector<HTMLElement>('#active-panel');
  if (!target) return;

  const content: Record<Panel, string> = {
    world: `
      <div class="panel-kicker">CURRENT LOCATION</div>
      <h3>Glassmarket Transit Concourse</h3>
      <p>Rainwater drips from the glass canopy as crowds flow through. Street vendors, travellers and fixers jostle beneath a sky of neon. The smell of noodles, ozone and wet concrete hangs in the air.</p>
      <p class="world-note">This is South Dock — a meeting point for every kind of story.</p>
      <div class="action-list">
        <button data-action="Talk to Rhea Venn"><span>●</span>Talk to Rhea Venn<b>›</b></button>
        <button data-action="Inspect the vending machine"><span>⌕</span>Inspect Vending Machine<b>›</b></button>
        <button data-action="Browse Glassmarket"><span>▣</span>Browse Market<b>›</b></button>
        <button data-action="Check departures"><span>▤</span>Check Departures<b>›</b></button>
        <button data-action="Move on"><span>↗</span>Move On<b>›</b></button>
      </div>`,
    inventory: `
      <div class="panel-kicker">INVENTORY</div><h3>Carried Gear</h3>
      <div class="inventory-grid">
        ${['Sidearm','Medpatch','Transit Pass','Data Shard','Spare Mag','Noodles','','','','','',''].map((x,i)=>`<button type="button" class="item-slot" title="${x || 'Empty slot'}"><span>${x ? ['▰','✚','▧','◇','▥','≈'][i] : ''}</span><small>${x}</small></button>`).join('')}
      </div><p class="footnote">6 / 12 slots used · 8.4 kg carried</p>`,
    skills: `
      <div class="panel-kicker">SKILLS</div><h3>Capability</h3>
      <div class="skill-list">
        ${[['Streetwise',52],['Electronics',47],['Engineering',41],['Firearms',38],['Hacking',36],['Persuasion',33],['Salvaging',31],['Medicine',28]].map(([name,lvl])=>`<div><span>${name}</span><strong>${lvl}</strong><i><em style="width:${Math.min(100, Number(lvl)*1.5)}%"></em></i></div>`).join('')}
      </div>`,
    journal: `
      <div class="panel-kicker">JOURNAL</div><h3>Stories & Jobs</h3>
      <button class="journal-entry"><strong>Dead Letter Office</strong><span>Why do undeliverable parcels keep reappearing at South Dock?</span></button>
      <button class="journal-entry"><strong>Municipal Error #441</strong><span>Rhea's vending machine problem may be stranger than it looks.</span></button>
      <button class="journal-entry muted-entry"><strong>Dockwork</strong><span>Two small jobs available around Glassmarket.</span></button>`,
    comms: `
      <div class="panel-kicker">COMMS</div><h3>Messages</h3>
      <button class="message"><span class="avatar">RV</span><span><strong>Rhea Venn</strong><small>you near Glassmarket?</small></span><time>21:41</time></button>
      <button class="message"><span class="avatar">?</span><span><strong>UNKNOWN</strong><small>Still interested in paid work?</small></span><time>20:08</time></button>
      <button class="message"><span class="avatar">TA</span><span><strong>Transit Authority</strong><small>Route 09 delays continue.</small></span><time>18:32</time></button>`,
    map: `
      <div class="panel-kicker">CITY MAP</div><h3>South Dock</h3>
      <div class="district-map">
        <div class="map-node current" style="left:46%;top:38%">Glassmarket</div>
        <div class="map-node" style="left:13%;top:68%">Dock 9</div>
        <div class="map-node" style="left:62%;top:70%">Old Metro</div>
        <div class="map-node locked" style="left:67%;top:13%">???</div>
        <svg viewBox="0 0 100 70" aria-hidden="true"><path d="M18 50 48 28 68 51M48 28 70 14"/></svg>
      </div>
      <p class="footnote">3 locations known · 1 route unresolved</p>`
  };
  target.innerHTML = content[state.panel];

  target.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => addLog(`You choose: ${btn.dataset.action}.`));
  });
}

function addLog(message: string) {
  state.logs.push(`[21:48]  ${message}`);
  if (state.logs.length > 30) state.logs.shift();
  renderLog();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] ?? c));
}

document.querySelectorAll<HTMLButtonElement>('.rune-menu button').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = btn.dataset.panel as Panel;
    state.panel = panel;
    document.querySelectorAll('.rune-menu button').forEach(x => x.classList.toggle('active', x === btn));
    renderPanel();
  });
});

document.querySelector<HTMLFormElement>('#chat-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const input = document.querySelector<HTMLInputElement>('#chat-message');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  addLog(`Mara: ${value}`);
  input.value = '';
});

renderLog();
renderPanel();
