import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

export function AutoFitView({ nodeCount, panelKey }: { nodeCount: number; panelKey: string }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => void fitView({ padding: 0.18, duration: 240 }), 60);
    return () => clearTimeout(t);
  }, [nodeCount, panelKey, fitView]);
  return null;
}
