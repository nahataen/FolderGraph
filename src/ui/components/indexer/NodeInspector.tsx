import { useState } from 'react';
import { Check, Copy, GitFork, LayoutGrid, PanelRightClose, X } from 'lucide-react';
import type { FileNodeRecord } from '../../../types/indexer';
import { NodeInspectorLists } from './NodeInspectorLists';

interface NodeInspectorProps {
  node: FileNodeRecord | null;
  allNodes: FileNodeRecord[];
  onClose: () => void;
  onHidePanel: () => void;
  onExportSubgraph: (nodeId: string) => void;
  onCopyCompactContext: (nodeId?: string) => Promise<number>;
  canArrangeSubtree: boolean;
  onArrangeSubtree: () => void;
  overlayMode?: boolean;
}

export function NodeInspector({
  node,
  allNodes,
  onClose,
  onHidePanel,
  onExportSubgraph,
  onCopyCompactContext,
  canArrangeSubtree,
  onArrangeSubtree,
  overlayMode,
}: NodeInspectorProps) {
  const [copiedSaved, setCopiedSaved] = useState<number | null>(null);
  const [arrangedFlash, setArrangedFlash] = useState(false);

  const handleCopy = async (nodeId?: string) => {
    const saved = await onCopyCompactContext(nodeId);
    setCopiedSaved(saved);
    setTimeout(() => setCopiedSaved(null), 2400);
  };

  const handleArrange = () => {
    onArrangeSubtree();
    setArrangedFlash(true);
    setTimeout(() => setArrangedFlash(false), 1800);
  };

  const panelClass = overlayMode
    ? 'absolute inset-y-0 right-0 z-40 shadow-2xl w-[min(90vw,356px)]'
    : 'w-[316px] xl:w-[340px] shrink-0';

  if (!node) {
    return (
      <aside className={`${panelClass} bg-[#111827] border-l border-white/[0.08] p-5 flex flex-col`} data-testid="right-panel">
        <div className="flex items-center justify-between mb-4">
          <span className="font-display text-sm font-semibold text-slate-100">Inspector estructural</span>
          <button type="button" onClick={onHidePanel} aria-label="Ocultar inspector" title="Ocultar inspector" className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] rounded-md">
            <PanelRightClose className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 flex flex-col justify-center text-center px-3">
          <p className="text-[13px] text-slate-400 leading-relaxed">
            Selecciona cualquier carpeta, archivo o símbolo satélite para ver sus dependencias, fechas o acomodar sus subnodos.
          </p>
        </div>
      </aside>
    );
  }

  const childSymbols = allNodes.filter((n) => n.parentId === node.id && n.type === 'symbol');
  const imports = node.metadata.imports ?? [];
  const exportsList = node.metadata.exports ?? [];

  return (
    <aside className={`${panelClass} bg-[#111827] border-l border-white/[0.08] flex flex-col overflow-y-auto p-5 gap-4`} data-testid="right-panel">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-slate-100 truncate">{node.name}</h2>
          <p className="mt-0.5 text-xs font-mono text-slate-400 break-all">{node.path}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={onClose} aria-label="Limpiar selección" className="p-1.5 text-slate-400 hover:text-slate-100 rounded-md">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onHidePanel} aria-label="Ocultar inspector" title="Ocultar inspector" className="p-1.5 text-slate-400 hover:text-slate-100 rounded-md">
            <PanelRightClose className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono text-slate-300 border-y border-white/[0.07] py-2.5">
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
          onClick={handleArrange}
          disabled={!canArrangeSubtree}
          className="w-full py-2.5 px-3.5 text-[13px] font-semibold text-violet-300 bg-[#161E2E] hover:bg-[#1E293B] border border-violet-400/30 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
          title={canArrangeSubtree ? 'Acomoda automáticamente el nodo seleccionado junto con todos sus subnodos' : 'Este nodo no tiene subnodos visibles para acomodar'}
        >
          {arrangedFlash ? <Check className="w-4 h-4" aria-hidden="true" /> : <LayoutGrid className="w-4 h-4" aria-hidden="true" />}
          <span>{arrangedFlash ? 'Subnodos acomodados' : 'Acomodar nodo y subnodos'}</span>
        </button>
        <button
          type="button"
          onClick={() => void handleCopy(node.id)}
          className="w-full py-2.5 px-3.5 text-[13px] font-semibold text-emerald-300 bg-[#161E2E] hover:bg-[#1E293B] border border-emerald-400/30 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {copiedSaved !== null ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          <span>{copiedSaved !== null ? `Copiado (-${copiedSaved} tok)` : 'Contexto compacto IA'}</span>
        </button>
        <button
          type="button"
          onClick={() => onExportSubgraph(node.id)}
          className="w-full py-2.5 px-3.5 text-[13px] font-semibold text-sky-400 bg-[#161E2E] hover:bg-[#1E293B] border border-sky-400/30 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <GitFork className="w-4 h-4" aria-hidden="true" />
          <span>Exportar subgrafo Mermaid</span>
        </button>
      </div>

      <NodeInspectorLists node={node} imports={imports} exportsList={exportsList} childSymbols={childSymbols} />
    </aside>
  );
}
