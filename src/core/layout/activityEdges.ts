import { MarkerType, type Edge } from '@xyflow/react';
import type { FileEdgeRecord, FileNodeRecord } from '../../types/indexer';
import type { ActivityKind } from '../../types/protocol';

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
  }
): Edge[] {
  const visibleSet = new Set(visibleRecords.map((r) => r.id));
  const nodeTypeMap = new Map(visibleRecords.map((r) => [r.id, r.type]));

  const baseEdges: Edge[] = edgeRecords
    .filter((edge) => {
      if (!visibleSet.has(edge.sourceId) || !visibleSet.has(edge.targetId)) return false;
      if (edge.relationType === 'contains') return true;
      const touchesSelection =
        options.selectedNodeId !== null &&
        (edge.sourceId === options.selectedNodeId || edge.targetId === options.selectedNodeId);
      const touchesActive = options.activeMap.has(edge.sourceId) || options.activeMap.has(edge.targetId);
      return options.showImportEdges || touchesSelection || touchesActive;
    })
    .map((edge) => {
      const isContains = edge.relationType === 'contains';
      const isSymbolStem = isContains && nodeTypeMap.get(edge.targetId) === 'symbol';
      const touchesSelection =
        options.selectedNodeId !== null &&
        (edge.sourceId === options.selectedNodeId || edge.targetId === options.selectedNodeId);
      const targetActivity = options.activeMap.get(edge.targetId);
      const sourceActivity = options.activeMap.get(edge.sourceId);
      const activeAction = targetActivity ?? sourceActivity;
      const isAnimatedFlow = Boolean(activeAction) && (isContains ? Boolean(targetActivity) : true);

      if (isContains) {
        const stroke = isAnimatedFlow
          ? getActivityColor(targetActivity)
          : touchesSelection
            ? '#38BDF8'
            : isSymbolStem
              ? '#64748B'
              : '#94A3B8';
        return {
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          type: isSymbolStem ? 'straight' : 'smoothstep',
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
        };
      }

      const importColor = isAnimatedFlow
        ? getActivityColor(activeAction)
        : edge.relationType === 'imports'
          ? '#38BDF8'
          : '#F59E0B';
      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'default',
        animated: touchesSelection || isAnimatedFlow,
        className: isAnimatedFlow ? 'edge-flow-active' : undefined,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: importColor },
        style: {
          stroke: importColor,
          strokeWidth: isAnimatedFlow ? 2.4 : touchesSelection ? 2 : 1.2,
          strokeDasharray: '5 4',
          opacity: isAnimatedFlow || touchesSelection ? 0.98 : 0.3,
        },
      };
    });

  for (const transfer of options.liveTransfers ?? []) {
    if (!visibleSet.has(transfer.fromNodeId) || !visibleSet.has(transfer.toNodeId)) continue;
    if (transfer.fromNodeId === transfer.toNodeId) continue;
    const color = getActivityColor(transfer.action);
    baseEdges.push({
      id: `live:${transfer.id}`,
      source: transfer.fromNodeId,
      target: transfer.toNodeId,
      type: 'default',
      animated: true,
      className: 'edge-flow-active',
      label: transfer.label,
      labelStyle: { fill: '#F8FAFC', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 600 },
      labelBgStyle: { fill: '#0F172A', fillOpacity: 0.92 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
      style: { stroke: color, strokeWidth: 2.8, strokeDasharray: '6 4', opacity: 1 },
    });
  }

  return baseEdges;
}
