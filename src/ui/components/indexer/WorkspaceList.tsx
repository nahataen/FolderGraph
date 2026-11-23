import { RefreshCw, Trash2 } from 'lucide-react';
import type { WorkspaceRecord } from '../../../types/indexer';
import { formatCompactBadgeTime, formatFullDateTime } from '../../utils/dateFormat';

interface WorkspaceListProps {
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onRescanWorkspace: (id: string) => Promise<void>;
  onRemoveWorkspace: (id: string) => Promise<void>;
}

export function WorkspaceList({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onRescanWorkspace,
  onRemoveWorkspace,
}: WorkspaceListProps) {
  return (
    <div className="border-t border-white/[0.07] pt-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-display text-sm font-semibold text-slate-100">Carpetas observadas</span>
        <button
          type="button"
          onClick={() => onSelectWorkspace('all')}
          className={`text-xs ${activeWorkspaceId === 'all' ? 'text-sky-400 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Ver todas
        </button>
      </div>
      <ul className="space-y-2">
        {workspaces.map((ws) => (
          <li
            key={ws.id}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-[13px] ${
              activeWorkspaceId === ws.id
                ? 'bg-[#161E2E] border-sky-400/50 text-slate-100'
                : 'bg-[#0B0F17]/60 border-white/[0.06] text-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectWorkspace(ws.id)}
              className="flex-1 min-w-0 text-left"
              title={`${ws.rootPath}\nÚltimo escaneo: ${formatFullDateTime(ws.lastScannedAt)}`}
            >
              <span className="block truncate font-mono font-medium">{ws.name}</span>
              <span className="block text-xs font-mono text-slate-400 truncate mt-0.5">
                escaneado {formatCompactBadgeTime(ws.lastScannedAt)}
              </span>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => void onRescanWorkspace(ws.id)}
                aria-label={`Re-escanear ${ws.name}`}
                className="p-2 text-slate-400 hover:text-sky-400 rounded-md"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void onRemoveWorkspace(ws.id)}
                aria-label={`Quitar ${ws.name}`}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-md"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
