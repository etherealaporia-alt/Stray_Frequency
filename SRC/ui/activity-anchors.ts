import type { ActivityAnchor, NodePresentation } from '../core/presentation-types';

const localAssignments = new Map<string, string>();

function assignmentKey(nodeId: string, actorId: string): string {
  return `${nodeId}:${actorId}`;
}

/**
 * Assign an anchor for one activity session. Occupancy is deliberately a
 * rendering concern only: callers may still gather when no visual slot exists.
 *
 * `occupiedAnchorIds` is ready for multiplayer scene data. The local actor can
 * fall back to any anchor when all are visually occupied; that overwrite is
 * client-local and never changes another player's gameplay state.
 */
export function assignActivityAnchor(
  presentation: NodePresentation,
  actorId: string,
  occupiedAnchorIds: ReadonlySet<string> = new Set()
): ActivityAnchor | null {
  if (presentation.anchors.length === 0) return null;

  const key = assignmentKey(presentation.id, actorId);
  const existingId = localAssignments.get(key);
  const existing = presentation.anchors.find((anchor) => anchor.id === existingId);
  if (existing) return existing;

  const available = presentation.anchors.filter(
    (anchor) => !occupiedAnchorIds.has(anchor.id)
  );
  const pool = available.length > 0 ? available : presentation.anchors;
  const chosen = pool[Math.floor(Math.random() * pool.length)] ?? null;
  if (chosen) localAssignments.set(key, chosen.id);
  return chosen;
}

export function releaseActivityAnchor(nodeId: string, actorId: string): void {
  localAssignments.delete(assignmentKey(nodeId, actorId));
}

export function activityAnchorStyle(anchor: ActivityAnchor): string {
  const facingScale = anchor.facing === 'left' ? -1 : 1;
  const scale = anchor.scale ?? 1;
  return [
    `--activity-anchor-x:${anchor.x}%`,
    `--activity-anchor-y:${anchor.y}%`,
    `--activity-anchor-z:${anchor.zIndex}`,
    `--activity-anchor-facing:${facingScale}`,
    `--activity-anchor-scale:${scale}`
  ].join(';');
}
