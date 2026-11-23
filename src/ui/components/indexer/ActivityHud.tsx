import { useState } from 'react';
import { Check, ChevronDown, Clock, Copy, LayoutGrid, PanelLeftOpen, PanelRightOpen, Sparkles } from 'lucide-react';
import type { AgentActivityEvent } from '../../../types/protocol';
import { formatCompactBadgeTime, formatFullDateTime } from '../../utils/dateFormat';
import { getActivityDotClass } from '../../utils/graphStyles';
import { ActivityHistoryDropdown } from './ActivityHistoryDropdown';

interface ActivityHudProps {
  recentActivities: AgentActivityEvent[];
  totalTokensSaved: number;
  activeCount: number;
  leftOpen: boolean;
  rightOpen: boolean;
  onShowLeft: () => void;
  onShowRight: () => void;
  onCopyCompactContext: () => Promise<number>;
  canArrangeSubtree: boolean;
  onArrangeSubtree: () => void;
}

export function ActivityHud(props: ActivityHudProps) {
  const [copiedTokens, setCopiedTokens] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const latest = props.recentActivities[0];

  const handleCopy = async () => {
    const saved = await props.onCopyCompactContext();
    setCopiedTokens(saved);
    setTimeout(() => setCopiedTokens(null), 2600);
  };

  return (
    <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 pointer-events-none">
      <div className="shrink-0 order-1">
        {!props.leftOpen && (
          <button
            type="button"
            onClick={props.onShowLeft}
            aria-label="Mostrar panel izquierdo"
            className="pointer-events-auto h-9 px-3 rounded-lg bg-[#111827]/95 border border-white/[0.12] text-[13px] font-medium text-slate-200 hover:text-white hover:border-sky-400/50 flex items-center gap-1.5 shadow-lg whitespace-nowrap"
          >
            <PanelLeftOpen className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
            <span>Panel</span>
          </button>
        )}
      </div>

      <div className="order-3 md:order-2 w-full md:w-auto flex justify-center min-w-0">
        <div data-testid="activity-hud" className="relative pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-lg bg-[#111827]/95 border border-white/[0.12] text-[13px] shadow-lg backdrop-blur-sm max-w-full">
          <button
            type="button"
            onClick={() => setHistoryOpen((prev) => !prev)}
            aria-expanded={historyOpen}
            title={latest ? `Último cambio: ${formatFullDateTime(latest.timestamp)}` : 'Ver historial de cambios recientes'}
            className="flex items-center gap-2 min-w-0 hover:text-white transition-colors"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {props.activeCount > 0 && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 ${getActivityDotClass(latest?.action)}`} />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${props.activeCount > 0 ? getActivityDotClass(latest?.action) : 'bg-emerald-400/70'}`} />
            </span>
            <span className="text-[13px] font-medium text-slate-100 truncate max-w-[165px] sm:max-w-[230px]">
              {latest ? latest.label : 'Observando cambios en vivo'}
            </span>
            {latest && (
              <span className="font-mono tabular-nums text-xs text-slate-400 shrink-0 hidden sm:flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{formatCompactBadgeTime(latest.timestamp)}</span>
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${historyOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          <span className="h-4 w-px bg-white/[0.1] hidden lg:inline-block" aria-hidden="true" />

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono tabular-nums text-sky-300 shrink-0" title="Tokens ahorrados usando índice estructural en lugar de leer archivos completos">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>-{props.totalTokensSaved.toLocaleString()} tok</span>
          </div>

          {props.canArrangeSubtree && (
            <button
              type="button"
              onClick={props.onArrangeSubtree}
              className="px-2.5 py-1.5 rounded bg-[#1E293B] hover:bg-violet-400 hover:text-slate-950 text-xs font-medium text-violet-300 transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              title="Acomodar automáticamente el nodo seleccionado y sus subnodos"
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline">Acomodar subnodos</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleCopy()}
            className="px-2.5 py-1.5 rounded bg-[#1E293B] hover:bg-sky-400 hover:text-slate-950 text-xs font-medium text-sky-300 transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            title="Copiar mapa compacto del proyecto para reducir cuota del agente"
          >
            {copiedTokens !== null ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Copiado (-{copiedTokens})</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Contexto IA</span>
              </>
            )}
          </button>

          {historyOpen && <ActivityHistoryDropdown activities={props.recentActivities.slice(0, 8)} />}
        </div>
      </div>

      <div className="shrink-0 order-2 md:order-3">
        {!props.rightOpen && (
          <button
            type="button"
            onClick={props.onShowRight}
            aria-label="Mostrar inspector"
            className="pointer-events-auto h-9 px-3 rounded-lg bg-[#111827]/95 border border-white/[0.12] text-[13px] font-medium text-slate-200 hover:text-white hover:border-sky-400/50 flex items-center gap-1.5 shadow-lg whitespace-nowrap"
          >
            <PanelRightOpen className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
            <span>Inspector</span>
          </button>
        )}
      </div>
    </div>
  );
}
