import { preloadImage } from './assets';
import type { RoomId } from './types';
import { getRoom } from '../data/rooms';

export async function prepareCurrentScene(roomId: RoomId): Promise<void> {
  const sceneImage = getRoom(roomId).sceneImage;
  if (!sceneImage) return;
  await preloadImage(sceneImage);
}
