import './style.css';
import { createClient, type User } from '@supabase/supabase-js';

const supabase = createClient(
  'https://aikcmzqdzsbnknvcapvm.supabase.co',
  'sb_publishable_lF1shaFKY_Mcl8e0p7amqQ_UcBL_yV9'
);

type Character = {
  id: string;
  account_id: string;
  name: string;
  body_type: 'male' | 'female';
  appearance_skipped: boolean;
  location_id: string;
  credits: number;
  health: number;
  max_health: number;
  progress?: StoredCharacterProgress | null;
};

type CharacterSkill = { skill_key: string; level: number; xp: number };

const STARTING_SKILLS = [
  ['firearms', 'Firearms'], ['close_combat', 'Close Combat'],
  ['survivability', 'Survivability'], ['salvaging', 'Salvaging'],
  ['metalworking', 'Metalworking'], ['fabrication', 'Fabrication'],
  ['fishing', 'Fishing'], ['cooking', 'Cooking']
] as const;

let currentSkills: CharacterSkill[] = [];
const MAX_SKILL_LEVEL=100;
const SKILL_ICONS:Record<string,string>={firearms:'⌖',close_combat:'⚔',survivability:'♥',salvaging:'⛭',metalworking:'⚒',fabrication:'▦',fishing:'◒',cooking:'♨'};
const SKILL_DESCRIPTIONS:Record<string,string>={firearms:'Placeholder: ranged weapon handling, accuracy, and firearm proficiency.',close_combat:'Placeholder: melee technique and close-quarters combat proficiency.',survivability:'Placeholder: endurance, defensive tactics, and recovery.',salvaging:'Placeholder: scrap recovery, tool use, and salvage yield.',metalworking:'Placeholder: processing and shaping recovered metals.',fabrication:'Placeholder: constructing useful gear and components.',fishing:'Placeholder: locating, catching, and preparing fish.',cooking:'Placeholder: preparing meals and useful consumables.'};
const SKILL_UNLOCK_LEVELS=Array.from({length:MAX_SKILL_LEVEL},(_,index)=>index+1);
function xpForNextSkillLevel(level:number){return level>=MAX_SKILL_LEVEL?0:Math.max(83,Math.floor(83*Math.pow(1.12,level-1)));}

let currentUser: User | null = null;
let currentCharacter: Character | null = null;

const assetBase = import.meta.env.BASE_URL;

type Panel = 'world' | 'inventory' | 'equipment' | 'skills' | 'journal' | 'comms' | 'map';
type RoomId = 'glassmarket' | 'breaker-yard' | 'south-dock-pier';
type ActionType =
  | 'goto-breaker-yard'
  | 'goto-south-dock-pier'
  | 'goto-glassmarket'
  | 'start-salvaging'
  | 'start-fishing'
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
  sceneImage?: string;
  actions: RoomAction[];
};

const panelIcons: Record<Panel, string> = {
  world: '◎',
  inventory: '▣',
  equipment: '♙',
  skills: '▥',
  journal: '▤',
  comms: '◌',
  map: '◆'
};

type EquipmentSlot = 'main_hand' | 'off_hand' | 'head' | 'torso' | 'legs' | 'boots';
type ItemKey = 'salvage_bar' | 'metal_scrap' | 'composite_scrap' | 'uncooked_shrimp' | 'cooked_shrimp' | 'copper_coils' | 'portable_induction_pad' | 'fishing_rod';
type ItemDefinition = { key:ItemKey; name:string; description:string; asset:string; stackable:boolean; usable?:boolean; equipmentSlot?:EquipmentSlot; defense?:number; toolType?:'salvage'; toolTier?:number };
type InventoryEntry = { item:ItemKey; quantity:number } | null;

const ITEM_DEFINITIONS: Record<ItemKey, ItemDefinition> = {
  salvage_bar:{key:'salvage_bar',name:'Powered Salvage Bar',description:'A powered utility breaker for prying, splitting and stripping Tier 1 scrap.',asset:'cyberpunk_salvage_crowbar_tool.png',stackable:false,equipmentSlot:'main_hand',toolType:'salvage',toolTier:1},
  metal_scrap:{key:'metal_scrap',name:'Tier 1 Metal Scrap',description:'Bolts, plates and structural metal recovered from salvage.',asset:'cyberpunk_scrap_metal_pile.png',stackable:true},
  composite_scrap:{key:'composite_scrap',name:'Tier 1 Composite Scrap',description:'Mixed housings, casings and recoverable composite material.',asset:'neon_cyberpunk_scrapyard_heap.png',stackable:true},
  uncooked_shrimp:{key:'uncooked_shrimp',name:'Uncooked Shrimp',description:'Placeholder catch from South Dock Pier. Cooking details coming soon.',asset:'neon_cyberpunk_scrap_pile.png',stackable:true},
  copper_coils:{key:'copper_coils',name:'Copper Coils',description:'Copper wiring coils recovered from a scrap node.',asset:'neon_cyberpunk_scrap_pile.png',stackable:true},
  cooked_shrimp:{key:'cooked_shrimp',name:'Cooked Shrimp',description:'A cooked meal that restores 3 HP when used.',asset:'neon_cyberpunk_scrap_pile.png',stackable:true,usable:true},
  portable_induction_pad:{key:'portable_induction_pad',name:'Portable Induction Pad',description:'Click to cook one Uncooked Shrimp into Cooked Shrimp.',asset:'cyberpunk_salvage_crowbar_tool.png',stackable:false,usable:true},
  fishing_rod:{key:'fishing_rod',name:'Fishing Rod',description:'Equip in Main Hand to fish at South Dock Pier.',asset:'neon_cyberpunk_scrap_pile.png',stackable:false,equipmentSlot:'main_hand'}
};
const EQUIPMENT_SLOTS:Array<[EquipmentSlot,string]>=[['main_hand','Main Hand'],['off_hand','Off Hand'],['head','Head'],['torso','Torso'],['legs','Legs'],['boots','Boots']];
const inventorySlots:InventoryEntry[]=Array.from({length:36},()=>null);
inventorySlots[0]={item:'salvage_bar',quantity:1};
inventorySlots[1]={item:'portable_induction_pad',quantity:1};
inventorySlots[2]={item:'fishing_rod',quantity:1};
const equipment:Record<EquipmentSlot,ItemKey|null>={main_hand:null,off_hand:null,head:null,torso:null,legs:null,boots:null};
let mobileInventoryPage=0;

