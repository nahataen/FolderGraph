import type { IAIProvider } from '../../types/ai';
import type { SettingsRepository } from '../../db/settingsRepo';
import { OpenAICompatibleAdapter } from './openAICompatibleAdapter';

export function createActiveAIProvider(settingsRepo: SettingsRepository): IAIProvider | null {
  const cfg = settingsRepo.getInternalAIConfig();
  if (!cfg.enabled || cfg.preset === 'disabled' || !cfg.baseUrl) {
    return null;
  }

  return new OpenAICompatibleAdapter({
    preset: cfg.preset,
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    modelName: cfg.modelName,
    embeddingModel: cfg.embeddingModel,
  });
}
