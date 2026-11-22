import { useState } from 'react';
import { Check, Copy, GitFork, PanelRightClose, X } from 'lucide-react';
import type { FileNodeRecord } from '../../../types/indexer';

interface NodeInspectorProps {
  node: FileNodeRecord | null;
  allNodes: FileNodeRecord[];
  onClose: () => void;
  onHidePanel: () => void;
  onExportSubgraph: (nodeId: string) => void;
  onCopyCompactContext: (nodeId?: string) => Promise<number>;
}

export function NodeInspector({ node, allNodes, onClose, onHidePanel, onExportSubgraph, onCopyCompactContext }: NodeInspectorProps) {
  const [copiedSaved, setCopiedSaved] = useState<number | null>(null);

  const handleCopy = async (nodeId?: string) => {
    const saved = await onCopyCompactContext(nodeId);
    setCopiedSaved(saved);
    setTimeout(() => setCopiedSaved(null), 2400);
  };

  if (!node) {
    return (
      <aside className="w-[272px] shrink-0 bg-[#111827] border-l border-white/[0.08] p-4 flex flex-col" data-testid="right-panel">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-slate-300">Inspector estructural</span>
          <button
            type="button"
            onClick={onHidePanel}
            aria-label="Ocultar inspector"
            title="Ocultar inspector"
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] rounded"
          >
            <PanelRightClose className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 flex flex-col justify-center text-center px-2">
          <p className="text-xs text-slate-500 leading-relaxed">
            Selecciona cualquier carpeta, archivo o símbolo satélite para ver sus dependencias o copiar contexto compacto.
          </p>
        </div>
      </aside>
    );
  }

  const childSymbols = allNodes.filter((n) => n.parentId === node.id && n.type === 'symbol');
  const imports = node.metadata.imports ?? [];
  const exportsList = node.metadata.exports ?? [];

  return (
    <aside className="w-[288px] shrink-0 bg-[#111827] border-l border-white/[0.08] flex flex-col overflow-y-auto p-4 gap-3.5" data-testid="right-panel">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-100 truncate">{node.name}</h2>
          <p className="mt-0.5 text-[11px] font-mono text-slate-400 break-all">{node.path}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={onClose} aria-label="Limpiar selección" className="p-1 text-slate-400 hover:text-slate-100 rounded">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onHidePanel} aria-label="Ocultar inspector" title="Ocultar inspector" className="p-1 text-slate-400 hover:text-slate-100 rounded">
            <PanelRightClose className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono text-slate-300 border-y border-white/[0.07] py-2">
        <span>{node.type}</span>
        <span aria-hidden="true">·</span>
        <span>nivel {node.metadata.depth}</span>
        {node.metadata.lines !== undefined && (
          <>
            <span aria-hidden="true">·</span>
            <span>{node.metadata.lines} líneas</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={() => void handleCopy(node.id)}
          className="w-full py-2 px-3 text-xs font-semibold text-emerald-300 bg-[#161E2E] hover:bg-[#1E293B] border border-emerald-400/30 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {copiedSaved !== null ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
          <span>{copiedSaved !== null ? `Copiado (-${copiedSaved} tok)` : 'Contexto compacto IA'}</span>
        </button>
        <button
          type="button"
          onClick={() => onExportSubgraph(node.id)}
          className="w-full py-2 px-3 text-xs font-semibold text-sky-400 bg-[#161E2E] hover:bg-[#1E293B] border border-sky-400/30 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <GitFork className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Exportar subgrafo Mermaid</span>
        </button>
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
    </aside>
  );
}
