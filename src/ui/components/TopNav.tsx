import { FileCode2 } from 'lucide-react';

export type WorkspaceTab = 'indexer' | 'chat' | 'settings';

interface TopNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenMermaid: () => void;
}

export function TopNav({ activeTab, onSelectTab, onOpenMermaid }: TopNavProps) {
  const navItems: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'indexer', label: 'Indexador' },
    { id: 'chat', label: 'Mapa de Ideas' },
    { id: 'settings', label: 'MCP y Ajustes' },
  ];

  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-8 px-6 bg-[#111827] border-b border-white/[0.08]">
      <div className="flex items-center gap-2.5 shrink-0">
        <FileCode2 className="w-5 h-5 text-sky-400 shrink-0" aria-hidden="true" />
        <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          StrataGraph
        </span>
      </div>

      <nav className="flex items-center gap-7" aria-label="Espacios de trabajo">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-sm ${
                isActive ? 'text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-400" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenMermaid}
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          Exportar Mermaid
        </button>
      </div>
    </header>
  );
}
