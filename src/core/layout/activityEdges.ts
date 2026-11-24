import { MarkerType, type Edge } from '@xyflow/react';
import type { FileEdgeRecord, FileNodeRecord } from '../../types/indexer';
import type { ActivityKind } from '../../types/protocol';
import { computeSpanBaseOffset, type EdgeNodeBound } from './edgeRouting';
import { coordinateDashedSpecs, getHalfWidth, type RawDashedSpec } from './dashedCoordination';

export interface LiveTransferEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  action: ActivityKind;
  label: string;
}

export function getActivityColor(action?: ActivityKind): string {
  switch (action) {
    case 'edit':
      return '#F59E0B';
    case 'create':
      return '#34D399';
    case 'move':
      return '#A78BFA';
    case 'delete':
      return '#FB7185';
    case 'read':
    case 'search':
    case 'mcp_query':
      return '#38BDF8';
    default:
      return '#94A3B8';
  }
}

export function buildActiveAncestorMap(
  records: FileNodeRecord[],
  activeNodeActivities?: Map<string, ActivityKind>
): Map<string, ActivityKind> {
  const result = new Map<string, ActivityKind>();
  if (!activeNodeActivities || activeNodeActivities.size === 0) return result;

  const byId = new Map(records.map((r) => [r.id, r]));
  for (const [nodeId, action] of activeNodeActivities.entries()) {
    result.set(nodeId, action);
    let curr = byId.get(nodeId)?.parentId ?? null;
    const guard = new Set<string>();
    while (curr && !guard.has(curr)) {
      guard.add(curr);
      if (!result.has(curr)) result.set(curr, action);
      curr = byId.get(curr)?.parentId ?? null;
    }
  }
  return result;
}

function makeDashedSpec(params: {
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
  boundsMap: Map<string, EdgeNodeBound>;
}): RawDashedSpec {
  const sb = params.boundsMap.get(params.sourceId);
  const tb = params.boundsMap.get(params.targetId);
  const sx = sb ? (sb.left + sb.right) / 2 : 0;
  const sy = sb?.bottom ?? 0;
  const tx = tb ? (tb.left + tb.right) / 2 : 0;
  const ty = tb?.top ?? 0;
  const spanX = tx - sx;

  return {
    id: params.id,
    sourceId: params.sourceId,
    targetId: params.targetId,
    color: params.color,
    dashArray: params.dashArray,
    markerSize: params.markerSize,
    isHighlighted: params.isHighlighted,
    isAnimatedFlow: params.isAnimatedFlow,
    forceBadge: params.forceBadge,
    shortTag: params.shortTag,
    hoverLabel: params.hoverLabel,
    label: params.label,
    sx,
    sy,
    tx,
    ty,
    isDownward: Boolean(sb && tb && ty > sy + 54),
    preferLeft: Math.abs(spanX) >= 36 && spanX > 0,
    baseOffset: computeSpanBaseOffset(params.sourceId, params.targetId, params.boundsMap),
    sourceOffsetX: 0,
    targetOffsetX: 0,
    approachTier: 0,
    corridorSlot: 0,
    laneIndex: 0,
  };
}

