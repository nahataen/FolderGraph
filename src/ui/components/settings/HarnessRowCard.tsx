import { Check, Code2, Copy, Link2, PlugZap, Unlink } from 'lucide-react';
import { useState } from 'react';
import type { HarnessDetectionResult, HarnessId } from '../../../types/harness';

interface HarnessRowCardProps {
  harness: HarnessDetectionResult;
  busy: boolean;
  onConnect: (id: HarnessId) => void;
  onDisconnect: (id: HarnessId) => void;
}

export function HarnessRowCard({ harness, busy, onConnect, onDisconnect }: HarnessRowCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySnippet = () => {
    void navigator.clipboard.writeText(harness.snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div
      className={`rounded-lg border p-3.5 space-y-2.5 transition-colors ${
        harness.mcpConnected
          ? 'bg-emerald-500/[0.06] border-emerald-400/35'
          : harness.installed
            ? 'bg-sky-500/[0.05] border-sky-400/25'
            : 'bg-[#0B0F17] border-white/[0.07]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-semibold text-[14px] text-slate-100">{harness.name}</span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 border border-white/[0.06]">
            {harness.vendor}
          </span>
        </div>

        {harness.mcpConnected ? (
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1 shrink-0">
            <PlugZap className="w-3 h-3" aria-hidden="true" />
            MCP ({harness.connectedMode ?? 'stdio'})
          </span>
        ) : harness.installed ? (
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/30 shrink-0">
            Detectado
          </span>
        ) : (
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-white/[0.06] shrink-0">
            No detectado
          </span>
        )}
      </div>

      <div className="text-[11px] font-mono text-slate-400 space-y-0.5 break-all">
        {harness.binaryPath && (
          <div>
            Binario: <span className="text-slate-300">{harness.binaryPath}</span>
          </div>
        )}
        <div>
          Config: <span className="text-slate-300">{harness.configFilePath}</span>
        </div>
        {harness.parseError && <div className="text-rose-400">{harness.parseError}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        {harness.mcpConnected ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDisconnect(harness.id)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Unlink className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Desconectar</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onConnect(harness.id)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-sky-400/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{busy ? 'Conectando...' : harness.installed ? 'Conectar MCP' : 'Generar config'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-white/[0.08] bg-[#161E2E] text-slate-300 hover:text-slate-100 inline-flex items-center gap-1.5"
        >
          <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{expanded ? 'Ocultar' : 'Snippet'}</span>
        </button>
      </div>

      {expanded && (
        <div className="pt-2.5 border-t border-white/[0.07]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono text-slate-400">{harness.configFormat}</span>
            <button
              type="button"
              onClick={copySnippet}
              className="px-2 py-1 text-[11px] font-mono rounded border border-white/[0.08] bg-[#111827] text-slate-300 hover:text-sky-300 inline-flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
          <pre className="p-2.5 rounded bg-[#070A10] border border-white/[0.06] text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
            {harness.snippet}
          </pre>
        </div>
      )}
    </div>
  );
}
