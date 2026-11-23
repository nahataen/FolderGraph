import type { NodeDisplayMode, NodeVisualTheme } from '../../../types/indexer';
import { NODE_THEME_OPTIONS } from '../../utils/nodeThemes';

interface GraphStyleControlsProps {
  displayMode: NodeDisplayMode;
  onDisplayModeChange: (mode: NodeDisplayMode) => void;
  nodeTheme: NodeVisualTheme;
  onNodeThemeChange: (theme: NodeVisualTheme) => void;
  showSymbols: boolean;
  onToggleSymbols: () => void;
  showImportEdges: boolean;
  onToggleImportEdges: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onResetPositions: () => void;
  hasCustomPositions: boolean;
}

const DISPLAY_MODES: Array<{ id: NodeDisplayMode; label: string }> = [
  { id: 'hybrid', label: 'Híbrido' },
  { id: 'minimal', label: 'Puntos' },
  { id: 'capsules', label: 'Cápsulas' },
  { id: 'detailed', label: 'Tarjetas' },
];

export function GraphStyleControls(props: GraphStyleControlsProps) {
  return (
    <div className="border-t border-white/[0.07] pt-4 space-y-3.5">
      <span className="block font-display text-sm font-semibold text-slate-100">Forma y densidad</span>
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0B0F17] rounded-lg border border-white/[0.08]">
        {DISPLAY_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => props.onDisplayModeChange(mode.id)}
            className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              props.displayMode === mode.id ? 'bg-[#1E293B] text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div>
        <span className="block text-[13px] font-medium text-slate-300 mb-2">Estilo visual de nodos</span>
        <div className="flex flex-wrap gap-1.5">
          {NODE_THEME_OPTIONS.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => props.onNodeThemeChange(theme.id)}
              aria-pressed={props.nodeTheme === theme.id}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors ${
                props.nodeTheme === theme.id
                  ? 'bg-[#1E293B] border-sky-400/60 text-sky-300'
                  : 'bg-[#0B0F17] border-white/[0.08] text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full border ${theme.swatchClass}`} aria-hidden="true" />
              <span>{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button type="button" onClick={props.onCollapseAll} className="py-2 px-2 text-xs font-medium text-slate-300 bg-[#0B0F17] hover:bg-[#1E293B] border border-white/[0.08] rounded-md">
          Colapsar
        </button>
        <button type="button" onClick={props.onExpandAll} className="py-2 px-2 text-xs font-medium text-slate-300 bg-[#0B0F17] hover:bg-[#1E293B] border border-white/[0.08] rounded-md">
          Expandir
        </button>
        <button
          type="button"
          onClick={props.onResetPositions}
          disabled={!props.hasCustomPositions}
          className="py-2 px-2 text-xs font-medium text-sky-300 disabled:text-slate-500 bg-[#0B0F17] hover:bg-[#1E293B] disabled:hover:bg-[#0B0F17] border border-white/[0.08] rounded-md"
        >
          Ordenar
        </button>
      </div>
      <label className="flex items-center justify-between text-[13px] text-slate-300 cursor-pointer py-0.5">
        <span>Símbolos satélite</span>
        <input type="checkbox" checked={props.showSymbols} onChange={props.onToggleSymbols} className="w-4 h-4 accent-sky-400" />
      </label>
      <label className="flex items-center justify-between text-[13px] text-slate-300 cursor-pointer py-0.5">
        <span>Todos los imports</span>
        <input type="checkbox" checked={props.showImportEdges} onChange={props.onToggleImportEdges} className="w-4 h-4 accent-sky-400" />
      </label>
    </div>
  );
}
