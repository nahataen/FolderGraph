import { useState } from 'react';
import { Play } from 'lucide-react';

type McpToolName =
  | 'get_compact_context'
  | 'get_project_structure'
  | 'search_codebase_nodes'
  | 'get_chat_timeline'
  | 'export_graph_mermaid';

export function McpInspectorPanel() {
  const [selectedTool, setSelectedTool] = useState<McpToolName>('get_compact_context');
  const [queryInput, setQueryInput] = useState('scanner');
  const [output, setOutput] = useState<string>('');
  const [running, setRunning] = useState(false);

  const runTool = async () => {
    setRunning(true);
    try {
      const args =
        selectedTool === 'search_codebase_nodes'
          ? { query: queryInput }
          : selectedTool === 'export_graph_mermaid'
            ? { format: 'flowchart' }
            : selectedTool === 'get_chat_timeline'
              ? { only_connected: false }
              : selectedTool === 'get_compact_context'
                ? { maxFiles: 140 }
                : { depth: 3 };

      const res = await fetch('/api/mcp/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: selectedTool, args }),
      });
      const json = await res.json();
      setOutput(JSON.stringify(json, null, 2));
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-xl bg-[#111827] border border-white/[0.08] p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-slate-100">Servidor Local MCP y Endpoints para Agentes</h2>
        <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">
          SSE HTTP: <code className="text-sky-300">/mcp/sse</code> · Stdio: <code className="text-sky-300 break-all">npx tsx src/adapters/mcp/mcpStdio.ts</code>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <select
          aria-label="Seleccionar herramienta MCP"
          value={selectedTool}
          onChange={(e) => setSelectedTool(e.target.value as McpToolName)}
          className="flex-1 min-w-[200px] px-3 py-2.5 text-[13px] font-mono bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100"
        >
          <option value="get_compact_context">get_compact_context (ahorro cuota)</option>
          <option value="get_project_structure">get_project_structure</option>
          <option value="search_codebase_nodes">search_codebase_nodes</option>
          <option value="get_chat_timeline">get_chat_timeline</option>
          <option value="export_graph_mermaid">export_graph_mermaid</option>
        </select>

        {selectedTool === 'search_codebase_nodes' && (
          <input
            type="text"
            aria-label="Parámetro query MCP"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className="px-3 py-2.5 text-[13px] font-mono bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100 w-full sm:w-44"
          />
        )}

        <button
          type="button"
          onClick={() => void runTool()}
          disabled={running}
          className="px-4 py-2.5 text-[13px] font-semibold bg-[#161E2E] hover:bg-[#1E293B] text-sky-400 border border-sky-400/30 rounded-lg flex items-center gap-2"
        >
          <Play className="w-4 h-4" aria-hidden="true" />
          <span>{running ? 'Ejecutando...' : 'Probar herramienta'}</span>
        </button>
      </div>

      <pre className="p-4 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-xs sm:text-[13px] font-mono text-slate-300 max-h-80 overflow-auto leading-relaxed">
        {output || 'Selecciona una herramienta MCP y pulsa "Probar herramienta" para inspeccionar la respuesta en vivo.'}
      </pre>
    </section>
  );
}
