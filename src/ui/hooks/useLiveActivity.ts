import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveTransferEdge } from '../../core/layout/dagreLayout';
import type { ActivityKind, AgentActivityEvent, WsServerEvent } from '../../types/protocol';

const PULSE_DURATION_MS = 5200;

export function useLiveActivity() {
  const [activeNodeMap, setActiveNodeMap] = useState<Map<string, ActivityKind>>(new Map());
  const [liveTransfers, setLiveTransfers] = useState<LiveTransferEdge[]>([]);
  const [recentActivities, setRecentActivities] = useState<AgentActivityEvent[]>([]);
  const [totalTokensSaved, setTotalTokensSaved] = useState<number>(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const pulseNode = useCallback((nodeId: string, action: ActivityKind) => {
    setActiveNodeMap((prev) => {
      const next = new Map(prev);
      next.set(nodeId, action);
      return next;
    });

    const prevTimer = timersRef.current.get(`n:${nodeId}`);
    if (prevTimer) clearTimeout(prevTimer);
    const timer = setTimeout(() => {
      setActiveNodeMap((prev) => {
        if (!prev.has(nodeId)) return prev;
        const next = new Map(prev);
        next.delete(nodeId);
        return next;
      });
      timersRef.current.delete(`n:${nodeId}`);
    }, PULSE_DURATION_MS);
    timersRef.current.set(`n:${nodeId}`, timer);
  }, []);

  const addTransfer = useCallback((transfer: LiveTransferEdge) => {
    setLiveTransfers((prev) => [...prev.slice(-4), transfer]);
    const timer = setTimeout(() => {
      setLiveTransfers((prev) => prev.filter((t) => t.id !== transfer.id));
      timersRef.current.delete(`t:${transfer.id}`);
    }, PULSE_DURATION_MS);
    timersRef.current.set(`t:${transfer.id}`, timer);
  }, []);

  const pushActivity = useCallback(
    (activity: AgentActivityEvent) => {
      setRecentActivities((prev) => [activity, ...prev.filter((a) => a.id !== activity.id)].slice(0, 40));
      if (activity.tokensSaved) {
        setTotalTokensSaved((prev) => prev + activity.tokensSaved!);
      }
      if (activity.nodeId) pulseNode(activity.nodeId, activity.action);
      if (activity.toNodeId) pulseNode(activity.toNodeId, activity.action);
      if (activity.fromNodeId && activity.toNodeId) {
        addTransfer({
          id: activity.id,
          fromNodeId: activity.fromNodeId,
          toNodeId: activity.toNodeId,
          action: activity.action,
          label: activity.action === 'move' ? 'movido' : 'flujo',
        });
      }
    },
    [addTransfer, pulseNode]
  );

  const ingestWsEvent = useCallback(
    (event: WsServerEvent) => {
      if (event.type === 'agent:activity') {
        pushActivity(event.activity);
      } else if (event.type === 'graph:delta' && event.changedNodeId) {
        const action: ActivityKind =
          event.reason === 'add' ? 'create' : event.reason === 'unlink' ? 'delete' : 'edit';
        pulseNode(event.changedNodeId, action);
      }
    },
    [pulseNode, pushActivity]
  );

  useEffect(() => {
    let mounted = true;
    fetch('/api/agent/activity')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { activities?: AgentActivityEvent[] } | null) => {
        if (!mounted || !data?.activities) return;
        setRecentActivities(data.activities.slice(0, 40));
        const saved = data.activities.reduce((acc, a) => acc + (a.tokensSaved ?? 0), 0);
        if (saved > 0) setTotalTokensSaved(saved);
      })
      .catch(() => {});

    const timers = timersRef.current;
    return () => {
      mounted = false;
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return {
    activeNodeMap,
    liveTransfers,
    recentActivities,
    totalTokensSaved,
    ingestWsEvent,
  };
}
