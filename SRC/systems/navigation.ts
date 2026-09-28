import { appendLog } from '../core/state';
import type { ActionType, GameState, LogMessage, RoomId } from '../core/types';
import { getRoom } from '../data/rooms';

export type NavigationAction = Extract<
  ActionType,
  'goto-breaker-yard' | 'goto-south-dock-pier' | 'goto-glassmarket'
>;

export interface NavigationHooks {
  stopSalvaging?: (withLog: boolean) => void;
  stopFishing?: () => void;
  log?: LogMessage;
  changed?: (roomId: RoomId) => void;
}

const NAVIGATION: Record<NavigationAction, { roomId: RoomId; message: string }> = {
  'goto-breaker-yard': {
    roomId: 'breaker-yard',
    message: 'You head through the service underpass to Breaker Yard 12.'
  },
  'goto-south-dock-pier': {
    roomId: 'south-dock-pier',
    message: 'You follow the waterfront route to South Dock Pier.'
  },
  'goto-glassmarket': {
    roomId: 'glassmarket',
    message: 'You return to Glassmarket.'
  }
};

function writeLog(state: GameState, hooks: NavigationHooks, message: string): void {
  if (hooks.log) hooks.log(message);
  else appendLog(state, message);
}

export function getCurrentRoom(state: GameState) {
  return getRoom(state.roomId);
}

/** Preserve the legacy load rule: only Breaker Yard persisted distinctly. */
export function roomFromCharacterLocation(locationId: string): RoomId {
  return locationId === 'breaker-yard' ? 'breaker-yard' : 'glassmarket';
}

export function navigate(
  state: GameState,
  action: NavigationAction,
  hooks: NavigationHooks = {}
): RoomId {
  const transition = NAVIGATION[action];
  hooks.stopSalvaging?.(false);
  hooks.stopFishing?.();
  state.roomId = transition.roomId;
  writeLog(state, hooks, transition.message);
  hooks.changed?.(transition.roomId);
  return transition.roomId;
}

export function inspectDeparturesBoard(state: GameState, log?: LogMessage): void {
  const message = 'The departures board flickers between delays and broken advertising loops.';
  if (log) log(message);
  else appendLog(state, message);
}

export function isNavigationAction(action: ActionType): action is NavigationAction {
  return Object.prototype.hasOwnProperty.call(NAVIGATION, action);
}
