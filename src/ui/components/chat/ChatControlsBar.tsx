import { useState, type FormEvent } from 'react';
import { Plus, Search } from 'lucide-react';
import type { ChatFilterMode } from '../../../types/chatGraph';

interface ChatControlsBarProps {
  topics: string[];
  topicFilter: string;
  onTopicFilterChange: (t: string) => void;
  filterMode: ChatFilterMode;
  onFilterModeChange: (m: ChatFilterMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  expandAll: boolean;
  onToggleExpandAll: () => void;
  onAddMessage: (content: string) => Promise<void>;
}

export function ChatControlsBar(props: ChatControlsBarProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 2) {
      setError('Escribe una idea de al menos 2 caracteres.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await props.onAddMessage(content.trim());
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar idea.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="shrink-0 bg-[#111827] border-b border-white/[0.08] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
      <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
        <div className="relative flex-1 sm:flex-initial">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar en mapa de ideas"
            value={props.searchQuery}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder="Buscar ideas..."
            className="w-full sm:w-52 pl-9 pr-3 py-2 text-[13px] bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
          />
        </div>

        <select
          aria-label="Filtrar por tema"
          value={props.topicFilter}
          onChange={(e) => props.onTopicFilterChange(e.target.value)}
          className="px-3 py-2 text-[13px] bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-200 focus:outline-none focus:border-sky-400"
        >
          <option value="all">Todos los temas</option>
          {props.topics.map((topic) => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </select>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0F17] rounded-lg border border-white/[0.08]">
          {(['all', 'connected', 'isolated'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => props.onFilterModeChange(mode)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                props.filterMode === mode ? 'bg-[#1E293B] text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'all' ? 'Todas' : mode === 'connected' ? 'Ideas conectadas' : 'Nodos sueltos'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={props.onToggleExpandAll}
          className="px-3 py-2 text-xs sm:text-[13px] font-medium text-slate-200 bg-[#161E2E] hover:bg-[#1E293B] border border-white/[0.08] rounded-lg whitespace-nowrap"
        >
          {props.expandAll ? 'Vista puntos' : 'Expandir tarjetas'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 w-full xl:max-w-md min-w-0">
        <input
          type="text"
          aria-label="Nueva idea o mensaje"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Registrar idea (ej: revisar `scanner.ts`)..."
          className="flex-1 min-w-0 px-3 py-2 text-[13px] bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-3.5 py-2 text-[13px] font-semibold bg-sky-400 hover:bg-sky-300 disabled:opacity-50 text-slate-950 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Añadir idea</span>
        </button>
        {error && <span className="text-xs text-rose-400">{error}</span>}
      </form>
    </div>
  );
}
