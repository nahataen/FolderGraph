import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Node, OnNodesChange, XYPosition } from '@xyflow/react';
import {
  buildStructuralFlowGraph,
  type LiveTransferEdge,
  type StructuralFlowNodeData,
} from '../../core/layout/dagreLayout';
import { computeSubtreePositions, hasArrangeableSubnodes } from '../../core/layout/subtreeLayout';
import type { FileEdgeRecord, FileNodeRecord, NodeDisplayMode, NodeVisualTheme, WorkspaceRecord } from '../../types/indexer';
import type { ActivityKind } from '../../types/protocol';
import {
  copyCompactContextRequest,
  createWorkspaceRequest,
  deleteWorkspaceRequest,
  fetchGraphData,
  rescanWorkspaceRequest,
  searchGraphNodes,
} from '../utils/graphApi';

export function useFileGraph(liveOptions?: {
  activeNodeActivities?: Map<string, ActivityKind>;
  liveTransfers?: LiveTransferEdge[];
}) {
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [rawNodes, setRawNodes] = useState<FileNodeRecord[]>([]);
  const [rawEdges, setRawEdges] = useState<FileEdgeRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('all');
  const [displayMode, setDisplayModeState] = useState<NodeDisplayMode>('hybrid');
  const [nodeTheme, setNodeTheme] = useState<NodeVisualTheme>('classic');
  const [showSymbols, setShowSymbols] = useState<boolean>(true);
  const [showImportEdges, setShowImportEdges] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const customPositionsRef = useRef<Record<string, XYPosition>>({});
  const [hasCustomPositions, setHasCustomPositions] = useState<boolean>(false);
  const [flowNodes, setFlowNodes] = useState<Node<StructuralFlowNodeData>[]>([]);
  const initializedCollapseRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const setDisplayMode = useCallback((mode: NodeDisplayMode) => {
    customPositionsRef.current = {};
    setHasCustomPositions(false);
    setDisplayModeState(mode);
  }, []);

  const fetchGraph = useCallback(async (wsId = activeWorkspaceId) => {
    try {
      setError(null);
      const data = await fetchGraphData(wsId);
      setWorkspaces(data.workspaces);
      setRawNodes(data.nodes);
      setRawEdges(data.edges);
      if (!initializedCollapseRef.current && data.nodes.length > 0) {
        initializedCollapseRef.current = true;
        const deepFolders = data.nodes
          .filter((n) => n.type === 'folder' && !n.metadata.isRoot && n.metadata.depth >= 2)
          .map((n) => n.id);
        setCollapsedIds(new Set(deepFolders));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    void fetchGraph(activeWorkspaceId);
  }, [activeWorkspaceId, fetchGraph]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setHighlightedIds(new Set());
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const nodes = await searchGraphNodes(trimmed);
        setHighlightedIds(new Set(nodes.map((n) => n.id)));
      } catch {
        // Ignore transient search aborts
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleNodeCollapse = useCallback((nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const collapseAllFolders = useCallback(() => {
    const folderIds = rawNodes
      .filter((n) => n.type === 'folder' && !n.metadata.isRoot)
      .map((n) => n.id);
    setCollapsedIds(new Set(folderIds));
  }, [rawNodes]);

  const expandAllNodes = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  const flowGraph = useMemo(
    () =>
      buildStructuralFlowGraph(rawNodes, rawEdges, {
        displayMode,
        nodeTheme,
        showSymbols,
        showImportEdges,
        selectedNodeId,
        highlightedIds,
        collapsedIds,
        activeNodeActivities: liveOptions?.activeNodeActivities,
        liveTransfers: liveOptions?.liveTransfers,
        onToggleCollapse: toggleNodeCollapse,
      }),
    [
      rawNodes,
      rawEdges,
      displayMode,
      nodeTheme,
      showSymbols,
      showImportEdges,
      selectedNodeId,
      highlightedIds,
      collapsedIds,
      liveOptions?.activeNodeActivities,
      liveOptions?.liveTransfers,
      toggleNodeCollapse,
    ]
  );

  useEffect(() => {
    setFlowNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      return flowGraph.nodes.map((node) => {
        const prevNode = prevMap.get(node.id);
        const sameVisualSize =
          prevNode &&
          prevNode.data.displayMode === node.data.displayMode &&
          prevNode.data.isSelected === node.data.isSelected &&
          prevNode.data.isSymbolExpanded === node.data.isSymbolExpanded &&
          prevNode.data.isHighlighted === node.data.isHighlighted;
        const customPos = customPositionsRef.current[node.id];
        return {
          ...node,
          position: customPos ?? node.position,
          ...(sameVisualSize && prevNode.measured ? { measured: prevNode.measured } : {}),
        };
      });
    });
  }, [flowGraph.nodes]);

  const resetNodePositions = useCallback(() => {
    customPositionsRef.current = {};
    setHasCustomPositions(false);
    setFlowNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      return flowGraph.nodes.map((node) => ({
        ...node,
        ...(prevMap.get(node.id)?.measured ? { measured: prevMap.get(node.id)!.measured } : {}),
      }));
    });
  }, [flowGraph.nodes]);

  const onNodesChange = useCallback<OnNodesChange<Node<StructuralFlowNodeData>>>((changes) => {
    setFlowNodes((nds) => changes.applyTo(nds));
    let updatedCustom = false;
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        customPositionsRef.current[change.id] = change.position;
        updatedCustom = true;
      }
    }
    if (updatedCustom) {
      setHasCustomPositions(true);
    }
  }, []);

  const canArrangeSelectedSubtree = useMemo(
    () => (selectedNodeId ? hasArrangeableSubnodes(selectedNodeId, rawNodes, showSymbols) : false),
    [selectedNodeId, rawNodes, showSymbols]
  );

  const arrangeSelectedSubtree = useCallback(() => {
    if (!selectedNodeId || !canArrangeSelectedSubtree) return;
    const anchorPosition = flowNodes.find((n) => n.id === selectedNodeId)?.position;
    const arranged = computeSubtreePositions(rawNodes, rawEdges, {
      rootId: selectedNodeId,
      anchorPosition,
      displayMode,
      showSymbols,
      collapsedIds,
      highlightedIds,
    });
    if (Object.keys(arranged).length === 0) return;

    Object.assign(customPositionsRef.current, arranged);
    setHasCustomPositions(true);
    if (collapsedIds.has(selectedNodeId)) {
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedNodeId);
        return next;
      });
    }
    setFlowNodes((prev) =>
      prev.map((node) => (arranged[node.id] ? { ...node, position: arranged[node.id] } : node))
    );
  }, [selectedNodeId, canArrangeSelectedSubtree, flowNodes, rawNodes, rawEdges, displayMode, showSymbols, collapsedIds, highlightedIds]);

  const addWorkspace = useCallback(async (rootPath: string) => {
    setError(null);
    await createWorkspaceRequest(rootPath);
    await fetchGraph(activeWorkspaceId);
  }, [activeWorkspaceId, fetchGraph]);

  const rescanWorkspace = useCallback(async (id: string) => {
    await rescanWorkspaceRequest(id);
    await fetchGraph(activeWorkspaceId);
  }, [activeWorkspaceId, fetchGraph]);

  const removeWorkspace = useCallback(async (id: string) => {
    await deleteWorkspaceRequest(id);
    if (activeWorkspaceId === id) setActiveWorkspaceId('all');
    await fetchGraph('all');
  }, [activeWorkspaceId, fetchGraph]);

  const copyCompactContext = useCallback(
    (rootNodeId?: string) => copyCompactContextRequest(activeWorkspaceId, rootNodeId),
    [activeWorkspaceId]
  );

  const selectedNode = useMemo(
    () => rawNodes.find((n) => n.id === selectedNodeId) ?? null,
    [rawNodes, selectedNodeId]
  );

  return {
    workspaces,
    rawNodes,
    rawEdges,
    flowNodes,
    flowEdges: flowGraph.edges,
    onNodesChange,
    resetNodePositions,
    hasCustomPositions,
    canArrangeSelectedSubtree,
    arrangeSelectedSubtree,
    activeWorkspaceId,
    setActiveWorkspaceId,
    displayMode,
    setDisplayMode,
    nodeTheme,
    setNodeTheme,
    showSymbols,
    setShowSymbols,
    showImportEdges,
    setShowImportEdges,
    selectedNodeId,
    setSelectedNodeId,
    selectedNode,
    collapsedIds,
    toggleNodeCollapse,
    collapseAllFolders,
    expandAllNodes,
    searchQuery,
    setSearchQuery,
    highlightedCount: highlightedIds.size,
    loading,
    error,
    setError,
    fetchGraph,
    addWorkspace,
    rescanWorkspace,
    removeWorkspace,
    copyCompactContext,
  };
}
