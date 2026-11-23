import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LiveTransferEdge } from '../../core/layout/activityEdges';
import {
  buildChangeTimeline,
  buildScrubOverlay,
  type TimelineChangeEntry,
} from '../../core/layout/timelineScrubber';
import type { FileNodeRecord } from '../../types/indexer';
import type { ActivityKind, AgentActivityEvent } from '../../types/protocol';

export interface TimelineScrubberController {
  entries: TimelineChangeEntry[];
  scrubIndex: number | null;
  activeEntry: TimelineChangeEntry | null;
  isLive: boolean;
  isPlaying: boolean;
  minimized: boolean;
  followNode: boolean;
  focusRequestTick: number;
  focusNodeId: string | null;
  effectiveCollapsedIds: Set<string>;
  effectiveActiveActivities: Map<string, ActivityKind>;
  effectiveTransfers: LiveTransferEdge[];
  setScrubPosition: (pos: number) => void;
  stepPrev: () => void;
  stepNext: () => void;
  goLive: () => void;
  togglePlay: () => void;
  toggleMinimized: () => void;
  toggleFollowNode: () => void;
  triggerFocusNode: () => void;
}

export function useTimelineScrubber(params: {
  rawNodes: FileNodeRecord[];
  recentActivities: AgentActivityEvent[];
  collapsedIds: Set<string>;
  baseActiveActivities?: Map<string, ActivityKind>;
  baseTransfers?: LiveTransferEdge[];
}): TimelineScrubberController {
  const { rawNodes, recentActivities, collapsedIds, baseActiveActivities, baseTransfers } = params;
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [minimized, setMinimized] = useState<boolean>(false);
  const [followNode, setFollowNode] = useState<boolean>(true);
  const [focusRequestTick, setFocusRequestTick] = useState<number>(0);

  const entries = useMemo(
    () => buildChangeTimeline(recentActivities, rawNodes, 36),
    [recentActivities, rawNodes]
  );

  const clampedIndex =
    scrubIndex !== null && entries.length > 0
      ? Math.min(Math.max(0, scrubIndex), entries.length - 1)
      : null;

  const activeEntry = clampedIndex !== null ? entries[clampedIndex] ?? null : null;

  const setScrubPosition = useCallback(
    (pos: number) => {
      setIsPlaying(false);
      if (entries.length === 0 || pos >= entries.length) {
        setScrubIndex(null);
        return;
      }
      setScrubIndex(Math.max(0, pos));
      if (followNode) setFocusRequestTick((t) => t + 1);
    },
    [entries.length, followNode]
  );

  const stepPrev = useCallback(() => {
    if (entries.length === 0) return;
    setIsPlaying(false);
    setScrubIndex((prev) => {
      const next = prev === null ? entries.length - 1 : Math.max(0, prev - 1);
      return next;
    });
    if (followNode) setFocusRequestTick((t) => t + 1);
  }, [entries.length, followNode]);

  const stepNext = useCallback(() => {
    if (entries.length === 0) return;
    setIsPlaying(false);
    setScrubIndex((prev) => {
      if (prev === null) return null;
      if (prev + 1 >= entries.length) return null;
      return prev + 1;
    });
    if (followNode) setFocusRequestTick((t) => t + 1);
  }, [entries.length, followNode]);

  const goLive = useCallback(() => {
    setIsPlaying(false);
    setScrubIndex(null);
  }, []);

  const togglePlay = useCallback(() => {
    if (entries.length === 0) return;
    setIsPlaying((prev) => {
      const next = !prev;
      if (next && (scrubIndex === null || scrubIndex >= entries.length - 1)) {
        setScrubIndex(0);
      }
      return next;
    });
  }, [entries.length, scrubIndex]);

  useEffect(() => {
    if (!isPlaying || entries.length === 0) return;
    const timer = setInterval(() => {
      setScrubIndex((prev) => {
        if (prev === null) return 0;
        if (prev + 1 >= entries.length) {
          setIsPlaying(false);
          return null;
        }
        return prev + 1;
      });
      if (followNode) setFocusRequestTick((t) => t + 1);
    }, 1150);
    return () => clearInterval(timer);
  }, [isPlaying, entries.length, followNode]);

  const overlay = useMemo(
    () => buildScrubOverlay(activeEntry, rawNodes, collapsedIds, baseActiveActivities, baseTransfers),
    [activeEntry, rawNodes, collapsedIds, baseActiveActivities, baseTransfers]
  );

  return {
    entries,
    scrubIndex: clampedIndex,
    activeEntry,
    isLive: clampedIndex === null,
    isPlaying,
    minimized,
    followNode,
    focusRequestTick,
    focusNodeId: overlay.focusNodeId,
    effectiveCollapsedIds: overlay.effectiveCollapsedIds,
    effectiveActiveActivities: overlay.effectiveActiveActivities,
    effectiveTransfers: overlay.effectiveTransfers,
    setScrubPosition,
    stepPrev,
    stepNext,
    goLive,
    togglePlay,
    toggleMinimized: () => setMinimized((v) => !v),
    toggleFollowNode: () => setFollowNode((v) => !v),
    triggerFocusNode: () => setFocusRequestTick((t) => t + 1),
  };
}