function derivedDefense(){return Object.values(equipment).reduce((n,k)=>n+(k?(ITEM_DEFINITIONS[k].defense??0):0),0)}
function equippedToolAllows(type:'salvage',tier:number){return Object.values(equipment).some(k=>{if(!k)return false;const i=ITEM_DEFINITIONS[k];return i.toolType===type&&(i.toolTier??0)>=tier})}
function firstEmptyInventorySlot(){return inventorySlots.findIndex(e=>e===null)}
function addInventoryItem(item:ItemKey,quantity=1){const d=ITEM_DEFINITIONS[item];if(d.stackable){const e=inventorySlots.find(x=>x?.item===item);if(e){e.quantity+=quantity;saveCharacterProgress();return true}}const n=firstEmptyInventorySlot();if(n<0)return false;inventorySlots[n]={item,quantity};saveCharacterProgress();return true}
function consumeInventoryItem(index:number){const entry=inventorySlots[index];if(!entry)return false;entry.quantity-=1;if(entry.quantity<=0)inventorySlots[index]=null;saveCharacterProgress();return true}
function transformInventoryItem(index:number,result:ItemKey){const entry=inventorySlots[index];if(!entry)return false;const existing=inventorySlots.find((slot,slotIndex)=>slotIndex!==index&&slot?.item===result);if(existing){existing.quantity+=1;consumeInventoryItem(index);return true}if(entry.quantity===1){inventorySlots[index]={item:result,quantity:1};saveCharacterProgress();return true}const empty=firstEmptyInventorySlot();if(empty<0)return false;entry.quantity-=1;inventorySlots[empty]={item:result,quantity:1};saveCharacterProgress();return true}
function grantSkillXp(skillKey:string,amount:number){let skill=currentSkills.find((entry)=>entry.skill_key===skillKey);if(!skill){skill={skill_key:skillKey,level:1,xp:0};currentSkills.push(skill)}let remaining=amount;while(skill.level<MAX_SKILL_LEVEL){const needed=xpForNextSkillLevel(skill.level)-skill.xp;if(remaining<needed){skill.xp+=remaining;saveCharacterProgress();return}remaining-=needed;skill.level+=1;skill.xp=0}skill.xp=0;saveCharacterProgress()}


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
        label: 'Head to South Dock Pier',
        detail: 'Follow the waterfront route to the pier',
        type: 'goto-south-dock-pier'
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
  },
  'south-dock-pier': {
    id: 'south-dock-pier',
    district: 'South Dock',
    name: 'South Dock Pier',
    slogan: 'SOUTH DOCK WATERFRONT',
    description: 'A quiet stretch of the South Dock waterfront. More details coming soon.',
    actions: [
      {
        label: 'Fish for Uncooked Shrimp',
        detail: 'Cast at the pier and bring in a catch',
        type: 'start-fishing'
      },
      {
        label: 'Return to Glassmarket',
        detail: 'Follow the waterfront route back to the transit concourse',
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
    'Tier 1 Composite Scrap': 0,
    'Uncooked Shrimp': 0,
    'Cooked Shrimp': 0,
    'Copper Coils': 0
  } as Record<string, number>,
  salvage: {
    active: false,
    intervalId: null as number | null,
    xpPerTick: 3,
    requirement: 1,
    remainingTicks: 4,
    maxTicks: 4,
    resetTimeoutId: null as number | null
  },
  fishing: {
    active: false,
    intervalId: null as number | null
  }
};

type StoredCharacterProgress = {
  version: 1;
  inventory: InventoryEntry[];
  equipment: Record<EquipmentSlot, ItemKey | null>;
  skills: CharacterSkill[];
};

let progressSaveQueue: Promise<void> = Promise.resolve();

function legacyCharacterProgressStorageKey() {
  return currentCharacter ? `stray-frequency:character:${currentCharacter.id}:progress` : null;
}

function saveCharacterProgress(): Promise<boolean> {
  const characterId = currentCharacter?.id;
  if (!characterId) return Promise.resolve(false);
  const progress: StoredCharacterProgress = {
    version: 1,
    inventory: inventorySlots.map((entry) => entry ? { ...entry } : null),
    equipment: { ...equipment },
    skills: currentSkills.map((skill) => ({ ...skill }))
  };
  const save = progressSaveQueue.then(async () => {
    const { data, error } = await supabase.from('characters')
      .update({ progress })
      .eq('id', characterId)
      .select('id')
      .maybeSingle();
    if (error || !data) {
      console.error('Could not save character progress to Supabase.', error ?? 'Character row not found.');
      return false;
    }
    if (currentCharacter?.id === characterId) currentCharacter.progress = progress;
    return true;
  });
  progressSaveQueue = save.then(() => undefined, () => undefined);
  return save;
}

function resetCharacterProgress() {
  inventorySlots.fill(null);
  inventorySlots[0] = { item: 'salvage_bar', quantity: 1 };
  inventorySlots[1] = { item: 'portable_induction_pad', quantity: 1 };
  inventorySlots[2] = { item: 'fishing_rod', quantity: 1 };
  for (const [slot] of EQUIPMENT_SLOTS) equipment[slot] = null;
  currentSkills = [];
  for (const key of Object.keys(state.inventory)) state.inventory[key] = 0;
}

function applyCharacterProgress(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<StoredCharacterProgress>;
  if (progress.version !== 1) return false;

  resetCharacterProgress();
  if (Array.isArray(progress.inventory)) {
      inventorySlots.fill(null);
      progress.inventory.slice(0, inventorySlots.length).forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') return;
        const candidate = entry as { item?: unknown; quantity?: unknown };
        if (typeof candidate.item !== 'string' || !Object.prototype.hasOwnProperty.call(ITEM_DEFINITIONS, candidate.item)) return;
        if (!Number.isSafeInteger(candidate.quantity) || Number(candidate.quantity) < 1) return;
        inventorySlots[index] = { item: candidate.item as ItemKey, quantity: Number(candidate.quantity) };
      });
  }

  if (progress.equipment && typeof progress.equipment === 'object') {
    for (const [slot] of EQUIPMENT_SLOTS) {
      const item = progress.equipment[slot];
      equipment[slot] = typeof item === 'string'
        && Object.prototype.hasOwnProperty.call(ITEM_DEFINITIONS, item)
        && ITEM_DEFINITIONS[item as ItemKey].equipmentSlot === slot
        ? item as ItemKey
        : null;
    }
  }

  if (Array.isArray(progress.skills)) {
    const seen = new Set<string>();
    currentSkills = progress.skills.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const candidate = entry as { skill_key?: unknown; level?: unknown; xp?: unknown };
      if (typeof candidate.skill_key !== 'string' || !STARTING_SKILLS.some(([key]) => key === candidate.skill_key)) return [];
      if (seen.has(candidate.skill_key) || typeof candidate.level !== 'number' || !Number.isSafeInteger(candidate.level) || candidate.level < 1 || candidate.level > MAX_SKILL_LEVEL) return [];
      if (typeof candidate.xp !== 'number' || !Number.isSafeInteger(candidate.xp) || candidate.xp < 0 || (candidate.level === MAX_SKILL_LEVEL && candidate.xp > 0) || (candidate.level < MAX_SKILL_LEVEL && candidate.xp >= xpForNextSkillLevel(candidate.level))) return [];
      seen.add(candidate.skill_key);
      return [{ skill_key: candidate.skill_key, level: candidate.level, xp: candidate.xp }];
    });
  }

  for (const key of Object.keys(state.inventory)) state.inventory[key] = 0;
  for (const entry of inventorySlots) {
    if (!entry) continue;
    const itemName = ITEM_DEFINITIONS[entry.item].name;
    if (itemName in state.inventory) state.inventory[itemName] += entry.quantity;
  }
  return true;
}

