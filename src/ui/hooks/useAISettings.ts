import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AI_PRESET_DEFAULTS } from '../../adapters/ai/providerModels';
import type { AIProviderPreset, AIProviderSettings, ProviderModelsResult } from '../../types/ai';

export function useAISettings() {
  const [settings, setSettings] = useState<AIProviderSettings | null>(null);
  const [preset, setPreset] = useState<AIProviderPreset>('disabled');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('');
  const [embeddingModel, setEmbeddingModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelsResult, setModelsResult] = useState<ProviderModelsResult | null>(null);
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

  const handlePresetChange = useCallback((nextPreset: AIProviderPreset) => {
    setPreset(nextPreset);
    setModelsResult(null);
    setFeedback(null);
    const defaults = AI_PRESET_DEFAULTS[nextPreset];
    setBaseUrl(defaults.baseUrl);
    setModelName(defaults.modelName);
    setEmbeddingModel(defaults.embeddingModel);
  }, []);

  const fetchModels = useCallback(
    async (overrideKey?: string) => {
      if (preset === 'disabled') return;
      setFetchingModels(true);
      setFeedback(null);
      try {
        const keyToSend = (overrideKey ?? apiKey).trim();
        const res = await fetch('/api/settings/ai/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preset,
            baseUrl: preset === 'custom_https' ? baseUrl : undefined,
            apiKey: keyToSend || undefined,
          }),
        });
        const data = (await res.json()) as ProviderModelsResult;
        setModelsResult(data);
        if (data.ok) {
          if (data.chatModels.length > 0 && !data.chatModels.includes(modelName)) {
            setModelName(data.chatModels[0]);
          }
          if (data.embeddingModels.length > 0 && !data.embeddingModels.includes(embeddingModel)) {
            setEmbeddingModel(data.embeddingModels[0]);
          }
        }
      } catch {
        setModelsResult({
          ok: false,
          preset,
          endpoint: '',
          models: [],
          chatModels: [],
          embeddingModels: [],
          latencyMs: 0,
          error: 'No se pudo consultar el proveedor desde el servidor local.',
        });
      } finally {
        setFetchingModels(false);
      }
    },
    [preset, baseUrl, apiKey, modelName, embeddingModel]
  );

  const handleSave = useCallback(
    async (e: FormEvent) => {
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
    },
    [preset, baseUrl, apiKey, modelName, embeddingModel]
  );

  return {
    settings,
    preset,
    baseUrl,
    setBaseUrl,
    modelName,
    setModelName,
    embeddingModel,
    setEmbeddingModel,
    apiKey,
    setApiKey,
    saving,
    fetchingModels,
    modelsResult,
    feedback,
    handlePresetChange,
    fetchModels,
    handleSave,
  };
}
