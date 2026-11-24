import type { FileNodeRecord } from '../../types/indexer';
import {
  pickClearCorridorX,
  type CorridorReservation,
  type EdgeNodeBound,
} from './edgeRouting';

export interface RawDashedSpec {
  id: string;
  sourceId: string;
  targetId: string;
  color: string;
  dashArray: string;
  markerSize: number;
  isHighlighted: boolean;
  isAnimatedFlow: boolean;
  forceBadge: boolean;
  shortTag: string;
  hoverLabel: string;
  label?: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  isDownward: boolean;
  preferLeft: boolean;
  baseOffset: number;
  sourceOffsetX: number;
  targetOffsetX: number;
  approachTier: number;
  corridorSlot: number;
  laneIndex: number;
  fixedCorridorX?: number;
}

export function getHalfWidth(
  id: string,
  visibleRecords: FileNodeRecord[],
  boundsMap: Map<string, EdgeNodeBound>
): number {
  const b = boundsMap.get(id);
  if (!b) return 52;
  let minL = b.left;
  let maxR = b.right;
  for (const r of visibleRecords) {
    if (r.parentId !== id || r.type !== 'symbol') continue;
    const sb = boundsMap.get(r.id);
    if (sb) {
      minL = Math.min(minL, sb.left);
      maxR = Math.max(maxR, sb.right);
    }
  }
  return Math.max((b.right - b.left) / 2, (maxR - minL) / 2);
}

export function coordinateDashedSpecs(
  specs: RawDashedSpec[],
  visibleRecords: FileNodeRecord[],
  boundsMap: Map<string, EdgeNodeBound>
): EdgeNodeBound[] {
  const byTarget = new Map<string, RawDashedSpec[]>();
  const bySource = new Map<string, RawDashedSpec[]>();

  for (const s of specs) {
    const tList = byTarget.get(s.targetId) ?? [];
    tList.push(s);
    byTarget.set(s.targetId, tList);
    const sList = bySource.get(s.sourceId) ?? [];
    sList.push(s);
    bySource.set(s.sourceId, sList);
  }

  for (const group of byTarget.values()) {
    group.sort((a, b) => a.sx - b.sx || a.sy - b.sy || a.id.localeCompare(b.id));
    const step = group.length > 1 ? Math.min(8, 22 / (group.length - 1)) : 0;
    group.forEach((s, idx) => {
      s.targetOffsetX = group.length > 1 ? (idx - (group.length - 1) / 2) * step : 0;
    });

    const leftUp = group.filter((s) => !s.isDownward && s.preferLeft).sort((a, b) => (a.tx - a.sx) - (b.tx - b.sx));
    const rightUp = group.filter((s) => !s.isDownward && !s.preferLeft).sort((a, b) => (a.sx - a.tx) - (b.sx - b.tx));
    const down = group.filter((s) => s.isDownward).sort((a, b) => a.sx - b.sx || a.id.localeCompare(b.id));

    leftUp.forEach((s, i) => {
      s.corridorSlot = i;
      s.approachTier = i;
    });
    rightUp.forEach((s, i) => {
      s.corridorSlot = i;
      s.approachTier = i;
    });
    const maxSideTier = Math.max(leftUp.length, rightUp.length);
    down.forEach((s, i) => {
      s.approachTier = maxSideTier + i;
      s.corridorSlot = i;
    });
  }

  for (const group of bySource.values()) {
    if (group.length <= 1) continue;
    group.sort((a, b) => a.tx - b.tx || a.ty - b.ty || a.id.localeCompare(b.id));
    const step = Math.min(7, 18 / (group.length - 1));
    group.forEach((s, idx) => {
      s.sourceOffsetX = (idx - (group.length - 1) / 2) * step;
    });
  }

  const upSpecs = specs
    .filter((s) => !s.isDownward)
    .sort((a, b) => Math.abs(a.tx - a.sx) - Math.abs(b.tx - b.sx) || a.corridorSlot - b.corridorSlot || a.id.localeCompare(b.id));
  upSpecs.forEach((s, idx) => {
    s.laneIndex = idx;
  });

  const obstacles = Array.from(boundsMap.values());
  const reservedCorridors: CorridorReservation[] = [];
  for (const s of upSpecs) {
    if (!boundsMap.has(s.targetId)) continue;
    const targetHalfW = getHalfWidth(s.targetId, visibleRecords, boundsMap);
    const topY = s.ty - 22 - s.approachTier * 16;
    const laneY = Math.max(s.sy, s.ty) + s.baseOffset + s.laneIndex * 28;
    const preferredX = s.tx + (s.preferLeft ? -(targetHalfW + 20 + s.corridorSlot * 18) : targetHalfW + 20 + s.corridorSlot * 18);
    const chosenX = pickClearCorridorX({
      preferredX,
      targetX: s.tx,
      targetHalfW,
      preferLeft: s.preferLeft,
      yMin: topY,
      yMax: laneY,
      slotIndex: s.corridorSlot,
      obstacles,
      excludeIds: new Set([s.sourceId, s.targetId]),
      reservedCorridors,
    });
    s.fixedCorridorX = chosenX;
    reservedCorridors.push({ x: chosenX, yMin: topY - 8, yMax: laneY + 8 });
  }

  return obstacles;
}