async function loadCharacterProgress() {
  const characterId = currentCharacter?.id;
  const legacyKey = legacyCharacterProgressStorageKey();
  if (!characterId || !legacyKey) return;
  resetCharacterProgress();

  const { data, error } = await supabase.from('characters').select('progress').eq('id', characterId).maybeSingle();
  if (error) console.warn('Could not load character progress from Supabase.', error);

  let restored = !error && applyCharacterProgress(data?.progress);
  let importedLegacy = false;
  if (!restored) {
    try {
      const raw = localStorage.getItem(legacyKey);
      if (raw) {
        importedLegacy = applyCharacterProgress(JSON.parse(raw));
        restored = importedLegacy;
      }
    } catch (legacyError) {
      console.warn('Could not import legacy local progress.', legacyError);
    }
  }

  if (!restored) resetCharacterProgress();
  if (!error && data?.progress && restored) {
    currentCharacter!.progress = data.progress as StoredCharacterProgress;
    try { localStorage.removeItem(legacyKey); } catch { /* Legacy cleanup is best effort. */ }
    return;
  }

  const saved = await saveCharacterProgress();
  if (saved && importedLegacy) {
    try { localStorage.removeItem(legacyKey); } catch { /* Legacy cleanup is best effort. */ }
  }
}

function asset(path: string) {
  return `${assetBase}assets/${path}`;
}

const CORE_ASSETS = [
  'mara-vale.png', 'glassmarket.png', 'neon_salvage_yard_under_the_overpass.png',
  'neon_cyberpunk_scrap_pile.png', 'cyberpunk_salvage_swing_sprite_sheet.png',
  'cyberpunk_salvage_crowbar_tool.png', 'neon_cyberpunk_scrapyard_heap.png'
];

async function preloadCoreAssets() {
  await Promise.all(CORE_ASSETS.map((path) => new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = asset(path);
  })));
}

const app = document.querySelector<HTMLDivElement>('#app')!;
if (!app) throw new Error('App root missing');


function characterName() {
  return currentCharacter?.name ?? 'Contractor';
}

