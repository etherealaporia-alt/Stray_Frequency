import { characterName, gameState } from '../core/state';
import {
  fetchCurrentRoomChat,
  fetchCurrentRoomPlayers,
  sendRoomChatMessage,
  subscribeToRoomChat,
  type RoomChatMessage,
  type RoomPlayer
} from '../services/supabase';
import { getActiveChatChannel, setActiveChatChannel, type ChatChannel } from './log';

let messages: RoomChatMessage[] = [];
let players: RoomPlayer[] = [];
let subscribedRoom = '';

function insertPlayerName(name: string): void {
  const input = document.querySelector<HTMLInputElement>('#chat-message');
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.setRangeText(name, start, end, 'end');
  input.focus();
}

function playerNameButton(name: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'player-name';
  button.textContent = name;
  button.addEventListener('click', () => insertPlayerName(name));
  return button;
}

function appendMessageText(host: HTMLElement, text: string): void {
  const ownName = characterName(gameState);
  const needle = ownName.toLocaleLowerCase();
  const lower = text.toLocaleLowerCase();
  if (!needle) {
    host.append(document.createTextNode(text));
    return;
  }

  let cursor = 0;
  while (cursor < text.length) {
    const index = lower.indexOf(needle, cursor);
    if (index < 0) {
      host.append(document.createTextNode(text.slice(cursor)));
      return;
    }
    if (index > cursor) host.append(document.createTextNode(text.slice(cursor, index)));
    const mark = document.createElement('mark');
    mark.className = 'chat-name-highlight';
    mark.textContent = text.slice(index, index + ownName.length);
    host.append(mark);
    cursor = index + ownName.length;
  }
}

export function renderRoomChat(): void {
  if (getActiveChatChannel() !== 'room') return;
  const log = document.querySelector<HTMLDivElement>('#log');
  if (!log) return;

  const fragment = document.createDocumentFragment();
  for (const message of messages) {
    const line = document.createElement('div');
    line.className = 'log-line room-chat-line';

    const time = document.createElement('time');
    const stamp = new Date(message.created_at);
    time.textContent = Number.isNaN(stamp.getTime())
      ? ''
      : `[${stamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]  `;

    line.append(time, playerNameButton(message.character_name), document.createTextNode(': '));
    appendMessageText(line, message.body);
    fragment.append(line);
  }

  log.replaceChildren(fragment);
  log.scrollTop = log.scrollHeight;
}

export function renderNearbyPanel(): void {
  if (gameState.panel !== 'nearby') return;
  const host = document.querySelector<HTMLElement>('#active-panel');
  if (!host) return;

  const kicker = document.createElement('div');
  kicker.className = 'panel-kicker';
  kicker.textContent = 'CURRENT ROOM';

  const heading = document.createElement('h3');
  heading.textContent = 'Nearby Players';

  const summary = document.createElement('p');
  summary.className = 'nearby-summary';
  summary.textContent = `${players.length} ${players.length === 1 ? 'player' : 'players'} here`;

  const list = document.createElement('div');
  list.className = 'nearby-player-list';

  for (const player of players) {
    const row = document.createElement('div');
    row.className = 'nearby-player';
    const identity = document.createElement('div');
    identity.className = 'nearby-player-identity';
    identity.append(playerNameButton(player.character_name));
    const status = document.createElement('small');
    status.textContent = player.character_id === gameState.character?.id ? 'YOU · HERE' : 'HERE';
    identity.append(status);
    row.append(identity);
    list.append(row);
  }

  host.replaceChildren(kicker, heading, summary, list);
}

export async function refreshRoomData(): Promise<void> {
  if (!gameState.character) return;
  const [chatResult, playersResult] = await Promise.all([
    fetchCurrentRoomChat(50),
    fetchCurrentRoomPlayers()
  ]);
  if (!chatResult.error) messages = [...chatResult.data].reverse();
  if (!playersResult.error) players = playersResult.data;
  renderRoomChat();
  renderNearbyPanel();
}

export async function syncMultiplayerRoom(): Promise<void> {
  if (!gameState.character) return;
  const room = gameState.roomId;
  if (room === subscribedRoom) return;
  subscribedRoom = room;
  await refreshRoomData();
  await subscribeToRoomChat(room, () => { void refreshRoomData(); });
}

export async function sendChat(body: string): Promise<boolean> {
  const text = body.trim();
  if (!text) return false;
  const { error } = await sendRoomChatMessage(text);
  if (error) {
    console.warn('Room chat message rejected.', error);
    return false;
  }
  await refreshRoomData();
  return true;
}

export function bindMultiplayerUI(): void {
  document.querySelectorAll<HTMLButtonElement>('.chat-tabs button[data-chat-channel]').forEach((button) => {
    button.addEventListener('click', () => {
      const channel = button.dataset.chatChannel as ChatChannel;
      setActiveChatChannel(channel);
      document.querySelectorAll('.chat-tabs button[data-chat-channel]').forEach((item) => {
        item.classList.toggle('active', item === button);
      });
      if (channel === 'room') renderRoomChat();
    });
  });
}

export function renderActiveChatChannel(): void {
  if (getActiveChatChannel() === 'room') renderRoomChat();
}

document.addEventListener('submit', (event) => {
  const form = (event.target as HTMLElement | null)?.closest<HTMLFormElement>('#chat-form');
  if (!form) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const input = form.querySelector<HTMLInputElement>('#chat-message');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  input.disabled = true;
  void sendChat(value).then((sent) => {
    input.disabled = false;
    if (sent) input.value = '';
    input.focus();
  });
}, true);

document.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.rune-menu button[data-panel="nearby"]');
  if (!button) return;
  queueMicrotask(renderNearbyPanel);
}, true);

let boundShell: HTMLElement | null = null;
const shellObserver = new MutationObserver(() => {
  const shell = document.querySelector<HTMLElement>('.game-shell');
  if (!shell || shell === boundShell || !gameState.character) return;
  boundShell = shell;
  bindMultiplayerUI();
  void syncMultiplayerRoom();
  renderActiveChatChannel();
});
shellObserver.observe(document.documentElement, { childList: true, subtree: true });

window.setInterval(() => {
  if (!gameState.character || !document.querySelector('.game-shell')) return;
  void syncMultiplayerRoom();
  void refreshRoomData();
}, 5000);
