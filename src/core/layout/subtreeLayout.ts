import type { XYPosition } from '@xyflow/react';
import type { FileEdgeRecord, FileNodeRecord, NodeDisplayMode } from '../../types/indexer';
import { buildStructuralFlowGraph } from './dagreLayout';

export function collectSubtreeIds(rootId: string, records: FileNodeRecord[]): Set<string> {
  const byParent = new Map<string, string[]>();
  for (const rec of records) {
    if (!rec.parentId) continue;
    const list = byParent.get(rec.parentId) ?? [];
    list.push(rec.id);
    byParent.set(rec.parentId, list);
  }

  const result = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (result.has(curr)) continue;
    result.add(curr);
    for (const childId of byParent.get(curr) ?? []) {
      if (!result.has(childId)) queue.push(childId);
    }
  }
  return result;
}

export function hasArrangeableSubnodes(
  nodeId: string,
  records: FileNodeRecord[],
  showSymbols: boolean
): boolean {
  return records.some(
    (rec) => rec.parentId === nodeId && (showSymbols || rec.type !== 'symbol')
  );
}

export function computeSubtreePositions(
  records: FileNodeRecord[],
  edgeRecords: FileEdgeRecord[],
  options: {
    rootId: string;
    anchorPosition?: XYPosition;
    displayMode: NodeDisplayMode;
    showSymbols: boolean;
    collapsedIds: Set<string>;
    highlightedIds: Set<string>;
  }
): Record<string, XYPosition> {
  const subtreeIds = collectSubtreeIds(options.rootId, records);
  const subRecords = records.filter((r) => subtreeIds.has(r.id));
  if (subRecords.length === 0) return {};

  const subEdges = edgeRecords.filter(
    (e) => subtreeIds.has(e.sourceId) && subtreeIds.has(e.targetId)
  );

  const nextCollapsed = new Set(options.collapsedIds);
  nextCollapsed.delete(options.rootId);

  const subGraph = buildStructuralFlowGraph(subRecords, subEdges, {
    displayMode: options.displayMode,
    showSymbols: options.showSymbols,
    showImportEdges: false,
    selectedNodeId: options.rootId,
    highlightedIds: options.highlightedIds,
    collapsedIds: nextCollapsed,
  });

  const laidOutRoot = subGraph.nodes.find((n) => n.id === options.rootId);
  if (!laidOutRoot) return {};

  const anchor = options.anchorPosition ?? laidOutRoot.position;
  const dx = anchor.x - laidOutRoot.position.x;
  const dy = anchor.y - laidOutRoot.position.y;

  const positions: Record<string, XYPosition> = {};
  for (const node of subGraph.nodes) {
    positions[node.id] = {
      x: node.position.x + dx,
      y: node.position.y + dy,
    };
  }
  return positions;
}