function escapeGateway(value: string) {
  return value.replace(/[&<>'\"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[character] ?? character));
}

function renderGame() {
function refreshCharacterStats(){const e=document.querySelector<HTMLElement>('#derived-defense');if(e)e.textContent=String(derivedDefense())}
function refreshCharacterHealth(){const e=document.querySelector<HTMLElement>('#character-health');if(e)e.textContent=`${currentCharacter?.health??10}/${currentCharacter?.max_health??10}`}
function equipFromInventory(index:number){const e=inventorySlots[index];if(!e)return;const d=ITEM_DEFINITIONS[e.item];if(!d.equipmentSlot)return;const slot=d.equipmentSlot,old=equipment[slot];if(slot==='main_hand'&&old==='fishing_rod'&&e.item!=='fishing_rod')stopFishing();equipment[slot]=e.item;inventorySlots[index]=old?{item:old,quantity:1}:null;saveCharacterProgress();addLog(old?`${d.name} equipped; ${ITEM_DEFINITIONS[old].name} returned to inventory.`:`${d.name} equipped.`);renderPanel();refreshCharacterStats()}
function unequipToInventory(slot:EquipmentSlot){const k=equipment[slot];if(!k)return;const n=firstEmptyInventorySlot();if(n<0){addLog(`Inventory full. ${ITEM_DEFINITIONS[k].name} remains equipped.`);return}if(slot==='main_hand'&&k==='fishing_rod')stopFishing();inventorySlots[n]={item:k,quantity:1};equipment[slot]=null;saveCharacterProgress();addLog(`${ITEM_DEFINITIONS[k].name} unequipped.`);renderPanel();refreshCharacterStats()}
function inventorySlotMarkup(e:InventoryEntry,index:number){if(!e)return `<button class="inventory-tile empty" type="button" data-inventory-index="${index}" aria-label="Empty inventory slot"></button>`;const i=ITEM_DEFINITIONS[e.item];return `<button class="inventory-tile" type="button" data-inventory-index="${index}" data-use-item="${i.usable?'true':'false'}" data-tooltip="${escapeHtml(`${i.name} — ${i.description}`)}" aria-label="${escapeHtml(i.name)}"><img src="${asset(i.asset)}" alt="" />${e.quantity>1?`<span class="item-quantity">${e.quantity}</span>`:''}</button>`}
function equipmentSlotMarkup(slot:EquipmentSlot,label:string){const k=equipment[slot];if(!k)return `<button class="equipment-slot empty" type="button" data-equipment-slot="${slot}"><span>${label}</span><small>EMPTY</small></button>`;const i=ITEM_DEFINITIONS[k];return `<button class="equipment-slot" type="button" data-equipment-slot="${slot}" data-tooltip="${escapeHtml(`${i.name} — ${i.description}`)}"><span>${label}</span><img src="${asset(i.asset)}" alt="${escapeHtml(i.name)}" /><small>${escapeHtml(i.name)}</small></button>`}
function activateInventoryItem(index:number){const entry=inventorySlots[index];if(!entry)return;if(ITEM_DEFINITIONS[entry.item].equipmentSlot){equipFromInventory(index);return}void useInventoryItem(index)}
async function useInventoryItem(index:number){const entry=inventorySlots[index];if(!entry)return;if(entry.item==='portable_induction_pad'){const rawIndex=inventorySlots.findIndex((slot)=>slot?.item==='uncooked_shrimp');if(rawIndex<0){addLog('No Uncooked Shrimp to cook.');return}if(!transformInventoryItem(rawIndex,'cooked_shrimp')){addLog('Inventory full. There is no room for Cooked Shrimp.');return}state.inventory['Uncooked Shrimp']-=1;state.inventory['Cooked Shrimp']+=1;grantSkillXp('cooking',3);addLog('Portable Induction Pad cooked 1 Uncooked Shrimp. +3 Cooking XP.');renderPanel();return}if(entry.item==='cooked_shrimp'){const health=currentCharacter?.health??10,maxHealth=currentCharacter?.max_health??10;if(health>=maxHealth){addLog('HP is already full. Cooked Shrimp was not used.');return}consumeInventoryItem(index);state.inventory['Cooked Shrimp']-=1;const newHealth=Math.min(maxHealth,health+3);if(currentCharacter)currentCharacter.health=newHealth;refreshCharacterHealth();addLog(`Cooked Shrimp restored ${newHealth-health} HP.`);renderPanel();if(currentCharacter){const {error}=await supabase.from('characters').update({health:newHealth}).eq('id',currentCharacter.id);if(error)addLog('HP updated locally but could not be saved.')}}}

/*
 * LOCKED GAME SHELL: do not rearrange the .game-shell structural markup.
 * New systems populate existing regions/panels unless the owner explicitly unlocks it.
 */
app.innerHTML = `
  <div class="game-shell">
    <header class="masthead">
      <section class="character-card panel" aria-label="Character summary">
        <img src="${asset('mara-vale.png')}" alt="Pixel portrait of Mara Vale" class="portrait" />
        <div class="character-copy">
          <div class="eyebrow">PLAYER</div>
          <h2>${escapeHtml(characterName())}</h2>
          <p class="muted">Unregistered Contractor</p>
        </div>
        <div class="quick-stats" aria-label="Quick stats">
          <div><span class="stat-icon hp">♥</span><strong id="character-health">${currentCharacter?.health ?? 10}/${currentCharacter?.max_health ?? 10}</strong><small>HP</small></div>
          <div><span class="stat-icon focus">◆</span><strong id="derived-defense">${derivedDefense()}</strong><small>Defense</small></div>
          <div><span class="stat-icon credits">¢</span><strong>${currentCharacter?.credits ?? 0}</strong><small>Credits</small></div>
        </div>
        <button id="logout-button" class="sf-logout character-logout" type="button">LOG OUT</button>
      </section>

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

        <nav class="rune-menu rune-menu-top panel" aria-label="Primary game menu">
          ${(['world', 'inventory', 'equipment', 'skills', 'journal'] as Panel[]).map((panel) => `
            <button type="button" data-panel="${panel}" class="${panel === 'world' ? 'active' : ''}">
              <span class="menu-icon">${panelIcons[panel]}</span><small>${panel.toUpperCase()}</small>
            </button>`).join('')}
        </nav>
        <section class="active-panel panel" id="active-panel" aria-live="polite"></section>
        <nav class="rune-menu rune-menu-bottom panel" aria-label="Secondary game menu">
          ${(['comms', 'map'] as Panel[]).map((panel) => `
            <button type="button" data-panel="${panel}">
              <span class="menu-icon">${panelIcons[panel]}</span><small>${panel.toUpperCase()}</small>
            </button>`).join('')}
        </nav>
      </aside>
    </main>
  </div>
  <dialog class="skill-details-dialog" id="skill-details-dialog" aria-labelledby="skill-details-title"></dialog>
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
  if (!marker) return;
  marker.setAttribute('d', state.roomId === 'glassmarket'
    ? 'M154 75 166 98 142 98Z'
    : state.roomId === 'breaker-yard'
      ? 'M224 122 236 145 212 145Z'
      : 'M272 57 284 80 260 80Z');
}

function renderScene() {
  const room = getCurrentRoom();
  const target = document.querySelector<HTMLElement>('#scene-wrap');
  if (!target) return;

  if (room.id === 'glassmarket') {
    target.innerHTML = `
      <div class="scene-stage glassmarket-stage">
        <img src="${asset(room.sceneImage ?? '')}" alt="Pixel art view of the rainy Glassmarket Transit Concourse" class="scene scene-image" />
        <div class="scene-tag scene-tag-left">UNDERPASS<br><small>BREAKER YARD 12</small></div>
        <div class="scene-tag scene-tag-right">DEPARTURES<br><small>PLATFORM 4</small></div>
      </div>`;
  } else if (room.id === 'breaker-yard') {
    const remaining = state.salvage.remainingTicks;
    const depleted = remaining <= 0;
    target.innerHTML = `
      <div class="scene-stage breaker-stage asset-breaker-stage">
        <img src="${asset(room.sceneImage ?? '')}" alt="Pixel art view of Breaker Yard 12 beneath the overpass" class="scene scene-image" />
        <div class="scrap-node asset-scrap-node ${depleted ? 'depleted' : ''}" id="scrap-node">
          <div class="node-label">TIER 1 SCRAP</div>
          <img src="${asset('neon_cyberpunk_scrap_pile.png')}" alt="Tier 1 scrap node" />
          <div class="node-count">${depleted ? 'PICKED CLEAN' : `${remaining} salvage pulls left`}</div>
        </div>
        <div class="mara-anchor asset-mara-anchor ${state.salvage.active ? 'visible' : ''}" id="mara-anchor">
          <div class="xp-layer" id="xp-layer"></div>
          <div class="mara-nameplate">${characterName()}</div>
          <div class="asset-mara-sprite ${state.salvage.active ? 'salvaging' : ''}" aria-hidden="true"></div>
        </div>
        <div class="scene-tag scene-tag-left">SALVAGE LOT<br><small>PERSONAL DEMO NODE</small></div>
        <div class="scene-tag scene-tag-right">SOUTH DOCK<br><small>BREAKER YARD 12</small></div>
      </div>`;
  } else {
    target.innerHTML = `
      <div class="scene-stage pier-stage">
        <div class="pier-waterline" aria-hidden="true"></div>
        <div class="scrap-node asset-scrap-node" id="fishing-node">
          <div class="node-label">FISHING SPOT</div>
          <img src="${asset('neon_cyberpunk_scrap_pile.png')}" alt="Placeholder fishing spot" />
          <div class="node-count">${state.fishing.active ? 'FISHING' : 'READY'}</div>
        </div>
        <div class="mara-anchor asset-mara-anchor ${state.fishing.active ? 'visible' : ''}" id="mara-anchor">
          <div class="xp-layer" id="xp-layer"></div>
          <div class="mara-nameplate">${characterName()}</div>
          <div class="asset-mara-sprite ${state.fishing.active ? 'salvaging' : ''}" aria-hidden="true"></div>
        </div>
        <div class="scene-tag scene-tag-left">SOUTH DOCK<br><small>WATERFRONT</small></div>
        <div class="scene-tag scene-tag-right">PIER<br><small>FISHING DEMO</small></div>
      </div>`;
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
              detail = `${characterName()} is already salvaging this node`;
            } else if (state.salvage.remainingTicks <= 0) {
              disabled = true;
              detail = 'This node has been picked clean';
            }
          } else if (action.type === 'start-fishing') {
            if (state.fishing.active) {
              disabled = true;
              detail = `${characterName()} is already fishing`;
            } else if (equipment.main_hand !== 'fishing_rod') {
              disabled = true;
              detail = 'Equip the Fishing Rod in Main Hand to fish';
            }
          }

          return `
            <button type="button" data-action="${action.type}" ${disabled ? 'disabled' : ''}>
              <span>${action.type === 'start-salvaging' ? '⛭' : action.type === 'start-fishing' ? '≈' : action.type === 'goto-breaker-yard' || action.type === 'goto-south-dock-pier' ? '↗' : action.type === 'goto-glassmarket' ? '↙' : '⌕'}</span>
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
      : room.id === 'south-dock-pier'
        ? `
        <div class="panel-kicker">CURRENT LOCATION</div>
        <h3>${room.name}</h3>
        <p>${room.description}</p>
        ${worldActionsMarkup(room.actions)}
        <div class="gather-summary">
          <div class="summary-card"><span>Gathering node</span><strong>Fishing spot</strong></div>
          <div class="summary-card"><span>Node status</span><strong>Unlimited</strong></div>
          <div class="summary-card"><span>Yield rule</span><strong>100% Uncooked Shrimp</strong></div>
        </div>
      `
        : `
        <div class="panel-kicker">CURRENT LOCATION</div>
        <h3>${room.name}</h3>
        <p>${room.description}</p>
        ${worldActionsMarkup(room.actions)}

        <div class="gather-summary">
          <div class="summary-card">
            <span>Gathering node</span>
            <strong>Tier 1 Scrap</strong>
          </div>
          <div class="summary-card">
            <span>Pulls left</span>
            <strong>${state.salvage.remainingTicks}</strong>
          </div>
          <div class="summary-card">
            <span>Requires</span>
            <strong>Salvaging ${state.salvage.requirement}</strong>
          </div>
          <div class="summary-card">
            <span>Yield rule</span>
            <strong>30% metal / 30% composite / 40% copper coils</strong>
          </div>
        </div>

        <div class="asset-resource-grid">
          <div class="asset-resource-card">
            <img src="${asset('cyberpunk_scrap_metal_pile.png')}" alt="Tier 1 Metal Scrap" />
            <div>
              <strong>Tier 1 Metal Scrap</strong>
              <small>Bolts, plates and structural metal recovered from salvage.</small>
              <em>Owned: ${state.inventory['Tier 1 Metal Scrap']}</em>
            </div>
          </div>
          <div class="asset-resource-card">
            <img src="${asset('neon_cyberpunk_scrapyard_heap.png')}" alt="Tier 1 Composite Scrap" />
            <div>
              <strong>Tier 1 Composite Scrap</strong>
              <small>Mixed housings, tubing, casings and recoverable composite parts.</small>
              <em>Owned: ${state.inventory['Tier 1 Composite Scrap']}</em>
            </div>
          </div>
        </div>

        <button class="node-reset" type="button" data-action="reset-node">Reset demo node</button>
      `;

  const mobileInventory=window.matchMedia('(max-width: 820px)').matches;
  const inventoryStart=mobileInventory?mobileInventoryPage*12:0, inventoryEnd=mobileInventory?inventoryStart+12:inventorySlots.length;
  const inventoryContent = `<div class="panel-kicker">INVENTORY</div><div class="inventory-heading"><h3>36 Slots</h3><span>${inventorySlots.filter(Boolean).length}/36 USED</span></div><div class="inventory-tiles">${inventorySlots.slice(inventoryStart,inventoryEnd).map((entry,offset)=>inventorySlotMarkup(entry,inventoryStart+offset)).join('')}</div><div class="mobile-inventory-pages"><button type="button" data-inventory-page="-1">‹</button><span>PAGE ${mobileInventoryPage+1} / 3</span><button type="button" data-inventory-page="1">›</button></div><div class="touch-item-detail" id="touch-item-detail">Tap = use/equip · Hold = inspect · Drag = move</div><p class="inventory-hint">Desktop: hover for details, double-click to equip.</p>`;
  const equipmentContent = `
    <div class="panel-kicker">EQUIPMENT</div><h3>Equipped Gear</h3>
    <div class="equipment-grid">${EQUIPMENT_SLOTS.map(([slot,label])=>equipmentSlotMarkup(slot,label)).join('')}</div>
    <div class="derived-stats"><span>Equipment Defense</span><strong>${derivedDefense()}</strong></div>
    <div class="touch-item-detail" id="touch-item-detail">Tap equipped gear for details · Double-tap to unequip</div>
    <p class="inventory-hint">Desktop: hover for details, double-click to unequip.</p>`;

  const skillsContent = `<div class="panel-kicker">SKILLS</div><h3>Capability</h3><div class="skill-tiles">${STARTING_SKILLS.map(([key,name])=>{const skill=currentSkills.find(s=>s.skill_key===key);const level=skill?.level??1,xp=skill?.xp??0,next=xpForNextSkillLevel(level);const tip=level>=MAX_SKILL_LEVEL?`${name} — Level ${level}/${MAX_SKILL_LEVEL} — MAX LEVEL`:`${name} — Level ${level}/${MAX_SKILL_LEVEL} — XP ${xp} / ${next} to next level`;return `<button type="button" class="skill-tile" data-skill="${key}" data-tooltip="${escapeHtml(tip)}" aria-haspopup="dialog" aria-controls="skill-details-dialog"><span class="skill-icon">${SKILL_ICONS[key]}</span><span class="skill-name">${name}</span><strong>${level}<small>/${MAX_SKILL_LEVEL}</small></strong></button>`;}).join('')}</div>`;
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
    equipment: equipmentContent,
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

  const showTouchDetail=(button:HTMLButtonElement)=>{const d=target.querySelector<HTMLElement>('#touch-item-detail');if(d&&button.dataset.tooltip)d.textContent=button.dataset.tooltip};
  const moveInventoryItem=(from:number,to:number)=>{if(from===to||from<0||to<0||from>=36||to>=36)return;const moving=inventorySlots[from];if(!moving)return;const displaced=inventorySlots[to];inventorySlots[to]=moving;inventorySlots[from]=displaced;saveCharacterProgress();renderPanel()};
  const bindItemInteraction=(button:HTMLButtonElement,action:()=>void)=>{let timer:number|null=null,startX=0,startY=0,dragging=false,held=false,handledTouch=false;const index=Number(button.dataset.inventoryIndex);button.addEventListener('click',()=>{if(button.dataset.useItem!=='true')return;if(handledTouch){handledTouch=false;return}action()});button.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;startX=e.clientX;startY=e.clientY;dragging=false;held=false;timer=window.setTimeout(()=>{held=true;showTouchDetail(button);button.classList.add('inspecting')},475)});button.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')return;if(Math.hypot(e.clientX-startX,e.clientY-startY)>10){if(timer!==null)clearTimeout(timer);timer=null;dragging=true;button.classList.add('touch-dragging')}});button.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')return;if(timer!==null)clearTimeout(timer);timer=null;button.classList.remove('inspecting','touch-dragging');if(held)return;if(dragging&&Number.isInteger(index)){const drop=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLButtonElement>('[data-inventory-index]');const to=drop?Number(drop.dataset.inventoryIndex):NaN;if(Number.isInteger(to))moveInventoryItem(index,to);return}if(button.dataset.useItem==='true'){handledTouch=true;window.setTimeout(()=>{handledTouch=false},0)}action()});button.addEventListener('pointercancel',()=>{if(timer!==null)clearTimeout(timer);timer=null;button.classList.remove('inspecting','touch-dragging')});button.addEventListener('dblclick',e=>{e.preventDefault();if(button.dataset.useItem!=='true')action()})};
  target.querySelectorAll<HTMLButtonElement>('[data-inventory-index]').forEach(button=>{const i=Number(button.dataset.inventoryIndex);if(Number.isInteger(i)&&inventorySlots[i])bindItemInteraction(button,()=>activateInventoryItem(i))});
  target.querySelectorAll<HTMLButtonElement>('[data-equipment-slot]').forEach(button=>{const slot=button.dataset.equipmentSlot as EquipmentSlot|undefined;if(slot&&equipment[slot])bindItemInteraction(button,()=>unequipToInventory(slot))});
  target.querySelectorAll<HTMLButtonElement>('[data-inventory-page]').forEach(button=>button.addEventListener('click',()=>{mobileInventoryPage=(mobileInventoryPage+Number(button.dataset.inventoryPage)+3)%3;renderPanel()}));
}

