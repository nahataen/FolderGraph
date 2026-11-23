import { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, type Edge, type EdgeProps } from '@xyflow/react';
import { computeDashedLaneGeometry } from '../../../core/layout/edgeRouting';

export interface DashedRelationEdgeData extends Record<string, unknown> {
  color: string;
  dashArray: string;
  laneIndex: number;
  baseOffset: number;
  shelfShift: number;
  isHighlighted: boolean;
  isAnimatedFlow: boolean;
  showBadge: boolean;
  shortTag: string;
  hoverLabel: string;
}

type DashedEdgeType = Edge<DashedRelationEdgeData, 'dashedRelation'>;

export function DashedRelationEdge(props: EdgeProps<DashedEdgeType>) {
  const [hovered, setHovered] = useState(false);
  const data = props.data;
  const laneIndex = data?.laneIndex ?? 0;
  const baseOffset = data?.baseOffset ?? 58;
  const shelfShift = data?.shelfShift ?? 0;

  const { path, labelX, labelY } = computeDashedLaneGeometry({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    laneIndex,
    baseOffset,
    shelfShift,
  });

  const active = hovered || Boolean(data?.isHighlighted) || Boolean(data?.isAnimatedFlow) || Boolean(props.selected);
  const color = data?.color ?? '#38BDF8';
  const showLabel = hovered || Boolean(data?.showBadge) || Boolean(props.selected);

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        style={{
          ...props.style,
          stroke: color,
          strokeDasharray: data?.dashArray ?? '6 4',
          strokeLinecap: 'round',
          strokeWidth: hovered ? 2.8 : active ? 2.2 : 1.4,
          opacity: hovered ? 1 : active ? 0.96 : 0.62,
        }}
      />
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        className="cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              borderColor: `${color}88`,
            }}
            className={`nodrag nopan pointer-events-auto absolute px-1.5 py-0.5 rounded border bg-[#0B0F17]/95 text-[10px] font-mono leading-none whitespace-nowrap shadow-sm transition-colors ${
              hovered || active ? 'text-slate-100 z-30' : 'text-slate-300 z-10'
            }`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <span style={{ color }} className="mr-1">●</span>
            <span>{hovered ? data?.hoverLabel : data?.shortTag}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
