import type Database from 'better-sqlite3';
import type { AIProviderPreset, AIProviderSettings, UpdateAISettingsInput } from '../types/ai';

interface StoredAIConfig {
  preset: AIProviderPreset;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  embeddingModel: string;
  enabled: boolean;
}

const AI_SETTINGS_KEY = 'ai_provider_config';

const PRESET_DEFAULTS: Record<AIProviderPreset, { baseUrl: string; modelName: string; embeddingModel: string }> = {
  disabled: { baseUrl: '', modelName: '', embeddingModel: '' },
  ollama_local: { baseUrl: 'http://127.0.0.1:11434/v1', modelName: 'qwen2.5-coder:7b', embeddingModel: 'nomic-embed-text' },
  lmstudio_local: { baseUrl: 'http://127.0.0.1:1234/v1', modelName: 'local-model', embeddingModel: 'text-embedding-nomic-embed-text-v1.5' },
  nvidia_nim: { baseUrl: 'https://integrate.api.nvidia.com/v1', modelName: 'meta/llama-3.1-70b-instruct', embeddingModel: 'nvidia/nv-embedqa-e5-v5' },
  openai: { baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o-mini', embeddingModel: 'text-embedding-3-small' },
  custom_https: { baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o-mini', embeddingModel: 'text-embedding-3-small' },
};

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 4) return '••••';
  return `••••${key.slice(-4)}`;
}

export class SettingsRepository {
  constructor(private readonly db: Database.Database) {}

  getInternalAIConfig(): StoredAIConfig {
    const row = this.db
      .prepare('SELECT value_json FROM app_settings WHERE key = ?')
      .get(AI_SETTINGS_KEY) as { value_json: string } | undefined;

    if (!row) {
      return {
        preset: 'disabled',
        baseUrl: '',
        apiKey: '',
        modelName: '',
        embeddingModel: '',
        enabled: false,
      };
    }

    try {
      return JSON.parse(row.value_json) as StoredAIConfig;
    } catch {
      return {
        preset: 'disabled',
        baseUrl: '',
        apiKey: '',
        modelName: '',
        embeddingModel: '',
        enabled: false,
      };
    }
  }

  getPublicAISettings(): AIProviderSettings {
    const cfg = this.getInternalAIConfig();
    return {
      preset: cfg.preset,
      baseUrl: cfg.baseUrl,
      modelName: cfg.modelName,
      embeddingModel: cfg.embeddingModel,
      hasApiKey: Boolean(cfg.apiKey),
      apiKeyHint: maskApiKey(cfg.apiKey),
      enabled: cfg.enabled,
    };
  }

  updateAISettings(input: UpdateAISettingsInput): AIProviderSettings {
    const existing = this.getInternalAIConfig();
    const defaults = PRESET_DEFAULTS[input.preset] ?? PRESET_DEFAULTS.disabled;
    const resolvedBaseUrl =
      input.preset === 'custom_https'
        ? (input.baseUrl ?? defaults.baseUrl).trim()
        : defaults.baseUrl;

    const next: StoredAIConfig = {
      preset: input.preset,
      baseUrl: resolvedBaseUrl,
      apiKey: input.apiKey !== undefined ? input.apiKey.trim() : existing.apiKey,
      modelName: input.modelName.trim() || defaults.modelName,
      embeddingModel: (input.embeddingModel ?? '').trim() || defaults.embeddingModel,
      enabled: input.enabled && input.preset !== 'disabled',
    };

    this.db
      .prepare(`
        INSERT INTO app_settings (key, value_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = excluded.updated_at
      `)
      .run(AI_SETTINGS_KEY, JSON.stringify(next), Date.now());

    return this.getPublicAISettings();
  }
}
