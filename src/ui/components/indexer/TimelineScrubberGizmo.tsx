import { ChevronDown, ChevronLeft, ChevronRight, Crosshair, History, Pause, Play, Radio } from 'lucide-react';
import type { TimelineScrubberController } from '../../hooks/useTimelineScrubber';
import { formatFullDateTime, formatRelativeTime, formatShortDateTime } from '../../utils/dateFormat';
import { getActivityDotClass } from '../../utils/graphStyles';
import { TimelineSliderTrack } from './TimelineSliderTrack';

interface TimelineScrubberGizmoProps {
  timeline: TimelineScrubberController;
  onSelectNode?: (id: string) => void;
}

export function TimelineScrubberGizmo({ timeline, onSelectNode }: TimelineScrubberGizmoProps) {
  const { entries, scrubIndex, activeEntry, isLive, isPlaying, minimized, followNode } = timeline;
  const total = entries.length;
  if (total === 0) return null;

  if (minimized) {
    return (
      <div className="pointer-events-none absolute bottom-4 left-[64px] right-[230px] z-20 flex justify-center">
        <button
          type="button"
          onClick={timeline.toggleMinimized}
          data-testid="timeline-gizmo-collapsed"
          className="pointer-events-auto px-3 py-1.5 rounded-full bg-[#111827]/95 border border-white/[0.12] hover:border-sky-400/50 text-xs font-medium text-slate-200 shadow-2xl backdrop-blur-md flex items-center gap-2"
        >
          <History className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
          <span>Línea de tiempo ({total})</span>
        </button>
      </div>
    );
  }

  const displayEntry = activeEntry ?? entries[total - 1];
  const dotClass = activeEntry ? getActivityDotClass(activeEntry.action) : 'bg-emerald-400';

  return (
    <div className="pointer-events-none absolute bottom-4 left-[64px] right-[230px] z-20 flex justify-center">
      <div
        data-testid="timeline-scrubber-gizmo"
        className="pointer-events-auto w-full max-w-[540px] rounded-xl bg-[#111827]/95 border border-white/[0.12] shadow-2xl backdrop-blur-md px-3.5 py-2.5"
      >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
          <span className="text-xs font-mono font-semibold text-slate-100 truncate">
            {isLive ? `En vivo · ${displayEntry.label}` : displayEntry.label}
          </span>
          <span
            className="text-[10px] font-mono text-slate-400 shrink-0 hidden sm:inline"
            title={formatFullDateTime(displayEntry.timestamp)}
          >
            {formatRelativeTime(displayEntry.timestamp)} · {formatShortDateTime(displayEntry.timestamp)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-mono text-slate-400 mr-1">
            {isLive ? `Live (${total})` : `${(scrubIndex ?? 0) + 1} / ${total}`}
          </span>
          {timeline.focusNodeId && (
            <button
              type="button"
              onClick={() => {
                if (timeline.focusNodeId) onSelectNode?.(timeline.focusNodeId);
                timeline.triggerFocusNode();
              }}
              title="Centrar vista en este nodo"
              aria-label="Centrar vista en nodo"
              className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-white/[0.06]"
            >
              <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={timeline.toggleFollowNode}
            aria-pressed={followNode}
            title="Seguir nodo automáticamente al deslizar"
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
              followNode
                ? 'bg-sky-400/15 border-sky-400/40 text-sky-300'
                : 'bg-transparent border-white/[0.08] text-slate-400 hover:text-slate-200'
            }`}
          >
            Seguir
          </button>
          <button
            type="button"
            onClick={timeline.toggleMinimized}
            title="Minimizar línea de tiempo"
            aria-label="Minimizar línea de tiempo"
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]"
          >
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={timeline.stepPrev} aria-label="Cambio anterior" title="Atrás" className="p-1 rounded bg-[#1E293B] hover:bg-slate-700 text-slate-200">
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={timeline.togglePlay} aria-label={isPlaying ? 'Pausar recorrido' : 'Reproducir cambios'} title={isPlaying ? 'Pausar' : 'Reproducir'} className="p-1 rounded bg-[#1E293B] hover:bg-sky-400 hover:text-slate-950 text-sky-300 transition-colors">
            {isPlaying ? <Pause className="w-3.5 h-3.5" aria-hidden="true" /> : <Play className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
          <button type="button" onClick={timeline.stepNext} disabled={isLive} aria-label="Cambio siguiente" title="Adelante" className="p-1 rounded bg-[#1E293B] hover:bg-slate-700 disabled:opacity-35 text-slate-200">
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <TimelineSliderTrack
          entries={entries}
          scrubIndex={scrubIndex}
          isLive={isLive}
          onSelectPosition={timeline.setScrubPosition}
        />

        <button
          type="button"
          onClick={timeline.goLive}
          disabled={isLive}
          className={`px-2 py-1 rounded text-[10px] font-semibold shrink-0 flex items-center gap-1 transition-colors ${
            isLive
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
              : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
          }`}
        >
          <Radio className="w-3 h-3" aria-hidden="true" />
          <span>En vivo</span>
        </button>
      </div>
      </div>
    </div>
  );
}
