import { useEffect, useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import type { MermaidExportResult, MermaidFormat } from '../../../types/protocol';

interface MermaidModalProps {
  open: boolean;
  rootNodeId?: string;
  workspaceId: string;
  onClose: () => void;
}

export function MermaidModal({ open, rootNodeId, workspaceId, onClose }: MermaidModalProps) {
  const [format, setFormat] = useState<MermaidFormat>('flowchart');
  const [includeSymbols, setIncludeSymbols] = useState(false);
  const [maxDepth, setMaxDepth] = useState(4);
  const [result, setResult] = useState<MermaidExportResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void fetch('/api/export/mermaid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, rootNodeId, workspaceId, maxDepth, includeSymbols, includeImports: true }),
    })
      .then((res) => res.json())
      .then((data: MermaidExportResult) => {
        if (!cancelled) setResult(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, format, rootNodeId, workspaceId, maxDepth, includeSymbols]);

  if (!open) return null;

  const handleCopy = async () => {
    if (!result?.code) return;
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!result?.code) return;
    const blob = new Blob([result.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stratagraph-${format}.mmd`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="Exportador Mermaid">
      <div className="w-full max-w-3xl rounded-xl bg-[#111827] border border-white/[0.12] flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-100">Exportador Mermaid</h2>
            <p className="text-xs font-mono tabular-nums text-slate-400 mt-0.5">
              {result ? `${result.nodeCount} nodos · ${result.edgeCount} relaciones` : 'Generando sintaxis...'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar exportador Mermaid" className="p-2 text-slate-400 hover:text-slate-100 rounded-md">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-white/[0.08] bg-[#0B0F17]/50">
          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] rounded-lg border border-white/[0.08]">
            {(['flowchart', 'mindmap'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`px-3 py-1.5 text-xs sm:text-[13px] font-medium rounded-md transition-colors ${
                  format === fmt ? 'bg-[#1E293B] text-sky-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fmt === 'flowchart' ? 'flowchart TD' : 'mindmap'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-300">
            <label className="flex items-center gap-2">
              <span>Profundidad</span>
              <select
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="bg-[#0B0F17] border border-white/[0.1] rounded-md px-2.5 py-1.5 font-mono text-xs sm:text-[13px]"
              >
                {[2, 3, 4, 5, 6].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeSymbols} onChange={() => setIncludeSymbols((v) => !v)} className="w-4 h-4 accent-sky-400" />
              <span>Incluir símbolos</span>
            </label>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <pre className="p-4 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-xs sm:text-[13px] font-mono text-slate-200 overflow-x-auto leading-relaxed">
            {loading ? 'Generando diagrama...' : result?.code ?? ''}
          </pre>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 text-[13px] font-medium text-slate-200 bg-[#161E2E] hover:bg-[#1E293B] border border-white/[0.1] rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Descargar .mmd</span>
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="px-4 py-2 text-[13px] font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
            <span>{copied ? 'Copiado' : 'Copiar código'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
