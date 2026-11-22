import type { AIProviderPreset, EmbeddingResult, IAIProvider } from '../../types/ai';

interface AdapterConfig {
  preset: AIProviderPreset;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  embeddingModel: string;
}

const FIXED_LOCAL_BASES: Partial<Record<AIProviderPreset, string>> = {
  ollama_local: 'http://127.0.0.1:11434/v1',
  lmstudio_local: 'http://127.0.0.1:1234/v1',
  nvidia_nim: 'https://integrate.api.nvidia.com/v1',
  openai: 'https://api.openai.com/v1',
};

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.startsWith('169.254.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return true;
  }
  return false;
}

function resolveValidatedEndpoint(preset: AIProviderPreset, rawBaseUrl: string, suffix: string): string | null {
  const fixedBase = FIXED_LOCAL_BASES[preset];
  if (fixedBase) {
    return `${fixedBase}${suffix}`;
  }

  try {
    const parsed = new URL(rawBaseUrl);
    if (parsed.protocol !== 'https:' || isBlockedHost(parsed.hostname)) {
      return null;
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${cleanPath}${suffix}`;
  } catch {
    return null;
  }
}

export class OpenAICompatibleAdapter implements IAIProvider {
  readonly id = 'openai-compatible';

  constructor(private readonly config: AdapterConfig) {}

  async embedText(text: string): Promise<EmbeddingResult | null> {
    const endpoint = resolveValidatedEndpoint(this.config.preset, this.config.baseUrl, '/embeddings');
    if (!endpoint || !this.config.embeddingModel) {
      return null;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.config.apiKey) {
        headers.Authorization = `Bearer ${this.config.apiKey}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.config.embeddingModel,
          input: text.slice(0, 2000),
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return null;
      const json = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
      const vector = json.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length === 0) return null;
      return { vector, model: this.config.embeddingModel };
    } catch {
      return null;
    }
  }

  async summarizeText(text: string, context?: string): Promise<string | null> {
    const endpoint = resolveValidatedEndpoint(this.config.preset, this.config.baseUrl, '/chat/completions');
    if (!endpoint || !this.config.modelName) {
      return null;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.config.apiKey) {
        headers.Authorization = `Bearer ${this.config.apiKey}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.config.modelName,
          messages: [
            {
              role: 'system',
              content: 'Resume brevemente en español la idea técnica o archivo proporcionado en 2 líneas máximo.',
            },
            {
              role: 'user',
              content: context ? `${context}\n\n${text}` : text,
            },
          ],
          temperature: 0.2,
          max_tokens: 180,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) return null;
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return json.choices?.[0]?.message?.content?.trim() ?? null;
    } catch {
      return null;
    }
  }
}
