import type { Node } from '@xyflow/react';
import type { FileNodeRecord, NodeDisplayMode } from '../../types/indexer';
import type { ActivityKind } from '../../types/protocol';

export interface StructuralFlowNodeData extends Record<string, unknown> {
  record: FileNodeRecord;
  displayMode: NodeDisplayMode;
  isHighlighted: boolean;
  isDimmed: boolean;
  isSelected: boolean;
  isRelatedToSelected: boolean;
  isSymbolExpanded?: boolean;
  activityKind?: ActivityKind;
  isCollapsed: boolean;
  childCount: number;
  hiddenDescendantCount: number;
  importCount: number;
  symbolCount: number;
  onToggleCollapse?: (id: string) => void;
}

export function areSymbolsExpanded(
  parentId: string,
  syms: FileNodeRecord[],
  displayMode: NodeDisplayMode,
  selectedNodeId: string | null,
  highlightedIds: Set<string>
): boolean {
  if (displayMode === 'detailed') return true;
  if (selectedNodeId === parentId || highlightedIds.has(parentId)) return true;
  return syms.some((s) => s.id === selectedNodeId || highlightedIds.has(s.id));
}

export function getSymbolGroupFootprint(
  syms: FileNodeRecord[],
  expanded: boolean,
  displayMode: NodeDisplayMode = 'hybrid'
): { extraWidth: number; extraHeight: number } {
  if (syms.length === 0) return { extraWidth: 0, extraHeight: 0 };
  if (!expanded) {
    const cellW = displayMode === 'minimal' ? 16 : 20;
    const cellH = displayMode === 'minimal' ? 16 : 20;
    const cols = Math.min(syms.length, 6);
    const rows = Math.ceil(syms.length / 6);
    return {
      extraWidth: Math.max(44, cols * cellW + 18),
      extraHeight: rows * cellH + 38,
    };
  }
  const cols = syms.length <= 1 ? 1 : 2;
  const rows = Math.ceil(syms.length / cols);
  return {
    extraWidth: cols * 148 + 20,
    extraHeight: rows * 40 + 40,
  };
}

export function layoutParentSymbols(
  parentPos: { x: number; y: number; width: number; height: number },
  syms: FileNodeRecord[],
  options: {
    displayMode: NodeDisplayMode;
    selectedNodeId: string | null;
    highlightedIds: Set<string>;
    hasSearchHighlight: boolean;
    isParentSelected: boolean;
    activeNodeActivities?: Map<string, ActivityKind>;
  }
): Node<StructuralFlowNodeData>[] {
  const expanded = areSymbolsExpanded(
    syms[0]?.parentId ?? '',
    syms,
    options.displayMode,
    options.selectedNodeId,
    options.highlightedIds
  );

  const isMinimal = options.displayMode === 'minimal';
  const cellW = expanded ? 148 : isMinimal ? 16 : 20;
  const cellH = expanded ? 40 : isMinimal ? 16 : 20;
  const nodeW = expanded ? 132 : isMinimal ? 10 : 12;
  const nodeH = expanded ? 28 : isMinimal ? 10 : 12;
  const maxCols = expanded ? (syms.length <= 1 ? 1 : 2) : Math.min(syms.length, 6);
  const startY = parentPos.y + parentPos.height / 2 + (expanded ? 34 : 30);

  return syms.map((sym, idx) => {
    const col = idx % maxCols;
    const row = Math.floor(idx / maxCols);
    const itemsInRow = Math.min(maxCols, syms.length - row * maxCols);
    const rowWidth = (itemsInRow - 1) * cellW;
    const centerX = parentPos.x - rowWidth / 2 + col * cellW;
    const centerY = startY + row * cellH + nodeH / 2;

    return {
      id: sym.id,
      type: 'structuralNode',
      position: {
        x: centerX - nodeW / 2,
        y: centerY - nodeH / 2,
      },
      data: {
        record: sym,
        displayMode: options.displayMode,
        isHighlighted: options.highlightedIds.has(sym.id),
        isDimmed: options.hasSearchHighlight && !options.highlightedIds.has(sym.id),
        isSelected: options.selectedNodeId === sym.id,
        isRelatedToSelected: options.isParentSelected,
        isSymbolExpanded: expanded,
        activityKind: options.activeNodeActivities?.get(sym.id),
        isCollapsed: false,
        childCount: 0,
        hiddenDescendantCount: 0,
        importCount: 0,
        symbolCount: 0,
      },
    };
  });
}
