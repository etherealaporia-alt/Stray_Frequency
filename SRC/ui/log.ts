import { gameState } from '../core/state';
import { escapeHtml } from './html';

export function renderLog(): void {
  const log = document.querySelector<HTMLDivElement>('#log');
  if (!log) return;

  log.innerHTML = gameState.logs
    .map((line, index) => (
      `<div class="log-line ${index === gameState.logs.length - 1 ? 'newest' : ''}">${escapeHtml(line)}</div>`
    ))
    .join('');
  log.scrollTop = log.scrollHeight;
}
