import { MarkerType, type Edge } from '@xyflow/react';
import type { FileEdgeRecord, FileNodeRecord } from '../../types/indexer';
import type { ActivityKind } from '../../types/protocol';
import { computeSpanBaseOffset, type EdgeNodeBound } from './edgeRouting';

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
  const relationEdges: FileEdgeRecord[] = [];

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
        type: isSymbolStem ? 'straight' : 'smoothstep',
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
    const touchesActive = options.activeMap.has(edge.sourceId) || options.activeMap.has(edge.targetId);
    if (options.showImportEdges || touchesSelection || touchesActive) {
      relationEdges.push(edge);
    }
  }

  let dashedLane = 0;
  const totalDashed = relationEdges.length + (options.liveTransfers?.length ?? 0);
  const dashedEdges: Edge[] = relationEdges.map((edge) => {
    const touchesSelection =
      options.selectedNodeId !== null &&
      (edge.sourceId === options.selectedNodeId || edge.targetId === options.selectedNodeId);
    const activeAction = options.activeMap.get(edge.targetId) ?? options.activeMap.get(edge.sourceId);
    const isAnimatedFlow = Boolean(activeAction);
    const srcName = visibleMap.get(edge.sourceId)?.name ?? edge.sourceId;
    const dstName = visibleMap.get(edge.targetId)?.name ?? edge.targetId;
    const isImport = edge.relationType === 'imports';
    const color = isAnimatedFlow ? getActivityColor(activeAction) : isImport ? '#38BDF8' : '#F59E0B';
    const laneIndex = dashedLane++;
    const baseOffset = computeSpanBaseOffset(edge.sourceId, edge.targetId, boundsMap);
    const shelfShift = ((laneIndex % 5) - 2) * 14;

    return {
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      type: 'dashedRelation',
      zIndex: 0,
      animated: touchesSelection || isAnimatedFlow,
      className: isAnimatedFlow ? 'edge-flow-active' : undefined,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color },
      data: {
        color,
        dashArray: isImport ? '6 4' : '2 4',
        laneIndex,
        baseOffset,
        shelfShift,
        isHighlighted: touchesSelection,
        isAnimatedFlow,
        showBadge: touchesSelection || isAnimatedFlow || totalDashed <= 10,
        shortTag: `${isImport ? 'imp' : 'ref'} → ${dstName}`,
        hoverLabel: `${srcName} → ${dstName} (${isImport ? 'importa' : 'referencia'})`,
      },
    };
  });

  for (const transfer of options.liveTransfers ?? []) {
    if (!visibleMap.has(transfer.fromNodeId) || !visibleMap.has(transfer.toNodeId)) continue;
    if (transfer.fromNodeId === transfer.toNodeId) continue;
    const color = getActivityColor(transfer.action);
    const srcName = visibleMap.get(transfer.fromNodeId)?.name ?? transfer.fromNodeId;
    const dstName = visibleMap.get(transfer.toNodeId)?.name ?? transfer.toNodeId;
    const laneIndex = dashedLane++;

    dashedEdges.push({
      id: `live:${transfer.id}`,
      source: transfer.fromNodeId,
      target: transfer.toNodeId,
      type: 'dashedRelation',
      zIndex: 0,
      animated: true,
      className: 'edge-flow-active',
      label: transfer.label,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
      data: {
        color,
        dashArray: '7 4',
        laneIndex,
        baseOffset: computeSpanBaseOffset(transfer.fromNodeId, transfer.toNodeId, boundsMap),
        shelfShift: ((laneIndex % 5) - 2) * 14,
        isHighlighted: true,
        isAnimatedFlow: true,
        showBadge: true,
        shortTag: transfer.label,
        hoverLabel: `${srcName} → ${dstName} (${transfer.label})`,
      },
    });
  }

  return [...containsEdges, ...dashedEdges];
}
