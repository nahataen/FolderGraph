import { useState, type FormEvent } from 'react';
import { FolderPlus, PanelLeftClose, Search } from 'lucide-react';
import type { NodeDisplayMode, NodeVisualTheme, WorkspaceRecord } from '../../../types/indexer';
import { GraphStyleControls } from './GraphStyleControls';
import { WorkspaceList } from './WorkspaceList';

interface WorkspaceSidebarProps {
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onAddWorkspace: (rootPath: string) => Promise<void>;
  onRescanWorkspace: (id: string) => Promise<void>;
  onRemoveWorkspace: (id: string) => Promise<void>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  highlightedCount: number;
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
  onHidePanel: () => void;
  overlayMode?: boolean;
}

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const [folderInput, setFolderInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!folderInput.trim()) {
      setFormError('Ingresa una ruta local válida.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await props.onAddWorkspace(folderInput.trim());
      setFolderInput('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al indexar.');
    } finally {
      setSubmitting(false);
    }
  };

  const positionClass = props.overlayMode
    ? 'absolute inset-y-0 left-0 z-40 shadow-2xl w-[min(88vw,340px)]'
    : 'w-[304px] xl:w-[324px] shrink-0';

  return (
    <aside className={`${positionClass} bg-[#111827] border-r border-white/[0.08] flex flex-col overflow-y-auto p-4 sm:p-5 gap-5`} data-testid="left-panel">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label htmlFor="fts-search" className="font-display text-sm font-semibold text-slate-100">Búsqueda instantánea (FTS5)</label>
          <button
            type="button"
            onClick={props.onHidePanel}
            aria-label="Ocultar panel izquierdo"
            title="Ocultar panel izquierdo"
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] rounded-md"
          >
            <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            id="fts-search"
            type="search"
            value={props.searchQuery}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder="Archivo, función o enlace..."
            className="w-full pl-9 pr-3 py-2.5 text-[13px] bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
          />
        </div>
        {props.searchQuery.trim() && (
          <p className="mt-1.5 text-xs font-mono text-sky-400">{props.highlightedCount} coincidencias encontradas</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5 border-t border-white/[0.07] pt-4">
        <label htmlFor="folder-path-input" className="block font-display text-sm font-semibold text-slate-100">Agregar carpeta local</label>
        <div className="flex gap-2">
          <input
            id="folder-path-input"
            type="text"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            placeholder="/app/applet/src"
            className="flex-1 min-w-0 px-3 py-2.5 text-[13px] font-mono bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            disabled={submitting}
            aria-label="Indexar carpeta"
            className="px-3.5 py-2.5 text-[13px] font-semibold bg-sky-400 hover:bg-sky-300 disabled:opacity-50 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4" aria-hidden="true" />
            <span>Indexar</span>
          </button>
        </div>
        {formError && <p className="text-xs text-rose-400">{formError}</p>}
      </form>

      <WorkspaceList
        workspaces={props.workspaces}
        activeWorkspaceId={props.activeWorkspaceId}
        onSelectWorkspace={props.onSelectWorkspace}
        onRescanWorkspace={props.onRescanWorkspace}
        onRemoveWorkspace={props.onRemoveWorkspace}
      />

      <GraphStyleControls
        displayMode={props.displayMode}
        onDisplayModeChange={props.onDisplayModeChange}
        nodeTheme={props.nodeTheme}
        onNodeThemeChange={props.onNodeThemeChange}
        showSymbols={props.showSymbols}
        onToggleSymbols={props.onToggleSymbols}
        showImportEdges={props.showImportEdges}
        onToggleImportEdges={props.onToggleImportEdges}
        onCollapseAll={props.onCollapseAll}
        onExpandAll={props.onExpandAll}
        onResetPositions={props.onResetPositions}
        hasCustomPositions={props.hasCustomPositions}
      />
    </aside>
  );
}
