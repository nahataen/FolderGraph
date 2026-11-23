import type { TimelineChangeEntry } from '../../../core/layout/timelineScrubber';
import { formatShortDateTime } from '../../utils/dateFormat';
import { getActivityDotClass } from '../../utils/graphStyles';

interface TimelineSliderTrackProps {
  entries: TimelineChangeEntry[];
  scrubIndex: number | null;
  isLive: boolean;
  onSelectPosition: (pos: number) => void;
}

export function TimelineSliderTrack({
  entries,
  scrubIndex,
  isLive,
  onSelectPosition,
}: TimelineSliderTrackProps) {
  const total = entries.length;
  const sliderValue = scrubIndex ?? total;
  const pct = total > 0 ? (sliderValue / total) * 100 : 100;

  return (
    <div className="relative flex-1 flex flex-col justify-center">
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-1.5 h-1.5 rounded-full bg-white/[0.1] pointer-events-none" />
        <div
          className="absolute left-1.5 h-1.5 rounded-full bg-sky-400/60 pointer-events-none transition-all duration-75"
          style={{ width: `calc(${pct}% - 6px)` }}
        />
        <div className="absolute inset-x-1.5 flex items-center justify-between pointer-events-none">
          {entries.map((entry, idx) => (
            <span
              key={entry.id}
              className={`w-1.5 h-1.5 rounded-full transition-transform ${getActivityDotClass(entry.action)} ${
                scrubIndex === idx ? 'scale-125' : 'opacity-75'
              }`}
            />
          ))}
          <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isLive ? 'scale-125' : 'opacity-75'}`} />
        </div>
        <div
          aria-hidden="true"
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#0B0F17] shadow-lg pointer-events-none transition-all duration-75 ${
            isLive ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-sky-300 shadow-sky-400/60'
          }`}
          style={{ left: `calc(6px + ${pct}% * 0.96)` }}
        />
        <input
          type="range"
          min={0}
          max={total}
          step={1}
          value={sliderValue}
          aria-label="Línea de tiempo de cambios"
          onChange={(e) => onSelectPosition(Number(e.target.value))}
          className="relative w-full h-5 opacity-0 cursor-pointer z-10"
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5 px-0.5">
        <span>{formatShortDateTime(entries[0].timestamp)}</span>
        <span>{isLive ? 'Estado actual' : 'Desliza ← atrás / adelante →'}</span>
        <span>Ahora</span>
      </div>
    </div>
  );
}
