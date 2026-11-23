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

  const wrapperBounds = 'pointer-events-none absolute bottom-3 sm:bottom-4 left-3 right-3 sm:left-[56px] sm:right-4 lg:left-[64px] lg:right-[184px] xl:right-[228px] z-20 flex justify-center';

  if (minimized) {
    return (
      <div className={wrapperBounds}>
        <button
          type="button"
          onClick={timeline.toggleMinimized}
          data-testid="timeline-gizmo-collapsed"
          className="pointer-events-auto px-4 py-2 rounded-full bg-[#111827]/95 border border-white/[0.14] hover:border-sky-400/50 text-[13px] font-medium text-slate-100 shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap"
        >
          <History className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
          <span>Línea de tiempo ({total})</span>
        </button>
      </div>
    );
  }

  const displayEntry = activeEntry ?? entries[total - 1];
  const dotClass = activeEntry ? getActivityDotClass(activeEntry.action) : 'bg-emerald-400';

  return (
    <div className={wrapperBounds}>
      <div
        data-testid="timeline-scrubber-gizmo"
        className="@container pointer-events-auto w-full max-w-[600px] min-w-0 overflow-hidden rounded-xl bg-[#111827]/95 border border-white/[0.14] shadow-2xl backdrop-blur-md px-3.5 sm:px-4 py-3"
      >
        <div className="flex items-center justify-between gap-2 min-w-0 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
            <span className="text-[13px] font-medium text-slate-100 truncate">
              {isLive ? `En vivo · ${displayEntry.label}` : displayEntry.label}
            </span>
            <span
              className="text-xs font-mono tabular-nums text-slate-400 shrink-0 hidden xl:inline whitespace-nowrap"
              title={formatFullDateTime(displayEntry.timestamp)}
            >
              {formatRelativeTime(displayEntry.timestamp)} · {formatShortDateTime(displayEntry.timestamp)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-mono tabular-nums text-slate-300 whitespace-nowrap">
              {isLive ? `Live (${total})` : `${(scrubIndex ?? 0) + 1}/${total}`}
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
                className="p-1.5 rounded text-slate-300 hover:text-sky-300 hover:bg-white/[0.08]"
              >
                <Crosshair className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={timeline.toggleFollowNode}
              aria-pressed={followNode}
              title="Seguir nodo automáticamente al deslizar"
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors whitespace-nowrap ${
                followNode
                  ? 'bg-sky-400/15 border-sky-400/40 text-sky-300'
                  : 'bg-transparent border-white/[0.1] text-slate-400 hover:text-slate-200'
              }`}
            >
              Seguir
            </button>
            <button
              type="button"
              onClick={timeline.toggleMinimized}
              title="Minimizar línea de tiempo"
              aria-label="Minimizar línea de tiempo"
              className="p-1.5 rounded text-slate-300 hover:text-slate-100 hover:bg-white/[0.08]"
            >
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap @[380px]:flex-nowrap items-center gap-x-2.5 gap-y-2 min-w-0">
          <div className="order-2 @[380px]:order-1 flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={timeline.stepPrev} aria-label="Cambio anterior" title="Atrás" className="w-8 h-8 flex items-center justify-center rounded-md bg-[#1E293B] hover:bg-slate-700 text-slate-200">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={timeline.togglePlay} aria-label={isPlaying ? 'Pausar recorrido' : 'Reproducir cambios'} title={isPlaying ? 'Pausar' : 'Reproducir'} className="w-8 h-8 flex items-center justify-center rounded-md bg-[#1E293B] hover:bg-sky-400 hover:text-slate-950 text-sky-300 transition-colors">
              {isPlaying ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
            </button>
            <button type="button" onClick={timeline.stepNext} disabled={isLive} aria-label="Cambio siguiente" title="Adelante" className="w-8 h-8 flex items-center justify-center rounded-md bg-[#1E293B] hover:bg-slate-700 disabled:opacity-35 text-slate-200">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="order-1 basis-full @[380px]:order-2 @[380px]:basis-auto @[380px]:flex-1 min-w-0">
            <TimelineSliderTrack
              entries={entries}
              scrubIndex={scrubIndex}
              isLive={isLive}
              onSelectPosition={timeline.setScrubPosition}
            />
          </div>

          <button
            type="button"
            onClick={timeline.goLive}
            disabled={isLive}
            className={`order-3 ml-auto @[380px]:ml-0 h-8 px-3 rounded-md text-xs font-semibold shrink-0 whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              isLive
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>En vivo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
