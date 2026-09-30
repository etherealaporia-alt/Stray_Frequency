import type { FishingMethod, ItemKey, RoomId, TrackedInventoryName, WaterType } from '../core/types';
import type { NodePresentation } from '../core/presentation-types';

export interface FishingCatch {
  item: Extract<ItemKey, 'uncooked_shrimp' | 'sardine'>;
  name: Extract<TrackedInventoryName, 'Uncooked Shrimp' | 'Sardine'>;
  weight: number;
}

export interface FishingArea {
  id: string;
  roomId: RoomId;
  waterType: WaterType;
  presentation: NodePresentation;
  catches: Record<FishingMethod, readonly FishingCatch[]>;
}

export const SOUTH_DOCK_FISHING_AREA: FishingArea = {
  id: 'south-dock-pier-water',
  roomId: 'south-dock-pier',
  waterType: 'saltwater',
  presentation: {
    id: 'south-dock-pier-water',
    anchors: [
      { id: 'pier-upper', x: 34, y: 49, zIndex: 3, facing: 'right', scale: 0.82 },
      { id: 'pier-upper-mid', x: 43, y: 56, zIndex: 4, facing: 'right', scale: 0.88 },
      { id: 'pier-lower-mid', x: 53, y: 64, zIndex: 5, facing: 'right', scale: 0.94 },
      { id: 'pier-lower', x: 63, y: 72, zIndex: 6, facing: 'right', scale: 1 }
    ]
  },
  catches: {
    net: [
      { item: 'uncooked_shrimp', name: 'Uncooked Shrimp', weight: 1 }
    ],
    rod: [
      { item: 'sardine', name: 'Sardine', weight: 1 }
    ]
  }
};