function openSkillDetails(skillKey: string) {
  const skillEntry = STARTING_SKILLS.find(([key]) => key === skillKey);
  const dialog = document.querySelector<HTMLDialogElement>('#skill-details-dialog');
  if (!skillEntry || !dialog) return;

  const [key, name] = skillEntry;
  const skill = currentSkills.find((entry) => entry.skill_key === key);
  const level = Math.min(MAX_SKILL_LEVEL, skill?.level ?? 1);
  const xp = skill?.xp ?? 0;
  const nextLevelXp = xpForNextSkillLevel(level);
  const progress = nextLevelXp ? Math.max(0, Math.min(100, xp / nextLevelXp * 100)) : 100;
  const unlocks = SKILL_UNLOCK_LEVELS.map((unlockLevel) => `
    <li class="skill-unlock ${level >= unlockLevel ? 'reached' : ''}">
      <span class="skill-unlock-level">LV ${unlockLevel}</span>
      <span class="skill-unlock-dot" aria-hidden="true"></span>
      <div><strong>${level >= unlockLevel ? 'REACHED' : 'LOCKED'}</strong><p>Placeholder reward details to be defined.</p></div>
    </li>`).join('');

  dialog.innerHTML = `
    <header class="skill-details-header">
      <div><div class="panel-kicker">SKILL DETAILS · PLACEHOLDER</div><h2 id="skill-details-title">${escapeHtml(name)}</h2></div>
      <button class="skill-details-close" type="button" data-close-skill-details aria-label="Close skill details">×</button>
    </header>
    <p class="skill-details-description">${escapeHtml(SKILL_DESCRIPTIONS[key] ?? 'Placeholder skill description.')}</p>
    <section class="skill-details-progress" aria-label="Skill progress">
      <div class="skill-details-progress-label"><strong>LEVEL ${level}</strong><span>${level >= MAX_SKILL_LEVEL ? 'MAX LEVEL' : `${xp} / ${nextLevelXp} XP TO NEXT LEVEL`}</span></div>
      <div class="skill-details-xp-track" role="progressbar" aria-label="Experience progress to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><span style="width:${progress}%"></span></div>
    </section>
    <h3 class="skill-unlocks-heading">LEVEL UNLOCKS</h3>
    <p class="skill-placeholder-note">Unlock levels and rewards are placeholders for now.</p>
    <ol class="skill-unlocks">${unlocks}</ol>
  `;
  dialog.showModal();
  dialog.querySelector<HTMLButtonElement>('.skill-details-close')?.focus();
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
      stopFishing();
      state.roomId = 'breaker-yard';
      addLog('You head through the service underpass to Breaker Yard 12.');
      renderAll();
      return;

    case 'goto-south-dock-pier':
      stopSalvaging(false);
      stopFishing();
      state.roomId = 'south-dock-pier';
      addLog('You follow the waterfront route to South Dock Pier.');
      renderAll();
      return;

    case 'goto-glassmarket':
      stopSalvaging(false);
      stopFishing();
      state.roomId = 'glassmarket';
      addLog('You return to Glassmarket.');
      renderAll();
      return;

    case 'start-salvaging':
      startSalvaging();
      return;

    case 'start-fishing':
      startFishing();
      return;

    case 'reset-node':
      stopSalvaging(false);
      if (state.salvage.resetTimeoutId !== null) {
        clearTimeout(state.salvage.resetTimeoutId);
        state.salvage.resetTimeoutId = null;
      }
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
  if (!equippedToolAllows('salvage',1)) { addLog('A Tier 1 salvage tool must be equipped in Main Hand to work this node.'); return; }
  state.salvage.active = true;
  addLog(`${characterName()} steps into the bay and starts salvaging the node.`);
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

function startFishing() {
  if (state.roomId !== 'south-dock-pier') return;
  if (state.fishing.active) return;
  if (equipment.main_hand !== 'fishing_rod') {
    addLog('Equip the Fishing Rod in Main Hand before fishing.');
    return;
  }
  state.fishing.active = true;
  addLog(`${characterName()} starts fishing at South Dock Pier.`);
  renderAll();

  state.fishing.intervalId = window.setInterval(() => {
    runFishingTick();
  }, 1200);
}

function stopFishing() {
  const wasActive = state.fishing.active;
  if (state.fishing.intervalId !== null) {
    clearInterval(state.fishing.intervalId);
    state.fishing.intervalId = null;
  }

  state.fishing.active = false;
  if (wasActive) renderScene();
}

function runSalvageTick() {
  if (!state.salvage.active) return;

  if (state.salvage.remainingTicks <= 0) {
    stopSalvaging(true);
    renderAll();
    return;
  }

  state.salvage.remainingTicks -= 1;

  const roll = Math.random();
  const itemKey: ItemKey = roll < 0.3 ? 'metal_scrap' : roll < 0.6 ? 'composite_scrap' : 'copper_coils';
  const resource = ITEM_DEFINITIONS[itemKey].name;
  if(!addInventoryItem(itemKey,1)){stopSalvaging(false);addLog('Inventory full. Salvaging stops.');renderAll();return}
  state.inventory[resource] += 1;
  grantSkillXp('salvaging', 3);

  const finalTick = state.salvage.remainingTicks <= 0;
  if (finalTick) {
    stopSalvaging(false);
    state.salvage.resetTimeoutId = window.setTimeout(() => {
      state.salvage.resetTimeoutId = null;
      state.salvage.remainingTicks = state.salvage.maxTicks;
      addLog('The scrap node has replenished.');
      renderAll();
    }, 5000);
    addLog('The scrap node is depleted. It will replenish in 5 seconds.');
  }
  addLog(`+${state.salvage.xpPerTick} Salvaging XP · ${resource} collected.`);
  renderScene();
  renderPanel();
  renderLog();
  spawnXpPopup(`+${state.salvage.xpPerTick} XP`);
}

function runFishingTick() {
  if (!state.fishing.active) return;

  if (!addInventoryItem('uncooked_shrimp', 1)) {
    stopFishing();
    addLog('Inventory full. Fishing stops.');
    renderAll();
    return;
  }

  state.inventory['Uncooked Shrimp'] += 1;
  grantSkillXp('fishing', 3);

  addLog('Uncooked Shrimp collected. +3 Fishing XP.');
  renderScene();
  renderPanel();
  renderLog();
  spawnXpPopup('+1 Uncooked Shrimp');
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
  addLog(`${characterName()}: ${value}`);
  input.value = '';
});

