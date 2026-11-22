import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Edge, Node, OnNodesChange, XYPosition } from '@xyflow/react';
import type { ChatEdgeRecord, ChatFilterMode, ChatNodeRecord } from '../../types/chatGraph';
import { getTopicColor } from '../utils/graphStyles';

export interface ChatTimelineFlowData extends Record<string, unknown> {
  record: ChatNodeRecord;
  expanded: boolean;
  laneColor: string;
  onToggleExpand: (id: string) => void;
}

export function useChatGraph() {
  const [rawNodes, setRawNodes] = useState<ChatNodeRecord[]>([]);
  const [rawEdges, setRawEdges] = useState<ChatEdgeRecord[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<ChatFilterMode>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState<boolean>(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const customPositionsRef = useRef<Record<string, XYPosition>>({});
  const [flowNodes, setFlowNodes] = useState<Node<ChatTimelineFlowData>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChatGraph = useCallback(async (q = searchQuery) => {
    try {
      setError(null);
      const url = q.trim()
        ? `/api/chat-graph?q=${encodeURIComponent(q.trim())}`
        : '/api/chat-graph';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error cargando mapa de ideas.');
      const data = (await res.json()) as {
        nodes: ChatNodeRecord[];
        edges: ChatEdgeRecord[];
        topics: string[];
      };
      setRawNodes(data.nodes);
      setRawEdges(data.edges);
      setTopics(data.topics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchChatGraph(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchChatGraph]);

  const addMessage = useCallback(async (content: string) => {
    const res = await fetch('/api/chat-graph/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = (await res.json()) as {
      error?: string;
      nodes?: ChatNodeRecord[];
      edges?: ChatEdgeRecord[];
      topics?: string[];
    };
    if (!res.ok) {
      throw new Error(data.error || 'No se pudo añadir la idea.');
    }
    if (data.nodes && data.edges) {
      setRawNodes(data.nodes);
      setRawEdges(data.edges);
      if (data.topics) setTopics(data.topics);
    }
  }, []);

  const deleteMessage = useCallback(async (id: string) => {
    const res = await fetch(`/api/chat-graph/messages/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar nodo.');
    const data = (await res.json()) as { nodes: ChatNodeRecord[]; edges: ChatEdgeRecord[] };
    setRawNodes(data.nodes);
    setRawEdges(data.edges);
    if (selectedChatId === id) setSelectedChatId(null);
  }, [selectedChatId]);

  const toggleNodeExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const applyLiveUpdate = useCallback((nodes: ChatNodeRecord[], edges: ChatEdgeRecord[]) => {
    setRawNodes(nodes);
    setRawEdges(edges);
    setTopics(Array.from(new Set(nodes.map((n) => n.topicCluster))));
  }, []);

  const { computedNodes, flowEdges } = useMemo(() => {
    const filtered = rawNodes.filter((n) => {
      if (filterMode === 'connected' && n.isIsolated) return false;
      if (filterMode === 'isolated' && !n.isIsolated) return false;
      if (topicFilter !== 'all' && n.topicCluster !== topicFilter) return false;
      return true;
    });

    const visibleIds = new Set(filtered.map((n) => n.id));
    const nodes: Node<ChatTimelineFlowData>[] = filtered.map((rec) => {
      const laneIdx = Math.max(0, topics.indexOf(rec.topicCluster));
      const isExpanded = expandAll ? !expandedIds.has(rec.id) : expandedIds.has(rec.id);
      return {
        id: rec.id,
        type: 'chatTimelineNode',
        position: customPositionsRef.current[rec.id] ?? { x: rec.xPos, y: rec.yPos },
        data: {
          record: rec,
          expanded: isExpanded,
          laneColor: getTopicColor(laneIdx),
          onToggleExpand: toggleNodeExpand,
        },
      };
    });

    const edges: Edge[] = rawEdges
      .filter((e) => visibleIds.has(e.sourceId) && visibleIds.has(e.targetId))
      .map((e) => ({
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        type: 'smoothstep',
        label: e.connectionReason === 'entity' ? 'entidad' : e.connectionReason === 'semantic' ? 'semántica' : 'léxica',
        labelStyle: { fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' },
        labelBgStyle: { fill: '#0B0F17', fillOpacity: 0.9 },
        style:
          e.connectionReason === 'entity'
            ? { stroke: '#38BDF8', strokeWidth: 1.75 }
            : e.connectionReason === 'semantic'
              ? { stroke: '#34D399', strokeWidth: 1.75 }
              : { stroke: 'rgba(148, 163, 184, 0.5)', strokeWidth: 1.4, strokeDasharray: '4 3' },
      }));

    return { computedNodes: nodes, flowEdges: edges };
  }, [rawNodes, rawEdges, topics, filterMode, topicFilter, expandAll, expandedIds, toggleNodeExpand]);

  useEffect(() => {
    setFlowNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      return computedNodes.map((node) => {
        const prevNode = prevMap.get(node.id);
        const sameExpanded = prevNode && prevNode.data.expanded === node.data.expanded;
        return {
          ...node,
          position: customPositionsRef.current[node.id] ?? node.position,
          ...(sameExpanded && prevNode.measured ? { measured: prevNode.measured } : {}),
        };
      });
    });
  }, [computedNodes]);

  const onNodesChange = useCallback<OnNodesChange<Node<ChatTimelineFlowData>>>((changes) => {
    setFlowNodes((nds) => changes.applyTo(nds));
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        customPositionsRef.current[change.id] = change.position;
      }
    }
  }, []);

  const selectedChatNode = useMemo(
    () => rawNodes.find((n) => n.id === selectedChatId) ?? null,
    [rawNodes, selectedChatId]
  );

  return {
    rawNodes,
    topics,
    flowNodes,
    flowEdges,
    onNodesChange,
    filterMode,
    setFilterMode,
    topicFilter,
    setTopicFilter,
    searchQuery,
    setSearchQuery,
    expandAll,
    setExpandAll,
    selectedChatId,
    setSelectedChatId,
    selectedChatNode,
    loading,
    error,
    addMessage,
    deleteMessage,
    applyLiveUpdate,
  };
}
