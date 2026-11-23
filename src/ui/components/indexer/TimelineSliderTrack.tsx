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
  const stride = Math.max(1, Math.ceil(total / 24));
  const sampled = entries.filter((_, idx) => idx % stride === 0 || idx === scrubIndex);

  return (
    <div className="relative flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
      <div className="relative h-8 flex items-center">
        <div className="absolute inset-x-2.5 h-2 rounded-full bg-white/[0.12] pointer-events-none" />
        <div
          className="absolute left-2.5 h-2 rounded-full bg-sky-400/70 pointer-events-none transition-all duration-75"
          style={{ width: `calc((100% - 20px) * ${pct / 100})` }}
        />
        <div className="absolute inset-x-2.5 h-2 pointer-events-none overflow-hidden">
          {sampled.map((entry) => {
            const idx = entries.indexOf(entry);
            const dotPct = total > 0 ? (idx / total) * 100 : 0;
            return (
              <span
                key={entry.id}
                style={{ left: `${dotPct}%` }}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-transform ${getActivityDotClass(entry.action)} ${
                  scrubIndex === idx ? 'scale-125' : 'opacity-80'
                }`}
              />
            );
          })}
          <span
            style={{ left: '100%' }}
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 ${
              isLive ? 'scale-125' : 'opacity-80'
            }`}
          />
        </div>
        <div
          aria-hidden="true"
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-[#0B0F17] shadow-lg pointer-events-none transition-all duration-75 ${
            isLive ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-sky-300 shadow-sky-400/60'
          }`}
          style={{ left: `calc(10px + (100% - 20px) * ${pct / 100})` }}
        />
        <input
          type="range"
          min={0}
          max={total}
          step={1}
          value={sliderValue}
          aria-label="Línea de tiempo de cambios"
          onChange={(e) => onSelectPosition(Number(e.target.value))}
          className="relative w-full h-8 opacity-0 cursor-pointer z-10"
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mt-0.5 px-1">
        <span className="hidden xl:inline font-mono tabular-nums whitespace-nowrap">{formatShortDateTime(entries[0].timestamp)}</span>
        <span className="truncate min-w-0">{isLive ? 'Estado actual' : 'Desliza atrás o adelante'}</span>
        <span className="font-medium text-slate-300 whitespace-nowrap shrink-0">Ahora</span>
      </div>
    </div>
  );
}
