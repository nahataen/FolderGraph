import type { NodeDisplayMode } from '../../../types/indexer';

interface GraphStyleControlsProps {
  displayMode: NodeDisplayMode;
  onDisplayModeChange: (mode: NodeDisplayMode) => void;
  showSymbols: boolean;
  onToggleSymbols: () => void;
  showImportEdges: boolean;
  onToggleImportEdges: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onResetPositions: () => void;
  hasCustomPositions: boolean;
}

export function GraphStyleControls(props: GraphStyleControlsProps) {
  return (
    <div className="border-t border-white/[0.07] pt-4 space-y-3">
      <span className="block text-xs font-semibold text-slate-300">Estilo y jerarquía</span>
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#0B0F17] rounded-lg border border-white/[0.08]">
        {(['hybrid', 'minimal', 'detailed'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => props.onDisplayModeChange(mode)}
            className={`py-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
              props.displayMode === mode ? 'bg-[#1E293B] text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {mode === 'hybrid' ? 'Híbrido' : mode === 'minimal' ? 'Puntos' : 'Tarjetas'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <button type="button" onClick={props.onCollapseAll} className="py-1.5 px-1.5 text-[11px] font-medium text-slate-300 bg-[#0B0F17] hover:bg-[#1E293B] border border-white/[0.08] rounded-md">
          Colapsar
        </button>
        <button type="button" onClick={props.onExpandAll} className="py-1.5 px-1.5 text-[11px] font-medium text-slate-300 bg-[#0B0F17] hover:bg-[#1E293B] border border-white/[0.08] rounded-md">
          Expandir
        </button>
        <button
          type="button"
          onClick={props.onResetPositions}
          disabled={!props.hasCustomPositions}
          className="py-1.5 px-1.5 text-[11px] font-medium text-sky-300 disabled:text-slate-500 bg-[#0B0F17] hover:bg-[#1E293B] disabled:hover:bg-[#0B0F17] border border-white/[0.08] rounded-md"
        >
          Ordenar
        </button>
      </div>
      <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
        <span>Símbolos satélite</span>
        <input type="checkbox" checked={props.showSymbols} onChange={props.onToggleSymbols} className="accent-sky-400" />
      </label>
      <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
        <span>Todos los imports</span>
        <input type="checkbox" checked={props.showImportEdges} onChange={props.onToggleImportEdges} className="accent-sky-400" />
      </label>
    </div>
  );
}
