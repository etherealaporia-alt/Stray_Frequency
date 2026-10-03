import { ASSET_CSS_VARIABLES } from '../core/assets';
import { gameState } from '../core/state';
import type { Panel } from '../core/types';
import { getRoom } from '../data/rooms';
import { hasDeveloperAccess } from '../services/supabase';
import { characterCardMarkup } from './character-card';
import { applyUILayout, loadUILayout, resetUILayout, saveUILayout, type UILayout } from './layout';

const PANEL_ICONS: Record<Panel,string>={world:'◎',inventory:'▣',equipment:'♙',skills:'▥',journal:'▤',comms:'◌',map:'◆',nearby:'♟'};
const ALL_PANELS:Panel[]=['world','inventory','equipment','skills','journal','comms','map','nearby'];
const PRIMARY_PANELS:Panel[]=['world','inventory','equipment','skills','journal'];
const SECONDARY_PANELS:Panel[]=['comms','map','nearby'];
const COMPACT_LANDSCAPE='(orientation: landscape) and (max-height: 700px) and (any-pointer: coarse)';

function menuMarkup(panels:Panel[]):string { return panels.map(panel=>`
    <button type="button" data-panel="${panel}" class="${panel==='world'?'active':''}">
      <span class="menu-icon">${PANEL_ICONS[panel]}</span><small>${panel.toUpperCase()}</small>
    </button>`).join(''); }

function bindLayoutEditor():void {
  const app=document.querySelector<HTMLElement>('#app');
  const edit=document.querySelector<HTMLButtonElement>('#edit-layout-button');
  const controls=document.querySelector<HTMLElement>('#layout-edit-controls');
  if(!app||!edit||!controls)return;
  let layout=loadUILayout(); applyUILayout(layout);
  const editing=(on:boolean)=>{ app.classList.toggle('layout-editing',on); controls.hidden=!on; edit.textContent=on?'DONE':'EDIT LAYOUT'; edit.setAttribute('aria-pressed',String(on)); };
  const update=(patch:Partial<UILayout>)=>{ layout={...layout,...patch}; saveUILayout(layout); applyUILayout(layout); };
  edit.addEventListener('click',()=>editing(!app.classList.contains('layout-editing')));
  controls.querySelector<HTMLButtonElement>('[data-layout-action="bar"]')?.addEventListener('click',()=>update({barPosition:layout.barPosition==='bottom'?'top':'bottom'}));
  controls.querySelector<HTMLButtonElement>('[data-layout-action="sidebar"]')?.addEventListener('click',()=>update({sidebarSide:layout.sidebarSide==='right'?'left':'right'}));
  controls.querySelector<HTMLButtonElement>('[data-layout-action="main"]')?.addEventListener('click',()=>update({mainOrder:layout.mainOrder==='scene-chat'?'chat-scene':'scene-chat'}));
  controls.querySelector<HTMLButtonElement>('[data-layout-action="sidebar-order"]')?.addEventListener('click',()=>update({sidebarOrder:layout.sidebarOrder==='character-tabs'?'tabs-character':'character-tabs'}));
  controls.querySelector<HTMLButtonElement>('[data-layout-action="reset"]')?.addEventListener('click',()=>{layout=resetUILayout();});
  editing(false);
}

function bindResponsiveShell():void {
  const query=matchMedia(COMPACT_LANDSCAPE);
  const arrange=()=>{
    const card=document.querySelector<HTMLElement>('.character-card');
    const sidebar=document.querySelector<HTMLElement>('.sidebar');
    const tabs=sidebar?.querySelector<HTMLElement>('.tab-stack');
    const top=sidebar?.querySelector<HTMLElement>('.rune-menu-top');
    const bottom=sidebar?.querySelector<HTMLElement>('.rune-menu-bottom');
    const logout=document.querySelector<HTMLButtonElement>('#logout-button');
    const bar=document.querySelector<HTMLElement>('.global-bar');
    const edit=document.querySelector<HTMLElement>('#edit-layout-button');
    if(!card||!sidebar||!tabs||!top||!bottom||!logout||!bar||!edit)return;

    if(query.matches){
      if(card.parentElement!==sidebar) sidebar.insertBefore(card,tabs);
      const buttons=ALL_PANELS.map(panel=>document.querySelector<HTMLButtonElement>(`[data-panel="${panel}"]`)).filter((button):button is HTMLButtonElement=>Boolean(button));
      buttons.slice(0,4).forEach(button=>top.append(button));
      buttons.slice(4).forEach(button=>bottom.append(button));
      if(logout.parentElement!==bar) bar.insertBefore(logout,edit);
    }else{
      const buttons=ALL_PANELS.map(panel=>document.querySelector<HTMLButtonElement>(`[data-panel="${panel}"]`)).filter((button):button is HTMLButtonElement=>Boolean(button));
      PRIMARY_PANELS.forEach(panel=>{const button=buttons.find(item=>item.dataset.panel===panel);if(button)top.append(button);});
      SECONDARY_PANELS.forEach(panel=>{const button=buttons.find(item=>item.dataset.panel===panel);if(button)bottom.append(button);});
      if(logout.parentElement!==card) card.append(logout);
    }
  };
  arrange();
  query.addEventListener('change',arrange);
}

