import { ASSETS, LEGACY_UNRESOLVED_ASSETS } from '../core/assets';
import type { Room, RoomId } from '../core/types';

export const ROOMS: Record<RoomId, Room> = {
  glassmarket: {
    id: 'glassmarket',
    district: 'South Dock',
    name: 'Glassmarket Transit Concourse',
    slogan: 'TRADE. TRAVEL. TRY TO STAY ALIVE.',
    description:
      'Rainwater drips from the glass canopy as crowds flow through. Street vendors, travellers and fixers jostle beneath a sky of neon. A signed underpass leads toward the local breaker yard.',
    sceneImage: LEGACY_UNRESOLVED_ASSETS.glassmarketScene,
    actions: [
      {
        label: 'Head to Breaker Yard 12',
        detail: 'Take the service underpass behind the market',
        type: 'goto-breaker-yard'
      },
      {
        label: 'Head to South Dock Pier',
        detail: 'Follow the waterfront route to the pier',
        type: 'goto-south-dock-pier'
      },
      {
        label: 'Inspect the departures board',
        detail: 'A harmless local interaction',
        type: 'inspect-board'
      }
    ]
  },
  'breaker-yard': {
    id: 'breaker-yard',
    district: 'South Dock',
    name: 'Breaker Yard 12',
    slogan: 'SALVAGE. SORT. SELL.',
    description:
      'A rain-slick salvage lot under the overpass, filled with dead machinery, stacked containers and fenced work zones. It is practical, noisy, and exactly the sort of place where useful scrap turns into a living.',
    sceneImage: ASSETS.environments.southDock.breakerYard12,
    actions: [
      {
        label: 'Salvage Tier 1 Scrap',
        detail: 'Work the current node for basic materials',
        type: 'start-salvaging'
      },
      {
        label: 'Return to Glassmarket',
        detail: 'Head back through the underpass',
        type: 'goto-glassmarket'
      }
    ]
  },
  'south-dock-pier': {
    id: 'south-dock-pier',
    district: 'South Dock',
    name: 'South Dock Pier',
    slogan: 'SOUTH DOCK WATERFRONT',
    description:
      'Rain stipples the harbour beside a working industrial pier, where small fishing spots gather between the lights and wakes.',
    sceneImage: ASSETS.environments.southDock.pier,
    actions: [
      {
        label: 'Net for Uncooked Shrimp',
        detail: 'Equip a Fishing Net in Main Hand and work the shrimp spot',
        type: 'start-fishing-shrimp'
      },
      {
        label: 'Fish for Sardines',
        detail: 'Equip a Fishing Rod in Main Hand and work the sardine spot',
        type: 'start-fishing-sardine'
      },
      {
        label: 'Return to Glassmarket',
        detail: 'Follow the waterfront route back to the transit concourse',
        type: 'goto-glassmarket'
      }
    ]
  }
};

export function getRoom(roomId: RoomId): Room {
  return ROOMS[roomId];
}
