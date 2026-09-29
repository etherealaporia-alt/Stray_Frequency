import type { NodePresentation } from '../core/presentation-types';

/**
 * Presentation only. Anchor count never limits gathering participation.
 * Each node owns its geometry and depth ordering.
 */
export const NODE_PRESENTATIONS = {
  breakerYardTier1Scrap: {
    id: 'breaker-yard-tier-1-scrap',
    anchors: [
      { id: 'upper',       x: 43, y: 38, zIndex: 3, facing: 'right' },
      { id: 'upper-mid',   x: 38, y: 51, zIndex: 4, facing: 'right' },
      { id: 'lower-mid',   x: 37, y: 65, zIndex: 5, facing: 'right' },
      { id: 'lower',       x: 42, y: 78, zIndex: 6, facing: 'right' }
    ]
  }
} as const satisfies Record<string, NodePresentation>;
