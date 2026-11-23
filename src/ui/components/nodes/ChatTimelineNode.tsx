import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import type { ChatTimelineFlowData } from '../../hooks/useChatGraph';
import { formatFullDateTime, formatShortDateTime } from '../../utils/dateFormat';

type ChatNodeType = Node<ChatTimelineFlowData, 'chatTimelineNode'>;

export function ChatTimelineNode({ data }: NodeProps<ChatNodeType>) {
  const { record, expanded, laneColor, onToggleExpand } = data;
  const timeLabel = formatShortDateTime(record.timestamp);
  const fullTimeLabel = formatFullDateTime(record.timestamp);

  if (!expanded) {
    return (
      <div className="relative flex flex-col items-center">
        <Handle type="target" position={Position.Left} className="!opacity-0 !w-1 !h-1" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(record.id);
          }}
          aria-label={`Expandir idea ${timeLabel}: ${record.topicCluster}`}
          className="w-7 h-7 rounded-full border-2 bg-[#161E2E] flex items-center justify-center hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          style={{ borderColor: record.isIsolated ? '#F59E0B' : laneColor }}
        >
          <Maximize2 className="w-3 h-3 text-slate-300" aria-hidden="true" />
        </button>
        <span className="mt-1 text-[10px] font-mono text-slate-400 whitespace-nowrap">
          {timeLabel} {record.isIsolated ? '· suelta' : ''}
        </span>
        <Handle type="source" position={Position.Right} className="!opacity-0 !w-1 !h-1" />
      </div>
    );
  }

  return (
    <div
      title={fullTimeLabel}
      className={`w-[244px] rounded-lg bg-[#161E2E] border p-3 ${
        record.isIsolated ? 'border-amber-500/60' : 'border-white/[0.12]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2 !h-2 !border-0" />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 truncate">
          <span>{timeLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate" style={{ color: laneColor }}>
            {record.topicCluster}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(record.id);
          }}
          aria-label={`Colapsar idea ${timeLabel}`}
          className="p-1 text-slate-400 hover:text-slate-100 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <p className="text-xs leading-relaxed text-slate-200 line-clamp-4">{record.content}</p>

      {record.isIsolated && (
        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Idea suelta sin seguimiento</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2 !h-2 !border-0" />
    </div>
  );
}
