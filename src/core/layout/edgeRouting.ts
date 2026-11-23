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

export function computeDashedLaneGeometry(params: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  laneIndex: number;
  baseOffset?: number;
  shelfShift?: number;
}): { path: string; labelX: number; labelY: number } {
  const { sourceX, sourceY, targetX, targetY, laneIndex } = params;
  const baseOffset = params.baseOffset ?? 56;
  const shelfShift = params.shelfShift ?? 0;

  if (targetY > sourceY + 54) {
    const midY = sourceY + (targetY - sourceY) * 0.5 + shelfShift;
    const clampedY = Math.max(sourceY + 18, Math.min(targetY - 18, midY));
    const points: Point2D[] = [
      { x: sourceX, y: sourceY },
      { x: sourceX, y: clampedY },
      { x: targetX, y: clampedY },
      { x: targetX, y: targetY },
    ];
    return {
      path: buildRoundedPolylinePath(points, 10),
      labelX: (sourceX + targetX) / 2,
      labelY: clampedY,
    };
  }

  const laneY = Math.max(sourceY, targetY) + baseOffset + laneIndex * 22;
  const spanX = targetX - sourceX;
  const approachOffset = Math.abs(spanX) < 36 ? 38 : spanX > 0 ? -24 : 24;
  const entryX = targetX + approachOffset;
  const topApproachY = targetY - 22;

  const points: Point2D[] = [
    { x: sourceX, y: sourceY },
    { x: sourceX, y: laneY },
    { x: entryX, y: laneY },
    { x: entryX, y: topApproachY },
    { x: targetX, y: topApproachY },
    { x: targetX, y: targetY },
  ];

  return {
    path: buildRoundedPolylinePath(points, 10),
    labelX: (sourceX + entryX) / 2,
    labelY: laneY,
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

  return Math.max(54, maxSymbolBottom - rowBottom + 26);
}
