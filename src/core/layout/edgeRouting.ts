export interface EdgeNodeBound {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface CorridorReservation {
  x: number;
  yMin: number;
  yMax: number;
}

export function buildRoundedPolylinePath(points: Point2D[], radius = 10): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  const cmds: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.hypot(dx1, dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.hypot(dx2, dy2);

    if (len1 < 0.5 || len2 < 0.5) {
      cmds.push(`L ${curr.x} ${curr.y}`);
      continue;
    }

    const r = Math.min(radius, len1 / 2, len2 / 2);
    const inX = curr.x - (dx1 / len1) * r;
    const inY = curr.y - (dy1 / len1) * r;
    const outX = curr.x + (dx2 / len2) * r;
    const outY = curr.y + (dy2 / len2) * r;

    cmds.push(`L ${inX.toFixed(1)} ${inY.toFixed(1)} Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${outX.toFixed(1)} ${outY.toFixed(1)}`);
  }
  const last = points[points.length - 1];
  cmds.push(`L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`);
  return cmds.join(' ');
}

export function computeTreeBusPath(params: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  busDrop?: number;
}): string {
  const { sourceX, sourceY, targetX, targetY } = params;
  const busDrop = params.busDrop ?? 28;
  if (Math.abs(targetX - sourceX) < 1) {
    return `M ${sourceX.toFixed(1)} ${sourceY.toFixed(1)} L ${targetX.toFixed(1)} ${targetY.toFixed(1)}`;
  }
  const maxDrop = Math.max(12, (targetY - sourceY) * 0.55);
  const busY = targetY > sourceY + 24 ? sourceY + Math.min(busDrop, maxDrop) : (sourceY + targetY) / 2;
  return buildRoundedPolylinePath(
    [
      { x: sourceX, y: sourceY },
      { x: sourceX, y: busY },
      { x: targetX, y: busY },
      { x: targetX, y: targetY },
    ],
    10
  );
}

function isXBlocked(
  x: number,
  yMin: number,
  yMax: number,
  obstacles: EdgeNodeBound[],
  excludeIds: Set<string>,
  reservedCorridors: CorridorReservation[] = []
): boolean {
  const pad = 12;
  for (const b of obstacles) {
    if (excludeIds.has(b.id)) continue;
    if (b.bottom < yMin || b.top > yMax) continue;
    if (x >= b.left - pad && x <= b.right + pad) return true;
  }
  const corridorGap = 17;
  for (const c of reservedCorridors) {
    if (c.yMax < yMin || c.yMin > yMax) continue;
    if (Math.abs(x - c.x) < corridorGap) return true;
  }
  return false;
}

export function pickClearCorridorX(params: {
  preferredX: number;
  targetX: number;
  targetHalfW: number;
  preferLeft: boolean;
  yMin: number;
  yMax: number;
  slotIndex: number;
  obstacles: EdgeNodeBound[];
  excludeIds: Set<string>;
  reservedCorridors?: CorridorReservation[];
}): number {
  const { targetX, targetHalfW, preferLeft, yMin, yMax, slotIndex, obstacles, excludeIds, reservedCorridors } = params;
  const baseDist = targetHalfW + 20 + slotIndex * 18;
  const sideA = preferLeft ? -1 : 1;
  const sideB = -sideA;

  const candidates: number[] = [];
  for (let step = 0; step < 10; step++) {
    const dist = baseDist + step * 18;
    candidates.push(targetX + sideA * dist);
  }
  for (let step = 0; step < 6; step++) {
    const dist = targetHalfW + 20 + step * 18;
    candidates.push(targetX + sideB * dist);
  }

  for (const cx of candidates) {
    if (!isXBlocked(cx, yMin, yMax, obstacles, excludeIds, reservedCorridors)) {
      return cx;
    }
  }
  return params.preferredX;
}

function pickSafeLabelX(xA: number, xB: number, laneIndex: number): number {
  const minX = Math.min(xA, xB);
  const maxX = Math.max(xA, xB);
  const span = maxX - minX;
  const ratios = [0.5, 0.28, 0.72, 0.39, 0.61];
  const raw = minX + span * ratios[laneIndex % ratios.length];
  if (span >= 120) {
    return Math.max(minX + 54, Math.min(maxX - 54, raw));
  }
  if (span >= 68) {
    return Math.max(minX + 30, Math.min(maxX - 30, raw));
  }
  return (minX + maxX) / 2;
}

