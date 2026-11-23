import type { ClipboardEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import type { AIProviderPreset } from '../../../types/ai';
import { useAISettings } from '../../hooks/useAISettings';

export function AISettingsPanel() {
  const ai = useAISettings();

  const handleApiKeyPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData?.getData('text')?.trim();
    if (!pasted || ai.preset === 'disabled') return;
    setTimeout(() => void ai.fetchModels(pasted), 20);
  };

  const chatList = ai.modelsResult?.ok ? ai.modelsResult.chatModels : [];
  const embList = ai.modelsResult?.ok ? ai.modelsResult.embeddingModels : [];

  return (
    <section className="rounded-xl bg-[#111827] border border-white/[0.08] p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-slate-100">Capa Opcional de IA (Compatible OpenAI API)</h2>
        <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">
          El motor funciona 100% offline con AST y TF-IDF. Pega tu API Key para consultar automáticamente los modelos disponibles del proveedor.
        </p>
      </div>

      <form onSubmit={ai.handleSave} className="space-y-3.5">
        <div>
          <label htmlFor="ai-preset" className="block text-[13px] font-medium text-slate-200 mb-1.5">Proveedor</label>
          <select id="ai-preset" value={ai.preset} onChange={(e) => ai.handlePresetChange(e.target.value as AIProviderPreset)} className="w-full px-3 py-2.5 text-[13px] bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100">
            <option value="disabled">Desactivado (Solo motor local sin IA)</option>
            <option value="ollama_local">Ollama Local (127.0.0.1:11434)</option>
            <option value="lmstudio_local">LM Studio Local (127.0.0.1:1234)</option>
            <option value="nvidia_nim">NVIDIA NIM API</option>
            <option value="openai">OpenAI API</option>
            <option value="custom_https">HTTPS Compatible Personalizado</option>
          </select>
        </div>

        {ai.preset === 'custom_https' && (
          <div>
            <label htmlFor="ai-base-url" className="block text-[13px] font-medium text-slate-200 mb-1.5">Base URL (HTTPS)</label>
            <input id="ai-base-url" type="url" value={ai.baseUrl} onChange={(e) => ai.setBaseUrl(e.target.value)} placeholder="https://api.ejemplo.com/v1" className="w-full px-3 py-2.5 text-[13px] font-mono bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100" />
          </div>
        )}

        <div>
          <label htmlFor="ai-key" className="block text-[13px] font-medium text-slate-200 mb-1.5">
            API Key {ai.settings?.hasApiKey ? `(guardada: ${ai.settings.apiKeyHint})` : '(opcional para local)'}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="ai-key"
              type="password"
              value={ai.apiKey}
              onChange={(e) => ai.setApiKey(e.target.value)}
              onPaste={handleApiKeyPaste}
              placeholder="Pega tu API Key para consultar modelos"
              disabled={ai.preset === 'disabled'}
              className="flex-1 min-w-0 px-3 py-2.5 text-[13px] font-mono bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void ai.fetchModels()}
              disabled={ai.preset === 'disabled' || ai.fetchingModels}
              className="px-3.5 py-2.5 text-[13px] font-medium bg-[#1E293B] hover:bg-[#2A3852] text-sky-300 border border-white/[0.08] rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-40 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${ai.fetchingModels ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{ai.fetchingModels ? 'Consultando...' : 'Consultar'}</span>
            </button>
          </div>
        </div>

        {ai.modelsResult && (
          <div data-testid="models-fetch-status" className={`px-3 py-2.5 rounded-lg border text-[13px] ${ai.modelsResult.ok ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'}`}>
            {ai.modelsResult.ok
              ? `Conexión verificada (${ai.modelsResult.latencyMs} ms) · ${ai.modelsResult.models.length} modelos disponibles`
              : ai.modelsResult.error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="ai-model" className="block text-[13px] font-medium text-slate-200 mb-1.5">Modelo de chat</label>
            <input id="ai-model" type="text" value={ai.modelName} onChange={(e) => ai.setModelName(e.target.value)} placeholder="qwen2.5-coder:7b" disabled={ai.preset === 'disabled'} className="w-full px-3 py-2.5 text-[13px] font-mono bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100 disabled:opacity-50" />
            {chatList.length > 0 && (
              <select aria-label="Elegir modelo de chat obtenido" value={ai.modelName} onChange={(e) => ai.setModelName(e.target.value)} className="mt-2 w-full px-3 py-2 text-xs font-mono bg-[#0B0F17] border border-sky-400/30 rounded-lg text-sky-200">
                {chatList.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="ai-emb" className="block text-[13px] font-medium text-slate-200 mb-1.5">Modelo de embeddings</label>
            <input id="ai-emb" type="text" value={ai.embeddingModel} onChange={(e) => ai.setEmbeddingModel(e.target.value)} placeholder="nomic-embed-text" disabled={ai.preset === 'disabled'} className="w-full px-3 py-2.5 text-[13px] font-mono bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100 disabled:opacity-50" />
            {embList.length > 0 && (
              <select aria-label="Elegir modelo de embeddings obtenido" value={ai.embeddingModel} onChange={(e) => ai.setEmbeddingModel(e.target.value)} className="mt-2 w-full px-3 py-2 text-xs font-mono bg-[#0B0F17] border border-sky-400/30 rounded-lg text-sky-200">
                {embList.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <span className="text-[13px] text-sky-400">{ai.feedback ?? ''}</span>
          <button type="submit" disabled={ai.saving} className="px-4 py-2.5 text-[13px] font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-lg transition-colors">
            {ai.saving ? 'Guardando...' : 'Guardar ajustes'}
          </button>
        </div>
      </form>
    </section>
  );
}
