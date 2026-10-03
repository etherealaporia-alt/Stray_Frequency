import { MOBILE_INVENTORY_PAGE_COUNT } from '../core/constants';
import { appendLog, characterName, gameState, isDeveloperAccount } from '../core/state';
import type { ActionType, EquipmentSlot, FishingMethod, Panel, SkillKey } from '../core/types';
import { ITEM_DEFINITIONS } from '../data/items';
import { persistCharacterHealth, saveCharacterProgress } from '../services/persistence';
import { logoutAccount } from '../services/supabase';
import { type CookingEvent, cancelCooking, pauseCooking, startCooking, startCookingTimer, useCookedShrimp } from '../systems/cooking';
import { equipFromInventory, unequipToInventory } from '../systems/equipment';
import { type FishingEvent, startFishing, stopFishing } from '../systems/fishing';
import { addInventoryItem, moveInventoryItem } from '../systems/inventory';
import { inspectDeparturesBoard, isNavigationAction, navigate } from '../systems/navigation';
import { type SalvageEvent, resetSalvageNode, startSalvaging, stopSalvaging } from '../systems/salvage';
import { buyPoweredSalvageBar, sellMetalScrap, vendorTradeSummary } from '../systems/vendor';
import { refreshCharacterHealth, refreshCharacterStats } from './character-card';
import { renderLog } from './log';
import { bindItemInteraction } from './mobile-input';
import { openSkillDetails, renderPanel } from './panels';
import { renderScene } from './scene';
import { renderShell, updateShell } from './shell';

function saveProgress(): Promise<boolean> { return saveCharacterProgress(gameState); }
function addLog(message: string): void { appendLog(gameState, message); renderLog(); }

function spawnXpPopup(text: string): void {
  const host = document.querySelector<HTMLElement>('#xp-layer');
  if (!host) return;
  host.querySelector('.xp-popup')?.remove();
  const popup = document.createElement('div');
  popup.className = 'xp-popup';
  popup.textContent = text;
  host.appendChild(popup);
  window.setTimeout(() => popup.remove(), 950);
}

function renderPanelAndBind(): void {
  const target = renderPanel();
  if (!target) return;
  target.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action as ActionType | undefined;
      if (action) handleAction(action);
    });
  });
  const moveItem = (from: number, to: number) => {
    if (moveInventoryItem(gameState, from, to, { save: saveProgress })) renderPanelAndBind();
  };
  target.querySelectorAll<HTMLButtonElement>('[data-inventory-index]').forEach((button) => {
    const index = Number(button.dataset.inventoryIndex);
    if (Number.isInteger(index) && gameState.inventorySlots[index]) {
      bindItemInteraction(target, button, () => activateInventoryItem(index), moveItem);
    }
  });
  target.querySelectorAll<HTMLButtonElement>('[data-equipment-slot]').forEach((button) => {
    const slot = button.dataset.equipmentSlot as EquipmentSlot | undefined;
    if (slot && gameState.equipment[slot]) bindItemInteraction(target, button, () => unequipItem(slot), moveItem);
  });
  target.querySelectorAll<HTMLButtonElement>('[data-inventory-page]').forEach((button) => {
    button.addEventListener('click', () => {
      gameState.mobileInventoryPage = (gameState.mobileInventoryPage + Number(button.dataset.inventoryPage) + MOBILE_INVENTORY_PAGE_COUNT) % MOBILE_INVENTORY_PAGE_COUNT;
      renderPanelAndBind();
    });
  });
}

