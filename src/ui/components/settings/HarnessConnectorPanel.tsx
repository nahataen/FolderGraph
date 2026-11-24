import { RefreshCw, Terminal } from 'lucide-react';
import { useState } from 'react';
import { useHarnesses } from '../../hooks/useHarnesses';
import { HarnessRowCard } from './HarnessRowCard';

export function HarnessConnectorPanel() {
  const { scan, mode, setMode, loading, busyId, error, statusMessage, rescan, connectHarness, disconnectHarness } =
    useHarnesses();
  const [filterMode, setFilterMode] = useState<'all' | 'detected'>('all');

  const harnesses = scan?.harnesses ?? [];
  const visibleHarnesses =
    filterMode === 'detected' ? harnesses.filter((h) => h.installed || h.mcpConnected) : harnesses;

  return (
    <section className="rounded-xl bg-[#111827] border border-white/[0.08] p-5 sm:p-6 space-y-4 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-slate-100">
              Detección de Harnesses y Conexión MCP
            </h2>
          </div>
          <p className="mt-1 text-[13px] text-slate-400">
            Indaga los CLIs e IDEs instalados en este equipo (Claude Code, Codex CLI, Antigravity, Gemini CLI, DeepSeek, MiniMax, VS Code, Cursor, OpenCode) y enlázalos con StrataGraph MCP.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void rescan()}
          disabled={loading}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-sky-400/35 bg-[#161E2E] hover:bg-[#1E293B] text-sky-300 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{loading ? 'Escaneando...' : 'Re-escanear equipo'}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#0B0F17] border border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="text-slate-300">
            Detectados: <strong className="text-sky-400">{scan?.detectedCount ?? 0}</strong>
          </span>
          <span className="text-slate-300">
            Conectados a MCP: <strong className="text-emerald-400">{scan?.connectedCount ?? 0}</strong>
          </span>
          <span className="text-slate-400">Catálogo: {harnesses.length}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-white/[0.08] overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setMode('stdio')}
              className={`px-2.5 py-1 font-mono ${
                mode === 'stdio' ? 'bg-sky-500/20 text-sky-300 font-semibold' : 'bg-[#111827] text-slate-400'
              }`}
            >
              Stdio local
            </button>
            <button
              type="button"
              onClick={() => setMode('sse')}
              className={`px-2.5 py-1 font-mono ${
                mode === 'sse' ? 'bg-sky-500/20 text-sky-300 font-semibold' : 'bg-[#111827] text-slate-400'
              }`}
            >
              SSE HTTP
            </button>
          </div>

          <div className="flex rounded-md border border-white/[0.08] overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 ${
                filterMode === 'all' ? 'bg-white/10 text-slate-100 font-medium' : 'bg-[#111827] text-slate-400'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('detected')}
              className={`px-2.5 py-1 ${
                filterMode === 'detected' ? 'bg-white/10 text-slate-100 font-medium' : 'bg-[#111827] text-slate-400'
              }`}
            >
              Solo detectados
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="px-3.5 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-xs text-emerald-300">
          {statusMessage}
        </div>
      )}
      {error && (
        <div className="px-3.5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-400/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      {visibleHarnesses.length === 0 ? (
        <div className="p-6 text-center rounded-lg bg-[#0B0F17] border border-white/[0.06] text-xs text-slate-400">
          {loading
            ? 'Sondeando binarios y rutas de configuración...'
            : 'Ningún harness detectado en las rutas locales de este entorno. Cambia a "Todos" para generar o copiar la configuración MCP.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleHarnesses.map((harness) => (
            <HarnessRowCard
              key={harness.id}
              harness={harness}
              busy={busyId === harness.id}
              onConnect={(id) => void connectHarness(id)}
              onDisconnect={(id) => void disconnectHarness(id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
