import { ASSET_CSS_VARIABLES } from '../core/assets';
import { gameState } from '../core/state';
import type { Panel } from '../core/types';
import { getRoom } from '../data/rooms';
import { hasDeveloperAccess } from '../services/supabase';
import { characterCardMarkup } from './character-card';
import { applyUILayout, loadUILayout, resetUILayout, saveUILayout, type UILayout } from './layout';

const PANEL_ICONS:Record<Panel,string>={world:'◎',inventory:'▣',equipment:'♙',skills:'▥',journal:'▤',comms:'◌',map:'◆',nearby:'♟'};
const ALL_PANELS:Panel[]=['world','inventory','equipment','skills','journal','comms','map','nearby'];
const PRIMARY_PANELS:Panel[]=['world','inventory','equipment','skills','journal'];
const SECONDARY_PANELS:Panel[]=['comms','map','nearby'];
const COMPACT='(orientation: landscape) and (max-height: 700px) and (any-pointer: coarse)';
const HUD_KEY='stray-frequency.compact-landscape-layout.v2';
type HudPos={x:number;y:number};
type HudLayout={tabs:HudPos;status:HudPos;chat:HudPos;bar:'top'|'bottom'};
const HUD_DEFAULT:HudLayout={tabs:{x:.62,y:.16},status:{x:.79,y:.02},chat:{x:.02,y:.58},bar:'bottom'};

