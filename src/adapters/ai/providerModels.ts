import type { AIProviderPreset, ProviderModelsResult } from '../../types/ai';

export const AI_PRESET_DEFAULTS: Record<
  AIProviderPreset,
  { baseUrl: string; modelName: string; embeddingModel: string }
> = {
  disabled: { baseUrl: '', modelName: '', embeddingModel: '' },
  ollama_local: {
    baseUrl: 'http://127.0.0.1:11434/v1',
    modelName: 'qwen2.5-coder:7b',
    embeddingModel: 'nomic-embed-text',
  },
  lmstudio_local: {
    baseUrl: 'http://127.0.0.1:1234/v1',
    modelName: 'local-model',
    embeddingModel: 'text-embedding-nomic-embed-text-v1.5',
  },
  nvidia_nim: {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    modelName: 'meta/llama-3.1-70b-instruct',
    embeddingModel: 'nvidia/nv-embedqa-e5-v5',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    modelName: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
  },
  custom_https: {
    baseUrl: 'https://api.openai.com/v1',
    modelName: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
  },
};

const FIXED_PROVIDER_BASES: Partial<Record<AIProviderPreset, string>> = {
  ollama_local: 'http://127.0.0.1:11434/v1',
  lmstudio_local: 'http://127.0.0.1:1234/v1',
  nvidia_nim: 'https://integrate.api.nvidia.com/v1',
  openai: 'https://api.openai.com/v1',
};

function isBlockedPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.startsWith('169.254.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

export function resolveModelsEndpoint(preset: AIProviderPreset, rawBaseUrl?: string): string | null {
  if (preset === 'disabled') return null;
  const fixed = FIXED_PROVIDER_BASES[preset];
  if (fixed) return `${fixed}/models`;

  const candidate = (rawBaseUrl ?? '').trim();
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' || isBlockedPrivateHost(parsed.hostname)) {
      return null;
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    const normalizedPath = cleanPath.endsWith('/models') ? cleanPath : `${cleanPath}/models`;
    return `${parsed.origin}${normalizedPath}`;
  } catch {
    return null;
  }
}

export function parseProviderModelsPayload(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  const ids = new Set<string>();

  if (Array.isArray(obj.data)) {
    for (const item of obj.data) {
      if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
        const id = (item as { id: string }).id.trim();
        if (id) ids.add(id);
      }
    }
  }

  if (Array.isArray(obj.models)) {
    for (const item of obj.models) {
      if (typeof item === 'string' && item.trim()) {
        ids.add(item.trim());
      } else if (item && typeof item === 'object') {
        const rec = item as { id?: unknown; name?: unknown; model?: unknown };
        const raw =
          (typeof rec.id === 'string' && rec.id) ||
          (typeof rec.model === 'string' && rec.model) ||
          (typeof rec.name === 'string' && rec.name) ||
          '';
        const cleaned = raw.replace(/^models\//, '').trim();
        if (cleaned) ids.add(cleaned);
      }
    }
  }

  return Array.from(ids).sort((a, b) => a.localeCompare(b));
}

export function classifyModels(models: string[]): {
  chatModels: string[];
  embeddingModels: string[];
} {
  const embeddingRegex = /(embed|bge|e5-|minilm|nv-embed|text-embedding|nomic-embed)/i;
  const embeddingModels = models.filter((m) => embeddingRegex.test(m));
  const chatModels = models.filter((m) => !embeddingRegex.test(m));
  return {
    chatModels: chatModels.length > 0 ? chatModels : models,
    embeddingModels: embeddingModels.length > 0 ? embeddingModels : models,
  };
}

export async function fetchProviderModels(
  input: { preset: AIProviderPreset; baseUrl?: string; apiKey?: string },
  fetchImpl: typeof fetch = fetch
): Promise<ProviderModelsResult> {
  const startedAt = Date.now();
  const endpoint = resolveModelsEndpoint(input.preset, input.baseUrl);
  if (!endpoint) {
    return {
      ok: false,
      preset: input.preset,
      endpoint: '',
      models: [],
      chatModels: [],
      embeddingModels: [],
      latencyMs: 0,
      error:
        input.preset === 'disabled'
          ? 'Selecciona un proveedor activo antes de consultar modelos.'
          : 'Base URL inválida. Debe usar HTTPS público válido.',
    };
  }

  const requiresKey = input.preset === 'openai' || input.preset === 'nvidia_nim';
  const apiKey = (input.apiKey ?? '').trim();
  if (requiresKey && !apiKey) {
    return {
      ok: false,
      preset: input.preset,
      endpoint,
      models: [],
      chatModels: [],
      embeddingModels: [],
      latencyMs: 0,
      error: 'Pega una API Key válida para consultar este proveedor.',
    };
  }

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const res = await fetchImpl(endpoint, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(9000),
    });

    const latencyMs = Date.now() - startedAt;
    if (!res.ok) {
      const error =
        res.status === 401 || res.status === 403
          ? `API Key inválida o sin permisos (HTTP ${res.status}).`
          : `El proveedor respondió HTTP ${res.status}.`;
      return {
        ok: false,
        preset: input.preset,
        endpoint,
        models: [],
        chatModels: [],
        embeddingModels: [],
        latencyMs,
        error,
      };
    }

    const json = (await res.json()) as unknown;
    const models = parseProviderModelsPayload(json);
    const { chatModels, embeddingModels } = classifyModels(models);

    if (models.length === 0) {
      return {
        ok: false,
        preset: input.preset,
        endpoint,
        models: [],
        chatModels: [],
        embeddingModels: [],
        latencyMs,
        error: 'Conexión exitosa, pero el proveedor no devolvió modelos en /models.',
      };
    }

    return {
      ok: true,
      preset: input.preset,
      endpoint,
      models,
      chatModels,
      embeddingModels,
      latencyMs,
    };
  } catch {
    return {
      ok: false,
      preset: input.preset,
      endpoint,
      models: [],
      chatModels: [],
      embeddingModels: [],
      latencyMs: Date.now() - startedAt,
      error: 'No se pudo conectar con el proveedor (verifica red, URL o servicio local).',
    };
  }
}
