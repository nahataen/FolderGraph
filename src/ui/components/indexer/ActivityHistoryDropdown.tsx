import type { AgentActivityEvent } from '../../../types/protocol';
import { formatCompactBadgeTime, formatFullDateTime, formatShortDateTime } from '../../utils/dateFormat';
import { getActivityDotClass } from '../../utils/graphStyles';

interface ActivityHistoryDropdownProps {
  activities: AgentActivityEvent[];
}

export function ActivityHistoryDropdown({ activities }: ActivityHistoryDropdownProps) {
  return (
    <div
      data-testid="activity-history-dropdown"
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[min(92vw,380px)] rounded-lg bg-[#111827]/95 border border-white/[0.12] shadow-2xl p-3 z-30 backdrop-blur-md"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
        <span className="text-xs font-semibold text-slate-200">Actividad y modificaciones recientes</span>
        <span className="text-[11px] font-mono text-slate-400">{activities.length} eventos</span>
      </div>
      {activities.length === 0 ? (
        <p className="py-2 text-center text-xs text-slate-400">Sin cambios registrados aún.</p>
      ) : (
        <ul className="space-y-1.5 max-h-60 overflow-y-auto">
          {activities.map((item) => (
            <li
              key={item.id}
              title={formatFullDateTime(item.timestamp)}
              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded bg-[#0B0F17]/70 border border-white/[0.05] text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getActivityDotClass(item.action)}`} />
                <span className="font-mono text-slate-100 truncate">{item.label}</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                {formatCompactBadgeTime(item.timestamp)} · {formatShortDateTime(item.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
