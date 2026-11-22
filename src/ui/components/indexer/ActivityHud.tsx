import { useState } from 'react';
import { Check, Copy, PanelLeftOpen, PanelRightOpen, Sparkles } from 'lucide-react';
import type { AgentActivityEvent } from '../../../types/protocol';
import { getActivityDotClass } from '../../utils/graphStyles';

interface ActivityHudProps {
  recentActivities: AgentActivityEvent[];
  totalTokensSaved: number;
  activeCount: number;
  leftOpen: boolean;
  rightOpen: boolean;
  onShowLeft: () => void;
  onShowRight: () => void;
  onCopyCompactContext: () => Promise<number>;
}

export function ActivityHud(props: ActivityHudProps) {
  const [copiedTokens, setCopiedTokens] = useState<number | null>(null);
  const latest = props.recentActivities[0];

  const handleCopy = async () => {
    const saved = await props.onCopyCompactContext();
    setCopiedTokens(saved);
    setTimeout(() => setCopiedTokens(null), 2600);
  };

  return (
    <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
      <div>
        {!props.leftOpen && (
          <button
            type="button"
            onClick={props.onShowLeft}
            aria-label="Mostrar panel izquierdo"
            className="pointer-events-auto h-8 px-2.5 rounded-lg bg-[#111827]/95 border border-white/[0.1] text-xs font-medium text-slate-200 hover:text-white hover:border-sky-400/50 flex items-center gap-1.5 shadow-lg"
          >
            <PanelLeftOpen className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>Panel</span>
          </button>
        )}
      </div>

      <div data-testid="activity-hud" className="pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#111827]/95 border border-white/[0.1] text-xs shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            {props.activeCount > 0 && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 ${getActivityDotClass(latest?.action)}`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${props.activeCount > 0 ? getActivityDotClass(latest?.action) : 'bg-emerald-400/70'}`} />
          </span>
          <span className="font-mono text-[11px] text-slate-200 truncate max-w-[230px]">
            {latest ? latest.label : 'Observando cambios en vivo'}
          </span>
        </div>

        <span className="h-3.5 w-px bg-white/[0.1]" aria-hidden="true" />

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-sky-300 shrink-0" title="Tokens ahorrados usando índice estructural en lugar de leer archivos completos">
          <Sparkles className="w-3 h-3 text-sky-400" aria-hidden="true" />
          <span>-{props.totalTokensSaved.toLocaleString()} tok</span>
        </div>

        <button
          type="button"
          onClick={() => void handleCopy()}
          className="ml-0.5 px-2 py-1 rounded bg-[#1E293B] hover:bg-sky-400 hover:text-slate-950 text-[11px] font-medium text-sky-300 transition-colors flex items-center gap-1 shrink-0"
          title="Copiar mapa compacto del proyecto para reducir cuota del agente"
        >
          {copiedTokens !== null ? (
            <>
              <Check className="w-3 h-3" aria-hidden="true" />
              <span>Copiado (-{copiedTokens} tok)</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" aria-hidden="true" />
              <span>Contexto IA</span>
            </>
          )}
        </button>
      </div>

      <div>
        {!props.rightOpen && (
          <button
            type="button"
            onClick={props.onShowRight}
            aria-label="Mostrar inspector"
            className="pointer-events-auto h-8 px-2.5 rounded-lg bg-[#111827]/95 border border-white/[0.1] text-xs font-medium text-slate-200 hover:text-white hover:border-sky-400/50 flex items-center gap-1.5 shadow-lg"
          >
            <PanelRightOpen className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>Inspector</span>
          </button>
        )}
      </div>
    </div>
  );
}