export function buildStructuralEdges(
  edgeRecords: FileEdgeRecord[],
  visibleRecords: FileNodeRecord[],
  options: {
    selectedNodeId: string | null;
    showImportEdges: boolean;
    activeMap: Map<string, ActivityKind>;
    liveTransfers?: LiveTransferEdge[];
    nodeBounds?: Map<string, EdgeNodeBound>;
  }
): Edge[] {
  const visibleMap = new Map(visibleRecords.map((r) => [r.id, r]));
  const boundsMap = options.nodeBounds ?? new Map<string, EdgeNodeBound>();
  const containsEdges: Edge[] = [];
  const specs: RawDashedSpec[] = [];

  for (const edge of edgeRecords) {
    if (!visibleMap.has(edge.sourceId) || !visibleMap.has(edge.targetId)) continue;
    if (edge.relationType === 'contains') {
      const targetRec = visibleMap.get(edge.targetId);
      const isSymbolStem = targetRec?.type === 'symbol';
      const touchesSelection =
        options.selectedNodeId !== null &&
        (edge.sourceId === options.selectedNodeId || edge.targetId === options.selectedNodeId);
      const targetActivity = options.activeMap.get(edge.targetId);
      const isAnimatedFlow = Boolean(targetActivity);
      const stroke = isAnimatedFlow
        ? getActivityColor(targetActivity)
        : touchesSelection
          ? '#38BDF8'
          : isSymbolStem
            ? '#64748B'
            : '#94A3B8';

      containsEdges.push({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: isSymbolStem ? 'straight' : 'treeBus',
        zIndex: 0,
        animated: isAnimatedFlow,
        className: isAnimatedFlow ? 'edge-flow-active' : undefined,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: isSymbolStem ? 11 : 16,
          height: isSymbolStem ? 11 : 16,
          color: stroke,
        },
        style: {
          stroke,
          strokeWidth: isAnimatedFlow ? 2.6 : touchesSelection ? 2.6 : isSymbolStem ? 1.35 : 1.9,
          opacity: isAnimatedFlow || touchesSelection ? 1 : isSymbolStem ? 0.85 : 0.92,
        },
      });
      continue;
    }

    const touchesSelection =
      options.selectedNodeId !== null &&
      (edge.sourceId === options.selectedNodeId || edge.targetId === options.selectedNodeId);
    const activeAction = options.activeMap.get(edge.targetId) ?? options.activeMap.get(edge.sourceId);
    if (!options.showImportEdges && !touchesSelection && !activeAction) continue;

    const isImport = edge.relationType === 'imports';
    const isAnimatedFlow = Boolean(activeAction);
    const srcName = visibleMap.get(edge.sourceId)?.name ?? edge.sourceId;
    const dstName = visibleMap.get(edge.targetId)?.name ?? edge.targetId;
    specs.push(
      makeDashedSpec({
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        color: isAnimatedFlow ? getActivityColor(activeAction) : isImport ? '#38BDF8' : '#F59E0B',
        dashArray: isImport ? '6 4' : '2 4',
        markerSize: 14,
        isHighlighted: touchesSelection,
        isAnimatedFlow,
        forceBadge: touchesSelection || isAnimatedFlow,
        shortTag: `${isImport ? 'imp' : 'ref'} → ${dstName}`,
        hoverLabel: `${srcName} → ${dstName} (${isImport ? 'importa' : 'referencia'})`,
        boundsMap,
      })
    );
  }

  for (const transfer of options.liveTransfers ?? []) {
    if (!visibleMap.has(transfer.fromNodeId) || !visibleMap.has(transfer.toNodeId)) continue;
    if (transfer.fromNodeId === transfer.toNodeId) continue;
    const srcName = visibleMap.get(transfer.fromNodeId)?.name ?? transfer.fromNodeId;
    const dstName = visibleMap.get(transfer.toNodeId)?.name ?? transfer.toNodeId;
    specs.push(
      makeDashedSpec({
        id: `live:${transfer.id}`,
        sourceId: transfer.fromNodeId,
        targetId: transfer.toNodeId,
        color: getActivityColor(transfer.action),
        dashArray: '7 4',
        markerSize: 16,
        isHighlighted: true,
        isAnimatedFlow: true,
        forceBadge: true,
        label: transfer.label,
        shortTag: transfer.label,
        hoverLabel: `${srcName} → ${dstName} (${transfer.label})`,
        boundsMap,
      })
    );
  }

  const obstacles = coordinateDashedSpecs(specs, visibleRecords, boundsMap);
  const totalDashed = specs.length;

  const dashedEdges: Edge[] = specs.map((s) => ({
    id: s.id,
    source: s.sourceId,
    target: s.targetId,
    type: 'dashedRelation',
    zIndex: 0,
    animated: s.isHighlighted || s.isAnimatedFlow,
    className: s.isAnimatedFlow ? 'edge-flow-active' : undefined,
    ...(s.label ? { label: s.label } : {}),
    markerEnd: { type: MarkerType.ArrowClosed, width: s.markerSize, height: s.markerSize, color: s.color },
    data: {
      color: s.color,
      dashArray: s.dashArray,
      laneIndex: s.laneIndex,
      baseOffset: s.baseOffset,
      shelfShift: 0,
      sourceOffsetX: s.sourceOffsetX,
      targetOffsetX: s.targetOffsetX,
      approachTier: s.approachTier,
      corridorSlot: s.corridorSlot,
      expectedTargetX: s.tx,
      fixedCorridorX: s.fixedCorridorX,
      sourceHalfW: getHalfWidth(s.sourceId, visibleRecords, boundsMap),
      targetHalfW: getHalfWidth(s.targetId, visibleRecords, boundsMap),
      obstacles,
      isHighlighted: s.isHighlighted,
      isAnimatedFlow: s.isAnimatedFlow,
      showBadge: s.forceBadge || totalDashed <= 4,
      shortTag: s.shortTag,
      hoverLabel: s.hoverLabel,
    },
  }));

  return [...containsEdges, ...dashedEdges];
}