function renderDeveloperItemMenu(): void {
  if (!isDeveloperAccount()) return;
  const menu = document.querySelector<HTMLElement>('#developer-item-menu');
  if (!menu) return;
  const items = Object.values(ITEM_DEFINITIONS);
  menu.innerHTML = items.map((item) => {
    const label = item.name.replace(/"/g, '&quot;');
    return `<button type="button" class="developer-item" data-dev-item="${item.key}" title="${item.description}" aria-label="${label}">${item.name}</button>`;
  }).join('');
}

export function renderAll(): void { updateShell(); renderScene(); renderPanelAndBind(); renderLog(); renderDeveloperItemMenu(); }
function systemChanged(): void { renderAll(); }
function renderSceneAndPanel(): void { renderScene(); renderPanelAndBind(); renderLog(); }

function salvageChanged(event: SalvageEvent): void {
  if (event === 'started' || event === 'inventory-full' || event === 'replenished' || event === 'reset') renderAll();
  else if (event === 'depleted') renderSceneAndPanel();
  else if (event === 'tick') { renderPanelAndBind(); renderLog(); }
}

function fishingChanged(event: FishingEvent): void {
  if (event === 'started' || event === 'inventory-full') renderAll();
  else if (event === 'stopped') renderScene();
  else if (event === 'tick') { renderPanelAndBind(); renderLog(); }
}

function cookingChanged(event: CookingEvent): void {
  if (event === 'started' || event === 'returned') renderAll();
  else if (event === 'tick') renderScene();
  else if (event === 'cooked') renderSceneAndPanel();
  else if (event === 'health-changed') { refreshCharacterHealth(); renderPanelAndBind(); }
}

function salvageHooks() { return { save: saveProgress, log: addLog, changed: salvageChanged, popup: spawnXpPopup }; }
function fishingHooks() { return { save: saveProgress, log: addLog, changed: fishingChanged, popup: spawnXpPopup }; }
function cookingHooks() { return { save: saveProgress, log: addLog, changed: cookingChanged, persistHealth: (health: number) => persistCharacterHealth(health, gameState) }; }

function stopFishingForEquipment(): void { stopFishing(gameState, { changed: renderScene }); }

function equipItem(index: number): void {
  const result = equipFromInventory(gameState, index, { save: saveProgress, stopFishing: stopFishingForEquipment });
  if (!result.changed) return;
  if (result.message) addLog(result.message);
  renderPanelAndBind();
  refreshCharacterStats();
}

function unequipItem(slot: EquipmentSlot): void {
  const result = unequipToInventory(gameState, slot, { save: saveProgress, stopFishing: stopFishingForEquipment });
  if (result.message) addLog(result.message);
  if (!result.changed) return;
  renderPanelAndBind();
  refreshCharacterStats();
}

function activateInventoryItem(index: number): void {
  const entry = gameState.inventorySlots[index];
  if (!entry) return;
  if (ITEM_DEFINITIONS[entry.item].equipmentSlot) { equipItem(index); return; }
  if (entry.item === 'portable_induction_pad') { startCooking(gameState, index, cookingHooks()); return; }
  if (entry.item === 'cooked_shrimp') void useCookedShrimp(gameState, index, cookingHooks());
}

function equippedFishingMethod(): FishingMethod | null {
  if (gameState.equipment.main_hand === 'fishing_net') return 'net';
  if (gameState.equipment.main_hand === 'fishing_rod') return 'rod';
  return null;
}

function startFishingWithEquippedTool(): void {
  const method = equippedFishingMethod();
  if (!method) {
    addLog('Equip a Fishing Net or Fishing Rod in Main Hand before fishing here.');
    return;
  }
  startFishing(gameState, method, fishingHooks());
}

function openVendorDialog(): void {
  const dialog = document.querySelector<HTMLDialogElement>('#vendor-dialog');
  if (!dialog) return;

  const summary = vendorTradeSummary(gameState);
  dialog.innerHTML = `
    <header class="vendor-header">
      <div>
        <div class="panel-kicker">GLASSMARKET MERCHANT</div>
        <h2 id="vendor-dialog-title">Marrow Kest</h2>
      </div>
      <button class="skill-details-close" type="button" data-close-vendor aria-label="Close vendor dialog">×</button>
    </header>
    <p class="vendor-summary">Paid salvage work, cut-rate tools, and a few side jobs for travellers.</p>
    <div class="vendor-grid">
      <div class="vendor-card">
        <strong>Powered Salvage Bar</strong>
        <span>100 credits</span>
        <button type="button" data-vendor-action="buy-powered-salvage-bar" ${summary.canBuy ? '' : 'disabled'}>Buy</button>
      </div>
      <div class="vendor-card">
        <strong>Tier 1 Metal Scrap</strong>
        <span>5 credits each</span>
        <button type="button" data-vendor-action="sell-metal-scrap" ${summary.scrap > 0 ? '' : 'disabled'}>Sell 1</button>
      </div>
    </div>
    <div class="vendor-footer">
      <small>Available credits: ${summary.credits}</small>
      <small>Scrap on hand: ${summary.scrap}</small>
    </div>
  `;

  dialog.showModal();
  dialog.querySelector<HTMLButtonElement>('[data-close-vendor]')?.focus();
}

function executeVendorAction(action: ActionType): void {
  if (action === 'buy-powered-salvage-bar') {
    const result = buyPoweredSalvageBar(gameState, { save: saveProgress });
    addLog(result.message);
    openVendorDialog();
    renderPanelAndBind();
    refreshCharacterStats();
    return;
  }

  if (action === 'sell-metal-scrap') {
    const result = sellMetalScrap(gameState, 1, { save: saveProgress });
    addLog(result.message);
    openVendorDialog();
    renderPanelAndBind();
    refreshCharacterStats();
    return;
  }
}

function handleAction(action: ActionType): void {
  if (isNavigationAction(action)) {
    navigate(gameState, action, {
      stopSalvaging: (withLog) => { stopSalvaging(gameState, withLog); },
      stopFishing: () => { stopFishing(gameState, { changed: renderScene }); },
      log: addLog,
      changed: systemChanged
    });
    return;
  }
  switch (action) {
    case 'open-vendor': openVendorDialog(); return;
    case 'start-salvaging': startSalvaging(gameState, salvageHooks()); return;
    case 'start-fishing-net': startFishing(gameState, 'net', fishingHooks()); return;
    case 'start-fishing-rod': startFishing(gameState, 'rod', fishingHooks()); return;
    case 'reset-node': resetSalvageNode(gameState, salvageHooks()); return;
    case 'inspect-board': inspectDeparturesBoard(gameState, addLog); return;
    case 'buy-powered-salvage-bar':
    case 'sell-metal-scrap':
      executeVendorAction(action);
      return;
  }
}

function bindStaticInteractions(): void {
  const developerButton = document.querySelector<HTMLButtonElement>('#developer-item-button');
  const developerMenu = document.querySelector<HTMLElement>('#developer-item-menu');
  if (developerButton && developerMenu) {
    developerButton.addEventListener('click', () => {
      const nowOpen = !developerMenu.classList.contains('hidden');
      developerMenu.classList.toggle('hidden', nowOpen);
      developerButton.setAttribute('aria-expanded', String(!nowOpen));
      renderDeveloperItemMenu();
    });
    developerMenu.addEventListener('dblclick', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-dev-item]');
      if (!target?.dataset.devItem) return;
      const itemKey = target.dataset.devItem as keyof typeof ITEM_DEFINITIONS;
      const added = addInventoryItem(gameState, itemKey, 1, { save: saveProgress });
      if (!added) {
        addLog('Inventory full. No room for that item.');
        return;
      }
      addLog(`Added ${ITEM_DEFINITIONS[itemKey].name} to inventory.`);
      renderPanelAndBind();
      refreshCharacterStats();
    });
  }

  document.querySelectorAll<HTMLButtonElement>('.rune-menu button').forEach((button) => {
    button.addEventListener('click', () => {
      gameState.panel = button.dataset.panel as Panel;
      document.querySelectorAll('.rune-menu button').forEach((item) => item.classList.toggle('active', item === button));
      renderPanelAndBind();
    });
  });
  document.querySelector<HTMLFormElement>('#chat-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>('#chat-message');
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;
    addLog(`${characterName(gameState)}: ${value}`);
    input.value = '';
  });
  document.querySelector<HTMLElement>('#active-panel')?.addEventListener('click', (event) => {
    const tile = (event.target as HTMLElement).closest<HTMLButtonElement>('.skill-tile[data-skill]');
    if (tile?.dataset.skill) openSkillDetails(tile.dataset.skill as SkillKey);
  });
  document.querySelector<HTMLDialogElement>('#skill-details-dialog')?.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-close-skill-details]')) (event.currentTarget as HTMLDialogElement).close();
  });
  document.querySelector<HTMLDialogElement>('#vendor-dialog')?.addEventListener('click', (event) => {
    const closeTarget = (event.target as HTMLElement).closest('[data-close-vendor]');
    if (closeTarget) (event.currentTarget as HTMLDialogElement).close();
    const vendorAction = (event.target as HTMLElement).closest<HTMLElement>('[data-vendor-action]');
    if (vendorAction?.dataset.vendorAction) {
      handleAction(vendorAction.dataset.vendorAction as ActionType);
    }
  });

  const sceneWrap = document.querySelector<HTMLElement>('#scene-wrap');
  sceneWrap?.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-cancel-cooking]')) cancelCooking(gameState, cookingHooks());
  });
  sceneWrap?.addEventListener('dblclick', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-node-action]');
    if (!target?.dataset.nodeAction) return;
    if (target.dataset.nodeAction === 'start-fishing-equipped') startFishingWithEquippedTool();
    else handleAction(target.dataset.nodeAction as ActionType);
  });
  sceneWrap?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-node-action]');
    if (!target?.dataset.nodeAction) return;
    event.preventDefault();
    if (target.dataset.nodeAction === 'start-fishing-equipped') startFishingWithEquippedTool();
    else handleAction(target.dataset.nodeAction as ActionType);
  });

  document.querySelector<HTMLButtonElement>('#logout-button')?.addEventListener('click', async () => {
    stopSalvaging(gameState, false);
    stopFishing(gameState, { changed: renderScene });
    pauseCooking(gameState, { save: saveProgress });
    await logoutAccount();
  });
}

export function startGame(app: HTMLDivElement): void {
  renderShell(app);
  bindStaticInteractions();
  renderAll();
  startCookingTimer(gameState, cookingHooks());
}
