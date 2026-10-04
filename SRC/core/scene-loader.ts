import { preloadImage } from './assets';
import type { RoomId } from './types';
import { getRoom } from '../data/rooms';

const CONNECTED_ROOMS: Record<RoomId, readonly RoomId[]> = {
  glassmarket: ['breaker-yard', 'south-dock-pier'],
  'breaker-yard': ['glassmarket'],
  'south-dock-pier': ['glassmarket']
};

export async function prepareCurrentScene(roomId: RoomId): Promise<void> {
  const sceneImage = getRoom(roomId).sceneImage;
  if (sceneImage) await preloadImage(sceneImage);

  for (const connectedRoomId of CONNECTED_ROOMS[roomId]) {
    const connectedSceneImage = getRoom(connectedRoomId).sceneImage;
    if (connectedSceneImage) void preloadImage(connectedSceneImage);
  }
}
