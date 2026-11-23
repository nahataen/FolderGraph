import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { FileEdgeRecord, FileNodeRecord, NodeDisplayMode, NodeVisualTheme } from '../../types/indexer';
import type { ActivityKind } from '../../types/protocol';
import {
  buildActiveAncestorMap,
  buildStructuralEdges,
  type LiveTransferEdge,
} from './activityEdges';
import type { EdgeNodeBound } from './edgeRouting';
import {
  areSymbolsExpanded,
  getSymbolGroupFootprint,
  layoutParentSymbols,
  type StructuralFlowNodeData,
} from './symbolLayout';

export type { LiveTransferEdge, StructuralFlowNodeData };

function getNodeDimensions(
  node: FileNodeRecord,
  displayMode: NodeDisplayMode,
  isFocused: boolean
): { width: number; height: number } {
  const isMinimal = displayMode === 'minimal' && !isFocused;
  if (node.type === 'symbol') {
    if (displayMode === 'detailed' || isFocused) return { width: 132, height: 28 };
    return isMinimal ? { width: 10, height: 10 } : { width: 12, height: 12 };
  }
  if (node.type === 'folder') {
    if (node.metadata.isRoot) return isMinimal ? { width: 96, height: 96 } : { width: 116, height: 116 };
    if (displayMode === 'detailed' || isFocused) return { width: 184, height: 78 };
    if (displayMode === 'capsules') return { width: 142, height: 36 };
    return isMinimal ? { width: 58, height: 58 } : { width: 70, height: 70 };
  }
  if (displayMode === 'detailed' || isFocused) return { width: 212, height: 90 };
  if (displayMode === 'capsules') return { width: 164, height: 34 };
  return isMinimal ? { width: 76, height: 28 } : { width: 96, height: 32 };
}

function countHiddenDescendants(nodeId: string, childrenMap: Map<string, FileNodeRecord[]>): number {
  const direct = childrenMap.get(nodeId) ?? [];
  let total = direct.length;
  for (const child of direct) {
    total += countHiddenDescendants(child.id, childrenMap);
  }
  return total;
}

export function collectVisibleRecords(
  records: FileNodeRecord[],
  showSymbols: boolean,
  collapsedIds: Set<string>
): { visibleRecords: FileNodeRecord[]; childrenMap: Map<string, FileNodeRecord[]> } {
  const eligible = records.filter((r) => (showSymbols ? true : r.type !== 'symbol'));
  const eligibleMap = new Map(eligible.map((r) => [r.id, r]));
  const childrenMap = new Map<string, FileNodeRecord[]>();

  for (const rec of eligible) {
    if (rec.parentId && eligibleMap.has(rec.parentId)) {
      const list = childrenMap.get(rec.parentId) ?? [];
      list.push(rec);
      childrenMap.set(rec.parentId, list);
    }
  }

  const visibleRecords = eligible.filter((rec) => {
    let currParent = rec.parentId;
    const guard = new Set<string>();
    while (currParent && !guard.has(currParent)) {
      guard.add(currParent);
      if (collapsedIds.has(currParent)) return false;
      currParent = eligibleMap.get(currParent)?.parentId ?? null;
    }
    return true;
  });

  return { visibleRecords, childrenMap };
}