document.querySelector<HTMLElement>('#active-panel')?.addEventListener('click', (event) => {
  const tile = (event.target as HTMLElement).closest<HTMLButtonElement>('.skill-tile[data-skill]');
  if (tile?.dataset.skill) openSkillDetails(tile.dataset.skill);
});

document.querySelector<HTMLDialogElement>('#skill-details-dialog')?.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('[data-close-skill-details]')) {
    (event.currentTarget as HTMLDialogElement).close();
  }
});

renderAll();

document.querySelector<HTMLButtonElement>('#logout-button')?.addEventListener('click', async () => {
  stopSalvaging(false);
  stopFishing();
  await supabase.auth.signOut();
});
}

function renderAuth(message = '') {
  app.innerHTML = `
    <main class="gateway-shell"><section class="gateway-card panel">
      <div class="gateway-brand"><span>STRAY</span> <b>FREQUENCY</b></div>
      <p class="gateway-tagline">some places never log off</p>
      <div class="gateway-tabs">
        <button id="login-tab" class="active" type="button">LOG IN</button>
        <button id="register-tab" type="button">CREATE ACCOUNT</button>
      </div>
      <form id="auth-form" class="gateway-form">
        <label>EMAIL<input id="auth-email" type="email" autocomplete="email" required /></label>
        <label>PASSWORD<input id="auth-password" type="password" autocomplete="current-password" minlength="6" required /></label>
        <label id="confirm-password-row" hidden>CONFIRM PASSWORD<input id="auth-confirm-password" type="password" autocomplete="new-password" minlength="6" /></label>
        <label class="password-toggle"><input id="show-password" type="checkbox" /><span>SHOW PASSWORD</span></label>
        <button id="auth-submit" class="gateway-primary" type="submit">LOG IN</button>
      </form>
      <p id="auth-message" class="gateway-message">${escapeGateway(message)}</p>
    </section></main>`;

  let mode: 'login' | 'register' = 'login';
  const loginTab = document.querySelector<HTMLButtonElement>('#login-tab')!;
  const registerTab = document.querySelector<HTMLButtonElement>('#register-tab')!;
  const submit = document.querySelector<HTMLButtonElement>('#auth-submit')!;
  const password = document.querySelector<HTMLInputElement>('#auth-password')!;
  const confirmRow = document.querySelector<HTMLElement>('#confirm-password-row')!;
  const confirmPassword = document.querySelector<HTMLInputElement>('#auth-confirm-password')!;
  const showPassword = document.querySelector<HTMLInputElement>('#show-password')!;
  const messageNode = document.querySelector<HTMLElement>('#auth-message')!;

  const setMode = (next: 'login' | 'register') => {
    mode = next;
    const registering = mode === 'register';
    loginTab.classList.toggle('active', !registering);
    registerTab.classList.toggle('active', registering);
    submit.textContent = registering ? 'CREATE ACCOUNT' : 'LOG IN';
    confirmRow.hidden = !registering;
    confirmPassword.required = registering;
    password.autocomplete = registering ? 'new-password' : 'current-password';
    confirmPassword.value = '';
    messageNode.textContent = '';
  };

  loginTab.addEventListener('click', () => setMode('login'));
  registerTab.addEventListener('click', () => setMode('register'));
  showPassword.addEventListener('change', () => {
    const type = showPassword.checked ? 'text' : 'password';
    password.type = type; confirmPassword.type = type;
  });

  document.querySelector<HTMLFormElement>('#auth-form')!.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.querySelector<HTMLInputElement>('#auth-email')!.value.trim();
    const passwordValue = password.value;
    if (mode === 'register' && passwordValue !== confirmPassword.value) {
      messageNode.textContent = 'Passwords do not match. Check both entries and try again.';
      confirmPassword.focus(); return;
    }
    submit.disabled = true;
    messageNode.textContent = mode === 'register' ? 'Creating account…' : 'Signing in…';

    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({ email, password: passwordValue });
      if (error) { messageNode.textContent = error.message; submit.disabled = false; return; }
      if (!data.session) {
        setMode('login');
        messageNode.textContent = 'Account created. Check your email to verify it, then log in.';
        submit.disabled = false; return;
      }
      currentUser = data.user; await routeAuthenticatedUser(); return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: passwordValue });
    if (error) { messageNode.textContent = error.message; submit.disabled = false; return; }
    currentUser = data.user; await routeAuthenticatedUser();
  });
}

