import { Clock } from 'lucide-react';
import type { FileNodeRecord } from '../../../types/indexer';
import { formatFullDateTime, formatRelativeTime } from '../../utils/dateFormat';

interface NodeInspectorListsProps {
  node: FileNodeRecord;
  imports: string[];
  exportsList: string[];
  childSymbols: FileNodeRecord[];
}

export function NodeInspectorLists({ node, imports, exportsList, childSymbols }: NodeInspectorListsProps) {
  const modifiedTs = node.metadata.modifiedAt ?? node.updatedAt;
  const createdTs = node.metadata.createdAt;

  return (
    <>
      <div className="rounded-lg bg-[#0B0F17]/80 border border-white/[0.07] p-2.5 space-y-1.5" data-testid="inspector-dates">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
            <span>Registro temporal</span>
          </div>
          <span className="text-[10px] font-mono text-sky-300">{formatRelativeTime(modifiedTs)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2 text-[11px] font-mono">
          <span className="text-slate-400 shrink-0">Modificado</span>
          <span className="text-slate-200 text-right">{formatFullDateTime(modifiedTs)}</span>
        </div>
        {createdTs && (
          <div className="flex items-baseline justify-between gap-2 text-[11px] font-mono">
            <span className="text-slate-400 shrink-0">Creación</span>
            <span className="text-slate-300 text-right">{formatFullDateTime(createdTs)}</span>
          </div>
        )}
      </div>

      {imports.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-300 mb-1.5">Dependencias ({imports.length})</h3>
          <ul className="space-y-1 max-h-36 overflow-y-auto">
            {imports.map((imp) => (
              <li key={imp} className="text-[11px] font-mono text-slate-400 truncate">
                {imp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {exportsList.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-300 mb-1.5">Exportaciones ({exportsList.length})</h3>
          <ul className="space-y-1">
            {exportsList.map((exp) => (
              <li key={exp} className="text-[11px] font-mono text-sky-300 truncate">
                {exp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {childSymbols.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-300 mb-1.5">Símbolos extraídos ({childSymbols.length})</h3>
          <ul className="space-y-1">
            {childSymbols.map((sym) => (
              <li key={sym.id} className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                <span className="truncate">{sym.name}</span>
                <span className="text-slate-500 ml-2 shrink-0">{sym.metadata.symbolKind}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
