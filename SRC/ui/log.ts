import { gameState } from '../core/state';

export type ChatChannel = 'room' | 'game' | 'system';

let activeChannel: ChatChannel = 'room';

export function getActiveChatChannel(): ChatChannel {
  return activeChannel;
}

export function setActiveChatChannel(channel: ChatChannel): void {
  activeChannel = channel;
  renderLog();
}

function classifyLog(line: string): Exclude<ChatChannel, 'room'> {
  const message = line.replace(/^\[[^\]]+\]\s*/, '').toLowerCase();
  if (
    message.startsWith('action rejected:') ||
    message.includes('request was rejected') ||
    message.includes('inventory full') ||
    message.includes('must be equipped') ||
    message.includes('equip a ') ||
    message.startsWith('no uncooked shrimp') ||
    message.startsWith('no cooked shrimp')
  ) return 'system';
  return 'game';
}

export function renderLog(): void {
  if (activeChannel === 'room') return;
  const log = document.querySelector<HTMLDivElement>('#log');
  if (!log) return;

  const fragment = document.createDocumentFragment();
  const filtered = gameState.logs.filter((line) => classifyLog(line) === activeChannel);

  filtered.forEach((line, index) => {
    const row = document.createElement('div');
    row.className = `log-line ${index === filtered.length - 1 ? 'newest' : ''}`;
    row.textContent = line;
    fragment.append(row);
  });

  log.replaceChildren(fragment);
  log.scrollTop = log.scrollHeight;
}