function renderCharacterCreation(message = '') {
  app.innerHTML = `
    <main class="gateway-shell">
      <section class="creator-card panel">
        <div class="gateway-brand"><span>STRAY</span> <b>FREQUENCY</b></div>
        <div class="panel-kicker">CHARACTER CREATION // PROTOTYPE</div>
        <h1>Who answers the frequency?</h1>
        <div class="creator-grid">
          <div class="creator-preview">
            <img src="${asset('mara-vale.png')}" alt="Temporary character placeholder portrait" />
            <strong>PLACEHOLDER VISUAL</strong>
            <small>Mara's artwork is standing in until modular character assets are ready. This does not make Mara your character.</small>
          </div>
          <form id="character-form" class="gateway-form">
            <label>CHARACTER NAME<input id="character-name" type="text" required minlength="3" maxlength="24" autocomplete="off" /></label>
            <fieldset>
              <legend>BODY TYPE</legend>
              <label class="creator-choice"><input type="radio" name="body-type" value="female" checked /> FEMALE</label>
              <label class="creator-choice"><input type="radio" name="body-type" value="male" /> MALE</label>
            </fieldset>
            <div class="creator-disabled"><span>APPEARANCE</span><strong>COMING LATER</strong><small>Hair, face, clothing and visual customisation will plug into this stage.</small></div>
            <button class="gateway-primary" type="submit">SKIP APPEARANCE & ENTER CITY</button>
            <button class="gateway-secondary" id="creator-signout" type="button">LOG OUT</button>
          </form>
        </div>
        <p id="gateway-message" class="gateway-message">${escapeGateway(message)}</p>
      </section>
    </main>`;

  document.querySelector<HTMLButtonElement>('#creator-signout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
  });

  document.querySelector<HTMLFormElement>('#character-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    const name = (document.querySelector('#character-name') as HTMLInputElement).value.trim();
    const bodyType = document.querySelector<HTMLInputElement>('input[name="body-type"]:checked')?.value as 'male' | 'female';
    const messageNode = document.querySelector<HTMLElement>('#gateway-message');
    if (messageNode) messageNode.textContent = 'Registering character…';

    const { data, error } = await supabase.from('characters').insert({
      account_id: currentUser.id,
      name,
      body_type: bodyType,
      appearance_skipped: true
    }).select().single();

    if (error) {
      if (messageNode) messageNode.textContent = error.message;
      return;
    }
    currentCharacter = data as Character;
    await loadCharacterProgress();
    state.roomId = currentCharacter.location_id === 'breaker-yard' ? 'breaker-yard' : 'glassmarket';
    renderGame();
  });
}

