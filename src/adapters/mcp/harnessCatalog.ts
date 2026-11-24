import path from 'node:path';
import type { HarnessConfigFormat, HarnessId } from '../../types/harness';

export interface HarnessCatalogEntry {
  id: HarnessId;
  name: string;
  vendor: string;
  category: 'cli' | 'ide' | 'desktop' | 'workspace';
  binaries: string[];
  configDirs: string[];
  configFileRel: string;
  configScope: 'home' | 'project';
  configFormat: HarnessConfigFormat;
  supportsSse: boolean;
}

export const HARNESS_IDS: readonly [HarnessId, ...HarnessId[]] = [
  'claude-code',
  'codex',
  'antigravity',
  'gemini-cli',
  'deepseek',
  'minimax',
  'vscode',
  'cursor',
  'opencode',
  'windsurf',
  'claude-desktop',
  'project-mcp',
];

export const HARNESS_CATALOG: readonly HarnessCatalogEntry[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    vendor: 'Anthropic',
    category: 'cli',
    binaries: ['claude'],
    configDirs: ['.claude'],
    configFileRel: '.claude.json',
    configScope: 'home',
    configFormat: 'json_mcpServers',
    supportsSse: true,
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    vendor: 'OpenAI',
    category: 'cli',
    binaries: ['codex'],
    configDirs: ['.codex'],
    configFileRel: path.join('.codex', 'config.toml'),
    configScope: 'home',
    configFormat: 'toml_codex',
    supportsSse: true,
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    vendor: 'Google',
    category: 'ide',
    binaries: ['antigravity', 'agy'],
    configDirs: [path.join('.gemini', 'antigravity'), '.antigravity', path.join('.config', 'Antigravity')],
    configFileRel: path.join('.gemini', 'antigravity', 'mcp_config.json'),
    configScope: 'home',
    configFormat: 'json_mcpServers',
    supportsSse: true,
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    vendor: 'Google',
    category: 'cli',
    binaries: ['gemini'],
    configDirs: ['.gemini'],
    configFileRel: path.join('.gemini', 'settings.json'),
    configScope: 'home',
    configFormat: 'json_mcpServers',
    supportsSse: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek Harness',
    vendor: 'DeepSeek',
    category: 'cli',
    binaries: ['deepseek', 'deepseek-cli', 'deepseek-coder'],
    configDirs: ['.deepseek', path.join('.config', 'deepseek')],
    configFileRel: path.join('.deepseek', 'mcp.json'),
    configScope: 'home',
    configFormat: 'json_mcpServers',
    supportsSse: true,
  },
  {
    id: 'minimax',
    name: 'MiniMax CLI / Agent',
    vendor: 'MiniMax',
    category: 'cli',
    binaries: ['minimax', 'minimax-cli', 'minimax-agent'],
    configDirs: ['.minimax', path.join('.config', 'minimax')],
    configFileRel: path.join('.minimax', 'mcp.json'),
    configScope: 'home',
    configFormat: 'json_mcpServers',
    supportsSse: true,
  },
  {
    id: 'vscode',
    name: 'VS Code (Code)',
    vendor: 'Microsoft',
    category: 'ide',
    binaries: ['code', 'code-insiders'],
    configDirs: ['.vscode', path.join('.config', 'Code')],
    configFileRel: path.join('.config', 'Code', 'User', 'mcp.json'),
    configScope: 'home',
    configFormat: 'json_servers',
    supportsSse: true,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    vendor: 'Cursor',
    category: 'ide',
    binaries: ['cursor'],
    configDirs: ['.cursor', path.join('.config', 'Cursor')],
    configFileRel: path.join('.cursor', 'mcp.json'),
    configScope: 'home',
    configFormat: 'json_mcpServers',
    supportsSse: true,
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    vendor: 'OpenCode',
    category: 'cli',
    binaries: ['opencode'],
    configDirs: [path.join('.config', 'opencode'), '.opencode'],
    configFileRel: path.join('.config', 'opencode', 'opencode.json'),
    configScope: 'home',
    configFormat: 'json_opencode',
    supportsSse: true,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    vendor: 'Codeium',
    category: 'ide',
    binaries: ['windsurf'],
    configDirs: [path.join('.codeium', 'windsurf'), '.windsurf'],
    configFileRel: path.join('.codeium', 'windsurf', 'mcp_config.json'),
    configScope: 'home',
    configFormat: 'json_mcpServers',
    supportsSse: true,
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    vendor: 'Anthropic',
    category: 'desktop',
    binaries: ['claude-desktop'],
    configDirs: [path.join('.config', 'Claude')],
    configFileRel: path.join('.config', 'Claude', 'claude_desktop_config.json'),
    configScope: 'home',
    configFormat: 'json_mcpServers',
    supportsSse: false,
  },
  {
    id: 'project-mcp',
    name: 'Workspace (.mcp.json)',
    vendor: 'Estándar MCP',
    category: 'workspace',
    binaries: [],
    configDirs: [],
    configFileRel: '.mcp.json',
    configScope: 'project',
    configFormat: 'json_mcpServers',
    supportsSse: true,
  },
];

export function findCatalogEntry(id: HarnessId): HarnessCatalogEntry {
  const entry = HARNESS_CATALOG.find((item) => item.id === id);
  if (!entry) {
    throw new Error(`Harness no soportado: ${id}`);
  }
  return entry;
}