export function computeDashedLaneGeometry(params: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  laneIndex: number;
  baseOffset?: number;
  shelfShift?: number;
  sourceOffsetX?: number;
  targetOffsetX?: number;
  approachTier?: number;
  corridorSlot?: number;
  expectedTargetX?: number;
  fixedCorridorX?: number;
  sourceHalfW?: number;
  targetHalfW?: number;
  sourceId?: string;
  targetId?: string;
  obstacles?: EdgeNodeBound[];
}): { path: string; labelX: number; labelY: number } {
  const { sourceX, sourceY, targetX, targetY, laneIndex } = params;
  const baseOffset = params.baseOffset ?? 56;
  const shelfShift = params.shelfShift ?? 0;
  const obstacles = params.obstacles ?? [];
  const targetHalfW = params.targetHalfW ?? 52;
  const sourceOffsetX = params.sourceOffsetX ?? 0;
  const targetOffsetX = params.targetOffsetX ?? 0;
  const approachTier = params.approachTier ?? (laneIndex % 4);
  const corridorSlot = params.corridorSlot ?? (laneIndex % 4);
  const startX = sourceX + sourceOffsetX;
  const endX = targetX + targetOffsetX;
  const excludeIds = new Set<string>([params.sourceId ?? '', params.targetId ?? '']);

  if (targetY > sourceY + 54) {
    const minDrop = sourceY + 24;
    const desiredY = targetY - 22 - approachTier * 16;
    const clampedY = Math.max(minDrop, Math.min(targetY - 18, desiredY));
    const exitY = Math.min(clampedY - 8, sourceY + 18 + (laneIndex % 3) * 8);
    const preferLeft = startX <= endX;
    const clearX = obstacles.length > 0
      ? pickClearCorridorX({
          preferredX: startX,
          targetX: endX,
          targetHalfW: Math.max(params.sourceHalfW ?? 48, 40),
          preferLeft: !preferLeft,
          yMin: sourceY + 10,
          yMax: clampedY,
          slotIndex: corridorSlot,
          obstacles,
          excludeIds,
        })
      : startX;

    const useDetour = obstacles.length > 0 && isXBlocked(startX, sourceY + 18, clampedY - 8, obstacles, excludeIds);
    const points: Point2D[] = useDetour
      ? [
          { x: startX, y: sourceY },
          { x: startX, y: exitY },
          { x: clearX, y: exitY },
          { x: clearX, y: clampedY },
          { x: endX, y: clampedY },
          { x: endX, y: targetY },
        ]
      : [
          { x: startX, y: sourceY },
          { x: startX, y: clampedY },
          { x: endX, y: clampedY },
          { x: endX, y: targetY },
        ];

    const startLegX = useDetour ? clearX : startX;
    return {
      path: buildRoundedPolylinePath(points, 8),
      labelX: pickSafeLabelX(startLegX, endX, laneIndex),
      labelY: clampedY,
    };
  }

  const laneY = Math.max(sourceY, targetY) + baseOffset + laneIndex * 28;
  const spanX = endX - startX;
  const preferLeft = Math.abs(spanX) < 36 ? false : spanX > 0;
  const defaultEntryX = targetX + (preferLeft ? -(targetHalfW + 20 + corridorSlot * 18) : targetHalfW + 20 + corridorSlot * 18);
  const topApproachY = targetY - 22 - approachTier * 16;
  const canReuseFixed =
    params.fixedCorridorX !== undefined &&
    params.expectedTargetX !== undefined &&
    Math.abs(targetX - params.expectedTargetX) < 2;

  const entryX = canReuseFixed
    ? params.fixedCorridorX!
    : obstacles.length > 0
      ? pickClearCorridorX({
          preferredX: defaultEntryX,
          targetX,
          targetHalfW,
          preferLeft,
          yMin: topApproachY,
          yMax: laneY,
          slotIndex: corridorSlot,
          obstacles,
          excludeIds,
        })
      : defaultEntryX;

  const adjustedLaneY = laneY + shelfShift * 0.25;
  const points: Point2D[] = [
    { x: startX, y: sourceY },
    { x: startX, y: adjustedLaneY },
    { x: entryX, y: adjustedLaneY },
    { x: entryX, y: topApproachY },
    { x: endX, y: topApproachY },
    { x: endX, y: targetY },
  ];

  return {
    path: buildRoundedPolylinePath(points, 8),
    labelX: pickSafeLabelX(startX, entryX, laneIndex),
    labelY: adjustedLaneY,
  };
}

export function computeSpanBaseOffset(
  sourceId: string,
  targetId: string,
  boundsMap: Map<string, EdgeNodeBound>
): number {
  const src = boundsMap.get(sourceId);
  const dst = boundsMap.get(targetId);
  if (!src || !dst) return 58;

  const minX = Math.min(src.left, dst.left) - 20;
  const maxX = Math.max(src.right, dst.right) + 20;
  const rowBottom = Math.max(src.bottom, dst.bottom);
  let maxSymbolBottom = rowBottom;

  for (const bound of boundsMap.values()) {
    if (bound.right < minX || bound.left > maxX) continue;
    if (bound.top >= Math.min(src.top, dst.top) - 10 && bound.bottom <= rowBottom + 180) {
      if (bound.bottom > maxSymbolBottom) {
        maxSymbolBottom = bound.bottom;
      }
    }
  }

  return Math.max(54, maxSymbolBottom - rowBottom + 28);
}
