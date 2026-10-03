export interface ActivityAnchor {
  id: string;
  /** Horizontal position as a percentage of the scene stage. */
  x: number;
  /** Vertical position as a percentage measured from the top of the scene stage. */
  y: number;
  /** Explicit actor depth. Higher values render in front. */
  zIndex: number;
  facing?: 'left' | 'right';
  scale?: number;
}

export interface NodePresentation {
  id: string;
  anchors: readonly ActivityAnchor[];
}
