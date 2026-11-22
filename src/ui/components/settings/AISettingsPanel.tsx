import { useEffect, useState, type FormEvent } from 'react';
import type { AIProviderPreset, AIProviderSettings } from '../../../types/ai';

export function AISettingsPanel() {
  const [settings, setSettings] = useState<AIProviderSettings | null>(null);
  const [preset, setPreset] = useState<AIProviderPreset>('disabled');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('');
  const [embeddingModel, setEmbeddingModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/settings/ai')
      .then((res) => res.json())
      .then((data: AIProviderSettings) => {
        setSettings(data);
        setPreset(data.preset);
        setBaseUrl(data.baseUrl);
        setModelName(data.modelName);
        setEmbeddingModel(data.embeddingModel);
      });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset,
          baseUrl: preset === 'custom_https' ? baseUrl : undefined,
          apiKey: apiKey.trim() ? apiKey.trim() : undefined,
          modelName,
          embeddingModel,
          enabled: preset !== 'disabled',
        }),
      });
      const updated = (await res.json()) as AIProviderSettings;
      setSettings(updated);
      setBaseUrl(updated.baseUrl);
      setModelName(updated.modelName);
      setEmbeddingModel(updated.embeddingModel);
      setApiKey('');
      setFeedback('Configuración guardada en el servidor local.');
    } catch {
      setFeedback('No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl bg-[#111827] border border-white/[0.08] p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">Capa Opcional de IA (Compatible OpenAI API)</h2>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
          El motor funciona 100% offline con AST y TF-IDF. Activa Ollama, LM Studio, NVIDIA NIM u OpenAI para embeddings semánticos.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label htmlFor="ai-preset" className="block text-xs font-medium text-slate-300 mb-1">Proveedor</label>
          <select id="ai-preset" value={preset} onChange={(e) => setPreset(e.target.value as AIProviderPreset)} className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100">
            <option value="disabled">Desactivado (Solo motor local sin IA)</option>
            <option value="ollama_local">Ollama Local (127.0.0.1:11434)</option>
            <option value="lmstudio_local">LM Studio Local (127.0.0.1:1234)</option>
            <option value="nvidia_nim">NVIDIA NIM API</option>
            <option value="openai">OpenAI API</option>
            <option value="custom_https">HTTPS Compatible Personalizado</option>
          </select>
        </div>

        {preset === 'custom_https' && (
          <div>
            <label htmlFor="ai-base-url" className="block text-xs font-medium text-slate-300 mb-1">Base URL (HTTPS)</label>
            <input id="ai-base-url" type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.ejemplo.com/v1" className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100" />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ai-model" className="block text-xs font-medium text-slate-300 mb-1">Modelo de chat</label>
            <input id="ai-model" type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="qwen2.5-coder:7b" disabled={preset === 'disabled'} className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100 disabled:opacity-50" />
          </div>
          <div>
            <label htmlFor="ai-emb" className="block text-xs font-medium text-slate-300 mb-1">Modelo de embeddings</label>
            <input id="ai-emb" type="text" value={embeddingModel} onChange={(e) => setEmbeddingModel(e.target.value)} placeholder="nomic-embed-text" disabled={preset === 'disabled'} className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100 disabled:opacity-50" />
          </div>
        </div>

        <div>
          <label htmlFor="ai-key" className="block text-xs font-medium text-slate-300 mb-1">
            API Key {settings?.hasApiKey ? `(guardada: ${settings.apiKeyHint})` : '(opcional para local)'}
          </label>
          <input id="ai-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Dejar vacío para conservar o usar local" disabled={preset === 'disabled'} className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F17] border border-white/[0.1] rounded-lg text-slate-100 disabled:opacity-50" />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-sky-400">{feedback ?? ''}</span>
          <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-lg transition-colors">
            {saving ? 'Guardando...' : 'Guardar ajustes'}
          </button>
        </div>
      </form>
    </section>
  );
}
