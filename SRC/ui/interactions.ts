import { MOBILE_INVENTORY_PAGE_COUNT } from '../core/constants';
import { appendLog, characterName, gameState } from '../core/state';
import type { ActionType, EquipmentSlot, Panel, SkillKey } from '../core/types';
import { ITEM_DEFINITIONS } from '../data/items';
import { persistCharacterHealth, saveCharacterProgress } from '../services/persistence';
import { logoutAccount } from '../services/supabase';
import {
  type CookingEvent,
  cancelCooking,
  pauseCooking,
  startCooking,
  startCookingTimer,
  useCookedShrimp
} from '../systems/cooking';
import { equipFromInventory, unequipToInventory } from '../systems/equipment';
import { type FishingEvent, startFishing, stopFishing } from '../systems/fishing';
import { moveInventoryItem } from '../systems/inventory';
import {
  inspectDeparturesBoard,
  isNavigationAction,
  navigate
} from '../systems/navigation';
import {
  type SalvageEvent,
  resetSalvageNode,
  startSalvaging,
  stopSalvaging
} from '../systems/salvage';
import { refreshCharacterHealth, refreshCharacterStats } from './character-card';
import { renderLog } from './log';
import { bindItemInteraction } from './mobile-input';
import { openSkillDetails, renderPanel } from './panels';
import { renderScene } from './scene';
import { renderShell, updateShell } from './shell';

function saveProgress(): Promise<boolean> {
  return saveCharacterProgress(gameState);
}

function addLog(message: string): void {
  appendLog(gameState, message);
  renderLog();
}

function spawnXpPopup(text: string): void {
  const host = document.querySelector<HTMLElement>('#xp-layer');
  if (!host) return;

  const popup = document.createElement('div');
  popup.className = 'xp-popup';
  popup.textContent = text;
  host.appendChild(popup);
  window.setTimeout(() => popup.remove(), 1_200);
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
    if (slot && gameState.equipment[slot]) {
      bindItemInteraction(target, button, () => unequipItem(slot), moveItem);
    }
  });

  target.querySelectorAll<HTMLButtonElement>('[data-inventory-page]').forEach((button) => {
    button.addEventListener('click', () => {
      gameState.mobileInventoryPage = (
        gameState.mobileInventoryPage
        + Number(button.dataset.inventoryPage)
        + MOBILE_INVENTORY_PAGE_COUNT
      ) % MOBILE_INVENTORY_PAGE_COUNT;
      renderPanelAndBind();
    });
  });
}

export function renderAll(): void {
  updateShell();
  renderScene();
  renderPanelAndBind();
  renderLog();
}

function systemChanged(): void {
  renderAll();
}

function renderSceneAndPanel(): void {
  renderScene();
  renderPanelAndBind();
  renderLog();
}

function salvageChanged(event: SalvageEvent): void {
  if (event === 'started' || event === 'inventory-full' || event === 'replenished' || event === 'reset') {
    renderAll();
  } else if (event === 'tick') {
    renderSceneAndPanel();
  }
}

function fishingChanged(event: FishingEvent): void {
  if (event === 'stopped') renderScene();
  else if (event === 'started' || event === 'inventory-full') renderAll();
  else renderSceneAndPanel();
}

function cookingChanged(event: CookingEvent): void {
  if (event === 'started' || event === 'returned') {
    renderAll();
  } else if (event === 'tick') {
    renderScene();
  } else if (event === 'cooked') {
    renderSceneAndPanel();
  } else if (event === 'health-changed') {
    refreshCharacterHealth();
    renderPanelAndBind();
  }
}

function salvageHooks() {
  return {
    save: saveProgress,
    log: addLog,
    changed: salvageChanged,
    popup: spawnXpPopup
  };
}

function fishingHooks() {
  return {
    save: saveProgress,
    log: addLog,
    changed: fishingChanged,
    popup: spawnXpPopup
  };
}

function cookingHooks() {
  return {
    save: saveProgress,
    log: addLog,
    changed: cookingChanged,
    persistHealth: (health: number) => persistCharacterHealth(health, gameState)
  };
}

function stopFishingForEquipment(): void {
  stopFishing(gameState, { changed: renderScene });
}

function equipItem(index: number): void {
  const result = equipFromInventory(gameState, index, {
    save: saveProgress,
    stopFishing: stopFishingForEquipment
  });
  if (!result.changed) return;
  if (result.message) addLog(result.message);
  renderPanelAndBind();
  refreshCharacterStats();
}

function unequipItem(slot: EquipmentSlot): void {
  const result = unequipToInventory(gameState, slot, {
    save: saveProgress,
    stopFishing: stopFishingForEquipment
  });
  if (result.message) addLog(result.message);
  if (!result.changed) return;
  renderPanelAndBind();
  refreshCharacterStats();
}

function activateInventoryItem(index: number): void {
  const entry = gameState.inventorySlots[index];
  if (!entry) return;
  if (ITEM_DEFINITIONS[entry.item].equipmentSlot) {
    equipItem(index);
    return;
  }

  if (entry.item === 'portable_induction_pad') {
    startCooking(gameState, index, cookingHooks());
    return;
  }
  if (entry.item === 'cooked_shrimp') {
    void useCookedShrimp(gameState, index, cookingHooks());
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
    case 'start-salvaging':
      startSalvaging(gameState, salvageHooks());
      return;
    case 'start-fishing-shrimp':
      startFishing(gameState, 'shrimp', fishingHooks());
      return;
    case 'start-fishing-sardine':
      startFishing(gameState, 'sardine', fishingHooks());
      return;
    case 'reset-node':
      resetSalvageNode(gameState, salvageHooks());
      return;
    case 'inspect-board':
      inspectDeparturesBoard(gameState, addLog);
      return;
  }
}

function bindStaticInteractions(): void {
  document.querySelectorAll<HTMLButtonElement>('.rune-menu button').forEach((button) => {
    button.addEventListener('click', () => {
      gameState.panel = button.dataset.panel as Panel;
      document.querySelectorAll('.rune-menu button').forEach((item) => {
        item.classList.toggle('active', item === button);
      });
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
    if ((event.target as HTMLElement).closest('[data-close-skill-details]')) {
      (event.currentTarget as HTMLDialogElement).close();
    }
  });

  const sceneWrap = document.querySelector<HTMLElement>('#scene-wrap');
  sceneWrap?.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-cancel-cooking]')) {
      cancelCooking(gameState, cookingHooks());
    }
  });
  sceneWrap?.addEventListener('dblclick', (event) => {
    const node = (event.target as HTMLElement).closest<HTMLElement>('.gather-node[data-node-action]');
    if (node?.dataset.nodeAction) handleAction(node.dataset.nodeAction as ActionType);
  });
  sceneWrap?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const node = (event.target as HTMLElement).closest<HTMLElement>('.gather-node[data-node-action]');
    if (!node?.dataset.nodeAction) return;
    event.preventDefault();
    handleAction(node.dataset.nodeAction as ActionType);
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