export function renderShell(app:HTMLDivElement):void {
  for(const [property,value] of Object.entries(ASSET_CSS_VARIABLES)) app.style.setProperty(property,value);
  app.innerHTML=`
    <div class="game-shell">
      <main class="play-grid">
        <section class="world-column">
          <article class="location-card panel">
            <div class="location-heading"><div><div class="breadcrumbs" id="breadcrumbs"></div><h1 id="location-title"></h1></div><p id="location-slogan"></p></div>
            <div class="scene-wrap" id="scene-wrap"></div>
          </article>
          <section class="chat panel" aria-label="Chat and game log">
            <div class="chat-tabs" role="tablist">
              <button class="active" type="button" data-chat-channel="room">ROOM</button>
              <button type="button" data-chat-channel="game">GAME</button>
              <button type="button" data-chat-channel="system">SYSTEM</button>
            </div>
            <div class="log" id="log" aria-live="polite"></div>
            <form id="chat-form" class="chat-input"><span>›</span><input id="chat-message" maxlength="500" autocomplete="off" placeholder="Say something to the room…" aria-label="Chat message" /><button type="submit">SEND</button></form>
          </section>
        </section>
        <aside class="sidebar">
          ${characterCardMarkup()}
          <div class="tab-stack">
            <nav class="rune-menu rune-menu-top panel" aria-label="Primary game menu">${menuMarkup(PRIMARY_PANELS)}</nav>
            <section class="active-panel panel" id="active-panel" aria-live="polite"></section>
            <nav class="rune-menu rune-menu-bottom panel" aria-label="Secondary game menu">${menuMarkup(SECONDARY_PANELS)}</nav>
          </div>
        </aside>
      </main>
    </div>
    <div class="global-bar" role="toolbar" aria-label="Global controls">
      ${hasDeveloperAccess() ? `<div class="developer-menu-wrap">
        <button type="button" class="global-bar__developer-button" id="developer-item-button" aria-expanded="false">ITEM</button>
        <div class="developer-item-menu hidden" id="developer-item-menu" aria-live="polite"></div>
      </div>` : ''}
      <div class="layout-edit-controls" id="layout-edit-controls" hidden>
        <button type="button" data-layout-action="bar">MOVE BAR</button>
        <button type="button" data-layout-action="sidebar">SWAP SIDES</button>
        <button type="button" data-layout-action="main">SWAP SCENE / CHAT</button>
        <button type="button" data-layout-action="sidebar-order">SWAP CHARACTER / TABS</button>
        <button type="button" data-layout-action="reset">RESET</button>
      </div>
      <button type="button" class="global-bar__edit-layout" id="edit-layout-button" aria-pressed="false">EDIT LAYOUT</button>
    </div>
    <dialog class="skill-details-dialog" id="skill-details-dialog" aria-labelledby="skill-details-title"></dialog>
    <dialog class="vendor-dialog" id="vendor-dialog" aria-labelledby="vendor-dialog-title"></dialog>`;
  bindLayoutEditor();
  bindResponsiveShell();
}
export function updateShell():void {
  const room=getRoom(gameState.roomId), district=document.querySelector<HTMLElement>('#district-name'), breadcrumbs=document.querySelector<HTMLElement>('#breadcrumbs'), title=document.querySelector<HTMLElement>('#location-title'), slogan=document.querySelector<HTMLElement>('#location-slogan');
  if(district)district.textContent=room.district.toUpperCase();
  if(breadcrumbs){
    breadcrumbs.replaceChildren();
    breadcrumbs.append(document.createTextNode(`${room.district} `));
    const separator=document.createElement('span');
    separator.textContent='›';
    breadcrumbs.append(separator,document.createTextNode(` ${room.name}`));
  }
  if(title)title.textContent=room.name; if(slogan)slogan.textContent=room.slogan;
}