export function buildStructuralFlowGraph(
  records: FileNodeRecord[],
  edgeRecords: FileEdgeRecord[],
  options: {
    displayMode: NodeDisplayMode;
    nodeTheme?: NodeVisualTheme;
    showSymbols: boolean;
    showImportEdges: boolean;
    selectedNodeId: string | null;
    highlightedIds: Set<string>;
    collapsedIds: Set<string>;
    activeNodeActivities?: Map<string, ActivityKind>;
    liveTransfers?: LiveTransferEdge[];
    onToggleCollapse?: (id: string) => void;
  }
): { nodes: Node<StructuralFlowNodeData>[]; edges: Edge[] } {
  const { visibleRecords, childrenMap } = collectVisibleRecords(records, options.showSymbols, options.collapsedIds);
  const activeMap = buildActiveAncestorMap(records, options.activeNodeActivities);
  const selectedRecord = options.selectedNodeId
    ? visibleRecords.find((r) => r.id === options.selectedNodeId) ?? null
    : null;

  const symbolCounts = new Map<string, number>();
  for (const r of records) {
    if (r.type === 'symbol' && r.parentId) {
      symbolCounts.set(r.parentId, (symbolCounts.get(r.parentId) ?? 0) + 1);
    }
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: options.displayMode === 'minimal' ? 28 : 44,
    ranksep: options.displayMode === 'minimal' ? 74 : 102,
    edgesep: 24,
  });

  const structuralNodes = visibleRecords.filter((r) => r.type !== 'symbol');
  const symbolNodes = visibleRecords.filter((r) => r.type === 'symbol');
  const symbolsByParent = new Map<string, FileNodeRecord[]>();

  for (const sym of symbolNodes) {
    if (!sym.parentId) continue;
    const list = symbolsByParent.get(sym.parentId) ?? [];
    list.push(sym);
    symbolsByParent.set(sym.parentId, list);
  }

  const footprintsByParent = new Map<string, { extraWidth: number; extraHeight: number }>();
  for (const rec of structuralNodes) {
    const isFocused = options.selectedNodeId === rec.id || options.highlightedIds.has(rec.id);
    const dims = getNodeDimensions(rec, options.displayMode, isFocused);
    const childSyms = symbolsByParent.get(rec.id) ?? [];
    const expandedSyms = areSymbolsExpanded(rec.id, childSyms, options.displayMode, options.selectedNodeId, options.highlightedIds);
    const footprint = getSymbolGroupFootprint(childSyms, expandedSyms, options.displayMode);
    footprintsByParent.set(rec.id, footprint);
    g.setNode(rec.id, {
      width: Math.max(dims.width + 16, footprint.extraWidth),
      height: dims.height + footprint.extraHeight,
    });
  }

  const visibleSet = new Set(visibleRecords.map((r) => r.id));
  for (const edge of edgeRecords) {
    if (edge.relationType === 'contains' && visibleSet.has(edge.sourceId) && visibleSet.has(edge.targetId)) {
      const targetRec = visibleRecords.find((r) => r.id === edge.targetId);
      if (targetRec && targetRec.type !== 'symbol') {
        g.setEdge(edge.sourceId, edge.targetId);
      }
    }
  }

  dagre.layout(g);

  const hasSearchHighlight = options.highlightedIds.size > 0;
  const positionedMap = new Map<string, { x: number; y: number; width: number; height: number }>();
  const flowNodes: Node<StructuralFlowNodeData>[] = [];

  for (const rec of structuralNodes) {
    const pos = g.node(rec.id);
    const isFocused = options.selectedNodeId === rec.id || options.highlightedIds.has(rec.id);
    const dims = getNodeDimensions(rec, options.displayMode, isFocused);
    const footprint = footprintsByParent.get(rec.id) ?? { extraWidth: 0, extraHeight: 0 };
    const parentCenterY = (pos?.y ?? 0) - footprint.extraHeight / 2;
    const x = (pos?.x ?? 0) - dims.width / 2;
    const y = parentCenterY - dims.height / 2;
    positionedMap.set(rec.id, { x: pos?.x ?? 0, y: parentCenterY, width: dims.width, height: dims.height });

    const isCollapsed = options.collapsedIds.has(rec.id);
    const directChildren = childrenMap.get(rec.id) ?? [];
    const isRelated =
      selectedRecord !== null &&
      (rec.id === selectedRecord.parentId || rec.parentId === selectedRecord.id);

    flowNodes.push({
      id: rec.id,
      type: 'structuralNode',
      position: { x, y },
      data: {
        record: rec,
        displayMode: options.displayMode,
        nodeTheme: options.nodeTheme,
        isHighlighted: options.highlightedIds.has(rec.id),
        isDimmed: hasSearchHighlight && !options.highlightedIds.has(rec.id),
        isSelected: options.selectedNodeId === rec.id,
        isRelatedToSelected: isRelated,
        activityKind: activeMap.get(rec.id),
        isCollapsed,
        childCount: directChildren.length,
        hiddenDescendantCount: isCollapsed ? countHiddenDescendants(rec.id, childrenMap) : 0,
        importCount: rec.metadata.imports?.length ?? 0,
        symbolCount: symbolCounts.get(rec.id) ?? 0,
        onToggleCollapse: options.onToggleCollapse,
      },
    });
  }

  for (const [parentId, syms] of symbolsByParent.entries()) {
    const parentPos = positionedMap.get(parentId);
    if (!parentPos) continue;
    const placed = layoutParentSymbols(parentPos, syms, {
      displayMode: options.displayMode,
      nodeTheme: options.nodeTheme,
      selectedNodeId: options.selectedNodeId,
      highlightedIds: options.highlightedIds,
      hasSearchHighlight,
      isParentSelected: selectedRecord !== null && selectedRecord.id === parentId,
      activeNodeActivities: activeMap,
    });
    flowNodes.push(...placed);
  }

  const nodeBounds = new Map<string, EdgeNodeBound>();
  for (const [id, pos] of positionedMap.entries()) {
    nodeBounds.set(id, {
      id,
      left: pos.x - pos.width / 2,
      right: pos.x + pos.width / 2,
      top: pos.y - pos.height / 2,
      bottom: pos.y + pos.height / 2,
    });
  }
  for (const node of flowNodes) {
    if (node.data.record.type !== 'symbol') continue;
    const w = node.data.isSymbolExpanded ? 132 : 12;
    const h = node.data.isSymbolExpanded ? 28 : 12;
    nodeBounds.set(node.id, {
      id: node.id,
      left: node.position.x,
      right: node.position.x + w,
      top: node.position.y,
      bottom: node.position.y + h,
    });
  }

  const flowEdges = buildStructuralEdges(edgeRecords, visibleRecords, {
    selectedNodeId: options.selectedNodeId,
    showImportEdges: options.showImportEdges,
    activeMap,
    liveTransfers: options.liveTransfers,
    nodeBounds,
  });

  return { nodes: flowNodes, edges: flowEdges };
}