async function routeAuthenticatedUser() {
  if (!currentUser) {
    renderAuth();
    return;
  }
  const { data, error } = await supabase.from('characters').select('*').eq('account_id', currentUser.id).maybeSingle();
  if (error) {
    app.innerHTML = `<main class="gateway-shell"><section class="gateway-card panel"><div class="gateway-brand"><span>STRAY</span> <b>FREQUENCY</b></div><p class="gateway-message">Character lookup failed: ${escapeGateway(error.message)}</p><button id="retry-auth" class="gateway-primary" type="button">RETRY</button></section></main>`;
    document.querySelector<HTMLButtonElement>('#retry-auth')?.addEventListener('click', () => void routeAuthenticatedUser());
    return;
  }
  if (!data) {
    renderCharacterCreation();
    return;
  }
  currentCharacter = data as Character;
  await loadCharacterProgress();
  state.roomId = currentCharacter.location_id === 'breaker-yard' ? 'breaker-yard' : 'glassmarket';
  renderGame();
}

async function bootstrap() {
  app.innerHTML = `<main class="gateway-shell"><section class="gateway-card panel"><div class="gateway-brand"><span>STRAY</span> <b>FREQUENCY</b></div><p class="gateway-message">Tuning frequency…</p></section></main>`;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    renderAuth(error.message);
    return;
  }
  currentUser = data.session?.user ?? null;
  if (currentUser) await routeAuthenticatedUser(); else renderAuth();

  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    if (event === 'SIGNED_OUT' || !currentUser) {
      currentCharacter = null;
      renderAuth();
    }
  });
}

void bootstrap();
