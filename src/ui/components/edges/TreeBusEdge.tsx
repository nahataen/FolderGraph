import { BaseEdge, type Edge, type EdgeProps } from '@xyflow/react';
import { computeTreeBusPath } from '../../../core/layout/edgeRouting';

export interface TreeBusEdgeData extends Record<string, unknown> {
  busDrop?: number;
}

type TreeBusEdgeType = Edge<TreeBusEdgeData, 'treeBus'>;

export function TreeBusEdge(props: EdgeProps<TreeBusEdgeType>) {
  const path = computeTreeBusPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    busDrop: props.data?.busDrop ?? 28,
  });

  return <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={props.style} />;
}
