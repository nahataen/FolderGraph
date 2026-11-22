export type AIProviderPreset = 'disabled' | 'ollama_local' | 'lmstudio_local' | 'nvidia_nim' | 'openai' | 'custom_https';

export interface AIProviderSettings {
  preset: AIProviderPreset;
  baseUrl: string;
  modelName: string;
  embeddingModel: string;
  hasApiKey: boolean;
  apiKeyHint: string;
  enabled: boolean;
}

export interface UpdateAISettingsInput {
  preset: AIProviderPreset;
  baseUrl?: string;
  apiKey?: string;
  modelName: string;
  embeddingModel?: string;
  enabled: boolean;
}

export interface EmbeddingResult {
  vector: number[];
  model: string;
}

export interface IAIProvider {
  readonly id: string;
  embedText(text: string): Promise<EmbeddingResult | null>;
  summarizeText(text: string, context?: string): Promise<string | null>;
}
