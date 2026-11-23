import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

interface TimelineViewportFocusProps {
  focusNodeId: string | null;
  focusRequestTick: number;
}

export function TimelineViewportFocus({ focusNodeId, focusRequestTick }: TimelineViewportFocusProps) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!focusNodeId || focusRequestTick === 0) return;
    const timer = setTimeout(() => {
      void fitView({
        nodes: [{ id: focusNodeId }],
        duration: 260,
        maxZoom: 1.35,
        padding: 0.45,
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [focusNodeId, focusRequestTick, fitView]);

  return null;
}
