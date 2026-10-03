const HOLD_DELAY_MS = 475;
const DOUBLE_TAP_WINDOW_MS = 450;
const DRAG_DISTANCE_PX = 10;

type ItemAction = () => void;
type MoveInventoryItem = (from: number, to: number) => void;

function showTouchDetail(root: ParentNode, button: HTMLButtonElement): void {
  const detail = root.querySelector<HTMLElement>('#touch-item-detail');
  if (detail && button.dataset.tooltip) detail.textContent = button.dataset.tooltip;
}

/** Preserve the existing desktop click/double-click and touch tap/hold/drag vocabulary. */
export function bindItemInteraction(
  root: ParentNode,
  button: HTMLButtonElement,
  action: ItemAction,
  moveInventoryItem: MoveInventoryItem
): void {
  let timer: number | null = null;
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let held = false;
  let handledTouch = false;
  let lastTouchTapAt = 0;
  const index = Number(button.dataset.inventoryIndex);

  button.addEventListener('click', () => {
    if (button.dataset.doubleUseItem === 'true' || button.dataset.useItem !== 'true') return;
    if (handledTouch) {
      handledTouch = false;
      return;
    }
    action();
  });

  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    startX = event.clientX;
    startY = event.clientY;
    dragging = false;
    held = false;
    timer = window.setTimeout(() => {
      held = true;
      showTouchDetail(root, button);
      button.classList.add('inspecting');
    }, HOLD_DELAY_MS);
  });

  button.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > DRAG_DISTANCE_PX) {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      dragging = true;
      button.classList.add('touch-dragging');
    }
  });

  button.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse') return;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    button.classList.remove('inspecting', 'touch-dragging');

    if (held) return;
    if (dragging && Number.isInteger(index)) {
      const drop = document.elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLButtonElement>('[data-inventory-index]');
      const targetIndex = drop ? Number(drop.dataset.inventoryIndex) : Number.NaN;
      if (Number.isInteger(targetIndex)) moveInventoryItem(index, targetIndex);
      return;
    }

    if (button.dataset.doubleUseItem === 'true') {
      const now = Date.now();
      handledTouch = true;
      window.setTimeout(() => { handledTouch = false; }, 0);
      if (now - lastTouchTapAt <= DOUBLE_TAP_WINDOW_MS) {
        lastTouchTapAt = 0;
        action();
      } else {
        lastTouchTapAt = now;
      }
      return;
    }

    if (button.dataset.useItem === 'true') {
      handledTouch = true;
      window.setTimeout(() => { handledTouch = false; }, 0);
    }
    action();
  });

  button.addEventListener('pointercancel', () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    button.classList.remove('inspecting', 'touch-dragging');
  });

  button.addEventListener('dblclick', (event) => {
    event.preventDefault();
    if (button.dataset.doubleUseItem === 'true' || button.dataset.useItem !== 'true') action();
  });
}
