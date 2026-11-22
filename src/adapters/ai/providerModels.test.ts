import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyModels,
  fetchProviderModels,
  parseProviderModelsPayload,
  resolveModelsEndpoint,
} from './providerModels';

test('resolveModelsEndpoint handles fixed presets and blocks private custom HTTPS hosts', () => {
  assert.equal(resolveModelsEndpoint('openai'), 'https://api.openai.com/v1/models');
  assert.equal(resolveModelsEndpoint('nvidia_nim'), 'https://integrate.api.nvidia.com/v1/models');
  assert.equal(resolveModelsEndpoint('ollama_local'), 'http://127.0.0.1:11434/v1/models');
  assert.equal(
    resolveModelsEndpoint('custom_https', 'https://api.groq.com/openai/v1/'),
    'https://api.groq.com/openai/v1/models'
  );
  assert.equal(resolveModelsEndpoint('custom_https', 'http://api.groq.com/v1'), null);
  assert.equal(resolveModelsEndpoint('custom_https', 'https://127.0.0.1:8080/v1'), null);
  assert.equal(resolveModelsEndpoint('disabled'), null);
});

test('parseProviderModelsPayload and classifyModels handle OpenAI and Gemini formats', () => {
  const models = parseProviderModelsPayload({
    data: [{ id: 'gpt-4o-mini' }, { id: 'text-embedding-3-small' }, { id: 'gpt-4.1' }],
  });
  assert.deepEqual(models, ['gpt-4.1', 'gpt-4o-mini', 'text-embedding-3-small']);

  const classified = classifyModels(models);
  assert.deepEqual(classified.chatModels, ['gpt-4.1', 'gpt-4o-mini']);
  assert.deepEqual(classified.embeddingModels, ['text-embedding-3-small']);

  const geminiModels = parseProviderModelsPayload({
    models: [{ name: 'models/gemini-2.5-flash' }, { name: 'models/text-embedding-004' }],
  });
  assert.deepEqual(geminiModels, ['gemini-2.5-flash', 'text-embedding-004']);
});

test('fetchProviderModels sends Bearer header and reports 401 or fetched models cleanly', async () => {
  let seenAuth = '';
  let seenUrl = '';
  const okResult = await fetchProviderModels(
    { preset: 'openai', apiKey: 'sk-test-1234' },
    (async (url: string | URL | Request, init?: RequestInit) => {
      seenUrl = String(url);
      seenAuth = String((init?.headers as Record<string, string>)?.Authorization ?? '');
      return new Response(
        JSON.stringify({ data: [{ id: 'gpt-4o-mini' }, { id: 'text-embedding-3-large' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch
  );

  assert.equal(seenUrl, 'https://api.openai.com/v1/models');
  assert.equal(seenAuth, 'Bearer sk-test-1234');
  assert.equal(okResult.ok, true);
  assert.deepEqual(okResult.chatModels, ['gpt-4o-mini']);
  assert.deepEqual(okResult.embeddingModels, ['text-embedding-3-large']);

  const errResult = await fetchProviderModels(
    { preset: 'nvidia_nim', apiKey: 'nvapi-bad' },
    (async () => new Response('Unauthorized', { status: 401 })) as typeof fetch
  );
  assert.equal(errResult.ok, false);
  assert.match(errResult.error ?? '', /401/);
});