function menuMarkup(panels:Panel[]):string{return panels.map(panel=>`<button type="button" data-panel="${panel}" class="${panel==='world'?'active':''}"><span class="menu-icon">${PANEL_ICONS[panel]}</span><small>${panel.toUpperCase()}</small></button>`).join('');}
function loadHud():HudLayout{try{const x=JSON.parse(localStorage.getItem(HUD_KEY)||'null');return x&&x.tabs&&x.status&&x.chat?x:structuredClone(HUD_DEFAULT);}catch{return structuredClone(HUD_DEFAULT);}}
function saveHud(v:HudLayout){localStorage.setItem(HUD_KEY,JSON.stringify(v));}
function clamp01(n:number){return Math.max(0,Math.min(1,n));}
function barBounds(){
 const app=document.querySelector<HTMLElement>('#app'),bar=document.querySelector<HTMLElement>('.global-bar');
 const h=bar?.getBoundingClientRect().height||0;
 return app?.dataset.compactBar==='top'?{top:h,bottom:innerHeight}:{top:0,bottom:innerHeight-h};
}
function clampElement(el:HTMLElement){
 const b=barBounds(),r=el.getBoundingClientRect(),w=r.width,h=r.height;
 const x=Math.max(0,Math.min(Math.max(0,innerWidth-w),r.left));
 const y=Math.max(b.top,Math.min(Math.max(b.top,b.bottom-h),r.top));
 el.style.left=`${x}px`;el.style.top=`${y}px`;el.style.right='auto';el.style.bottom='auto';
 return {x,y};
}
function clampAll(){
 if(!matchMedia(COMPACT).matches)return;
 ['.tab-stack','.character-card','.chat'].forEach(sel=>{const el=document.querySelector<HTMLElement>(sel);if(el)clampElement(el);});
}
function applyHud(v:HudLayout){
 const app=document.querySelector<HTMLElement>('#app');if(!app)return;
 app.dataset.compactBar=v.bar;
 const map:[string,HudPos][]=[['.tab-stack',v.tabs],['.character-card',v.status],['.chat',v.chat]];
 map.forEach(([sel,p])=>{const el=document.querySelector<HTMLElement>(sel);if(!el)return;el.style.left=`${p.x*innerWidth}px`;el.style.top=`${p.y*innerHeight}px`;el.style.right='auto';el.style.bottom='auto';});
 requestAnimationFrame(clampAll);
}
function bindHudDrag(get:()=>HudLayout,set:(v:HudLayout)=>void){
 const app=document.querySelector<HTMLElement>('#app');if(!app)return;
 const bind=(sel:string,key:'tabs'|'status'|'chat')=>{const el=document.querySelector<HTMLElement>(sel);if(!el)return;let sx=0,sy=0,ox=0,oy=0;
  el.addEventListener('pointerdown',e=>{if(!app.classList.contains('layout-editing')||!(e.target as HTMLElement).closest('.hud-drag-handle'))return;const r=el.getBoundingClientRect();sx=e.clientX;sy=e.clientY;ox=r.left;oy=r.top;el.setPointerCapture(e.pointerId);e.preventDefault();});
  el.addEventListener('pointermove',e=>{if(!el.hasPointerCapture(e.pointerId))return;el.style.left=`${ox+e.clientX-sx}px`;el.style.top=`${oy+e.clientY-sy}px`;clampElement(el);});
  el.addEventListener('pointerup',e=>{if(!el.hasPointerCapture(e.pointerId))return;el.releasePointerCapture(e.pointerId);const p=clampElement(el),v=get();v[key]={x:clamp01(p.x/innerWidth),y:clamp01(p.y/innerHeight)};set(v);});
 };
 bind('.tab-stack','tabs');bind('.character-card','status');bind('.chat','chat');
}
function bindLayoutEditor():void{
 const app=document.querySelector<HTMLElement>('#app'),edit=document.querySelector<HTMLButtonElement>('#edit-layout-button'),controls=document.querySelector<HTMLElement>('#layout-edit-controls');if(!app||!edit||!controls)return;
 let layout=loadUILayout(),hud=loadHud();applyUILayout(layout);applyHud(hud);
 const compact=()=>matchMedia(COMPACT).matches;
 const editing=(on:boolean)=>{app.classList.toggle('layout-editing',on);controls.hidden=!on;edit.textContent=on?'LOCK LAYOUT':'EDIT LAYOUT';edit.setAttribute('aria-pressed',String(on));};
 const update=(patch:Partial<UILayout>)=>{layout={...layout,...patch};saveUILayout(layout);applyUILayout(layout);};
 edit.addEventListener('click',()=>editing(!app.classList.contains('layout-editing')));
 controls.querySelector<HTMLButtonElement>('[data-layout-action="bar"]')?.addEventListener('click',()=>{if(compact()){hud.bar=hud.bar==='bottom'?'top':'bottom';saveHud(hud);applyHud(hud);requestAnimationFrame(clampAll);}else update({barPosition:layout.barPosition==='bottom'?'top':'bottom'});});
 controls.querySelector<HTMLButtonElement>('[data-layout-action="sidebar"]')?.addEventListener('click',()=>{if(!compact())update({sidebarSide:layout.sidebarSide==='right'?'left':'right'});});
 controls.querySelector<HTMLButtonElement>('[data-layout-action="main"]')?.addEventListener('click',()=>{if(!compact())update({mainOrder:layout.mainOrder==='scene-chat'?'chat-scene':'scene-chat'});});
 controls.querySelector<HTMLButtonElement>('[data-layout-action="sidebar-order"]')?.addEventListener('click',()=>{if(!compact())update({sidebarOrder:layout.sidebarOrder==='character-tabs'?'tabs-character':'character-tabs'});});
 controls.querySelector<HTMLButtonElement>('[data-layout-action="reset"]')?.addEventListener('click',()=>{if(compact()){hud=structuredClone(HUD_DEFAULT);saveHud(hud);applyHud(hud);}else layout=resetUILayout();});
 bindHudDrag(()=>hud,v=>{hud=v;saveHud(hud);});editing(false);
 window.addEventListener('resize',()=>requestAnimationFrame(clampAll));
}
function bindResponsiveShell():void{
 const q=matchMedia(COMPACT);const arrange=()=>{const card=document.querySelector<HTMLElement>('.character-card'),sidebar=document.querySelector<HTMLElement>('.sidebar'),tabs=sidebar?.querySelector<HTMLElement>('.tab-stack'),top=sidebar?.querySelector<HTMLElement>('.rune-menu-top'),bottom=sidebar?.querySelector<HTMLElement>('.rune-menu-bottom'),logout=document.querySelector<HTMLButtonElement>('#logout-button'),bar=document.querySelector<HTMLElement>('.global-bar'),edit=document.querySelector<HTMLElement>('#edit-layout-button');if(!card||!sidebar||!tabs||!top||!bottom||!logout||!bar||!edit)return;
  const buttons=ALL_PANELS.map(p=>document.querySelector<HTMLButtonElement>(`[data-panel="${p}"]`)).filter((b):b is HTMLButtonElement=>!!b);
  if(q.matches){if(card.parentElement!==sidebar)sidebar.insertBefore(card,tabs);buttons.forEach(b=>top.append(b));if(logout.parentElement!==bar)bar.insertBefore(logout,edit);applyHud(loadHud());requestAnimationFrame(clampAll);}
  else{PRIMARY_PANELS.forEach(p=>{const b=buttons.find(x=>x.dataset.panel===p);if(b)top.append(b);});SECONDARY_PANELS.forEach(p=>{const b=buttons.find(x=>x.dataset.panel===p);if(b)bottom.append(b);});if(logout.parentElement!==card)card.append(logout);document.querySelector<HTMLElement>('#active-panel')?.removeAttribute('hidden');}
 };arrange();q.addEventListener('change',arrange);
}
export function renderShell(app:HTMLDivElement):void{
 for(const [p,v] of Object.entries(ASSET_CSS_VARIABLES))app.style.setProperty(p,v);
 app.innerHTML=`<div class="game-shell"><main class="play-grid"><section class="world-column"><article class="location-card panel"><div class="location-heading"><div><div class="breadcrumbs" id="breadcrumbs"></div><h1 id="location-title"></h1></div><p id="location-slogan"></p></div><div class="scene-wrap" id="scene-wrap"></div></article><section class="chat panel" aria-label="Chat and game log"><button class="hud-drag-handle chat-handle" type="button" aria-label="Move chat">⋮⋮</button><button class="chat-collapse" type="button" aria-label="Collapse chat">−</button><div class="chat-tabs" role="tablist"><button class="active" type="button" data-chat-channel="room">ROOM</button><button type="button" data-chat-channel="game">GAME</button><button type="button" data-chat-channel="system">SYSTEM</button></div><div class="log" id="log" aria-live="polite"></div><form id="chat-form" class="chat-input"><span>›</span><input id="chat-message" maxlength="500" autocomplete="off" placeholder="Say something to the room…" aria-label="Chat message"/><button type="submit">SEND</button></form></section></section><aside class="sidebar">${characterCardMarkup()}<button class="hud-drag-handle status-handle" type="button" aria-label="Move status">⋮⋮</button><div class="tab-stack"><button class="hud-drag-handle tabs-handle" type="button" aria-label="Move menu">⋮⋮</button><nav class="rune-menu rune-menu-top panel" aria-label="Game menu">${menuMarkup(ALL_PANELS)}</nav><section class="active-panel panel" id="active-panel" aria-live="polite"></section><nav class="rune-menu rune-menu-bottom panel" aria-label="Secondary game menu"></nav></div></aside></main></div><div class="global-bar" role="toolbar" aria-label="Global controls">${hasDeveloperAccess()?`<div class="developer-menu-wrap"><button type="button" class="global-bar__developer-button" id="developer-item-button" aria-expanded="false">ITEM</button><div class="developer-item-menu hidden" id="developer-item-menu" aria-live="polite"></div></div>`:''}<div class="layout-edit-controls" id="layout-edit-controls" hidden><button type="button" data-layout-action="bar">MOVE BAR</button><button type="button" data-layout-action="sidebar">SWAP SIDES</button><button type="button" data-layout-action="main">SWAP SCENE / CHAT</button><button type="button" data-layout-action="sidebar-order">SWAP CHARACTER / TABS</button><button type="button" data-layout-action="reset">RESET</button></div><button type="button" class="global-bar__edit-layout" id="edit-layout-button" aria-pressed="false">EDIT LAYOUT</button></div><dialog class="skill-details-dialog" id="skill-details-dialog" aria-labelledby="skill-details-title"></dialog><dialog class="vendor-dialog" id="vendor-dialog" aria-labelledby="vendor-dialog-title"></dialog>`;
 bindLayoutEditor();bindResponsiveShell();
 document.querySelector('.chat-collapse')?.addEventListener('click',()=>{document.querySelector('.chat')?.classList.toggle('chat-collapsed');requestAnimationFrame(clampAll);});
 document.querySelector('.rune-menu')?.addEventListener('click',(e)=>{if(!matchMedia(COMPACT).matches)return;const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-panel]');if(!b)return;const panel=document.querySelector<HTMLElement>('#active-panel');if(!panel)return;const clicked=b.dataset.panel as Panel;const same=clicked===gameState.panel;if(same){panel.hidden=!panel.hidden;}else{panel.hidden=false;}requestAnimationFrame(clampAll);});
}
export function updateShell():void{const room=getRoom(gameState.roomId),district=document.querySelector<HTMLElement>('#district-name'),breadcrumbs=document.querySelector<HTMLElement>('#breadcrumbs'),title=document.querySelector<HTMLElement>('#location-title'),slogan=document.querySelector<HTMLElement>('#location-slogan');if(district)district.textContent=room.district.toUpperCase();if(breadcrumbs){breadcrumbs.replaceChildren();breadcrumbs.append(document.createTextNode(`${room.district} `));const s=document.createElement('span');s.textContent='›';breadcrumbs.append(s,document.createTextNode(` ${room.name}`));}if(title)title.textContent=room.name;if(slogan)slogan.textContent=room.slogan;}
