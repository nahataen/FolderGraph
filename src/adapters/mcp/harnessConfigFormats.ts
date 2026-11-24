import type { HarnessConfigFormat, McpTransportMode } from '../../types/harness';

export interface ServerLaunchSpec {
  stdioScriptPath: string;
  dbPath: string;
  sseUrl: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function buildServerPayload(
  format: HarnessConfigFormat,
  mode: McpTransportMode,
  spec: ServerLaunchSpec
): Record<string, unknown> {
  if (format === 'json_opencode') {
    if (mode === 'sse') {
      return { type: 'remote', url: spec.sseUrl, enabled: true };
    }
    return {
      type: 'local',
      command: ['npx', '--yes', 'tsx', spec.stdioScriptPath],
      environment: { STRATAGRAPH_DB_PATH: spec.dbPath },
      enabled: true,
    };
  }

  if (format === 'json_servers') {
    if (mode === 'sse') {
      return { type: 'sse', url: spec.sseUrl };
    }
    return {
      type: 'stdio',
      command: 'npx',
      args: ['--yes', 'tsx', spec.stdioScriptPath],
      env: { STRATAGRAPH_DB_PATH: spec.dbPath },
    };
  }

  if (mode === 'sse') {
    return { url: spec.sseUrl, type: 'sse' };
  }
  return {
    command: 'npx',
    args: ['--yes', 'tsx', spec.stdioScriptPath],
    env: { STRATAGRAPH_DB_PATH: spec.dbPath },
  };
}

export function buildConfigSnippet(
  format: HarnessConfigFormat,
  mode: McpTransportMode,
  spec: ServerLaunchSpec
): string {
  if (format === 'toml_codex') {
    if (mode === 'sse') {
      return [
        '[mcp_servers.stratagraph]',
        `url = ${JSON.stringify(spec.sseUrl)}`,
      ].join('\n');
    }
    return [
      '[mcp_servers.stratagraph]',
      'command = "npx"',
      `args = ["--yes", "tsx", ${JSON.stringify(spec.stdioScriptPath)}]`,
      `env = { STRATAGRAPH_DB_PATH = ${JSON.stringify(spec.dbPath)} }`,
    ].join('\n');
  }

  const rootKey = format === 'json_servers' ? 'servers' : format === 'json_opencode' ? 'mcp' : 'mcpServers';
  return JSON.stringify(
    {
      [rootKey]: {
        stratagraph: buildServerPayload(format, mode, spec),
      },
    },
    null,
    2
  );
}

export function inspectConfigConnection(
  rawContent: string,
  format: HarnessConfigFormat
): { connected: boolean; mode: McpTransportMode | null; parseError?: string } {
  if (!rawContent.trim()) return { connected: false, mode: null };

  if (format === 'toml_codex') {
    const match = rawContent.match(/^\s*\[mcp_servers\.stratagraph\]\s*([\s\S]*?)(?=^\s*\[|$)/m);
    if (!match) return { connected: false, mode: null };
    const block = match[1] ?? '';
    const mode: McpTransportMode = /^\s*url\s*=/m.test(block) ? 'sse' : 'stdio';
    return { connected: true, mode };
  }

  try {
    const parsed = asRecord(JSON.parse(rawContent));
    const rootKey = format === 'json_servers' ? 'servers' : format === 'json_opencode' ? 'mcp' : 'mcpServers';
    const servers = asRecord(parsed[rootKey]);
    const entry = servers.stratagraph;
    if (!entry || typeof entry !== 'object') return { connected: false, mode: null };
    const entryRec = asRecord(entry);
    const mode: McpTransportMode = typeof entryRec.url === 'string' ? 'sse' : 'stdio';
    return { connected: true, mode };
  } catch {
    return { connected: false, mode: null, parseError: 'El archivo existente contiene JSON inválido.' };
  }
}

export function mergeMcpConfigContent(
  existingContent: string | null,
  format: HarnessConfigFormat,
  mode: McpTransportMode,
  spec: ServerLaunchSpec
): string {
  if (format === 'toml_codex') {
    const snippet = buildConfigSnippet('toml_codex', mode, spec);
    const base = existingContent ?? '';
    const stripped = removeStratagraphToml(base).trimEnd();
    return stripped ? `${stripped}\n\n${snippet}\n` : `${snippet}\n`;
  }

  const rootKey = format === 'json_servers' ? 'servers' : format === 'json_opencode' ? 'mcp' : 'mcpServers';
  let root: Record<string, unknown> = {};
  if (existingContent && existingContent.trim()) {
    root = asRecord(JSON.parse(existingContent));
  }
  const existingGroup = asRecord(root[rootKey]);
  root[rootKey] = {
    ...existingGroup,
    stratagraph: buildServerPayload(format, mode, spec),
  };
  return `${JSON.stringify(root, null, 2)}\n`;
}

export function removeMcpConfigContent(existingContent: string, format: HarnessConfigFormat): string | null {
  if (!existingContent.trim()) return null;

  if (format === 'toml_codex') {
    const cleaned = removeStratagraphToml(existingContent).trim();
    return cleaned ? `${cleaned}\n` : '';
  }

  const root = asRecord(JSON.parse(existingContent));
  const rootKey = format === 'json_servers' ? 'servers' : format === 'json_opencode' ? 'mcp' : 'mcpServers';
  const group = asRecord(root[rootKey]);
  if (!('stratagraph' in group)) return existingContent;
  delete group.stratagraph;
  root[rootKey] = group;
  return `${JSON.stringify(root, null, 2)}\n`;
}

function removeStratagraphToml(content: string): string {
  return content.replace(/^\s*\[mcp_servers\.stratagraph(?:\.[^\]]+)?\]\s*[\s\S]*?(?=^\s*\[|$)/gm, '').trim();
}
