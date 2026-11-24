import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  DetectionSource,
  HarnessDetectionResult,
  HarnessId,
  HarnessScanResponse,
  McpTransportMode,
} from '../../types/harness';
import { findCatalogEntry, HARNESS_CATALOG, type HarnessCatalogEntry } from './harnessCatalog';
import {
  buildConfigSnippet,
  inspectConfigConnection,
  mergeMcpConfigContent,
  removeMcpConfigContent,
  type ServerLaunchSpec,
} from './harnessConfigFormats';

export interface ProbeEnvironment {
  homeDir: string;
  projectDir: string;
  pathDirs: string[];
  dbPath: string;
  sseUrl: string;
}

function resolveDefaultProbeEnv(sseUrlOverride?: string): ProbeEnvironment {
  const homeDir = os.homedir();
  const projectDir = process.cwd();
  const rawPath = process.env.PATH ?? '';
  const pathDirs = Array.from(
    new Set([
      ...rawPath.split(path.delimiter).filter(Boolean),
      path.join(homeDir, '.local', 'bin'),
      path.join(homeDir, '.npm-global', 'bin'),
      path.join(homeDir, '.cargo', 'bin'),
      '/usr/local/bin',
    ])
  );
  const dbPath = process.env.STRATAGRAPH_DB_PATH || path.resolve(projectDir, 'data', 'stratagraph.db');
  const sseUrl = sanitizeSseUrl(sseUrlOverride);
  return { homeDir, projectDir, pathDirs, dbPath, sseUrl };
}

export function sanitizeSseUrl(rawUrl?: string): string {
  if (!rawUrl || !rawUrl.trim()) return 'http://127.0.0.1:3000/mcp/sse';
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'http://127.0.0.1:3000/mcp/sse';
    }
    return `${parsed.origin}/mcp/sse`;
  } catch {
    return 'http://127.0.0.1:3000/mcp/sse';
  }
}

function findExecutableInDirs(binaries: string[], dirs: string[]): string | null {
  for (const bin of binaries) {
    for (const dir of dirs) {
      const candidate = path.join(dir, bin);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        const stat = fs.statSync(candidate);
        if (stat.isFile()) return candidate;
      } catch {
        // Binary absent or non-executable in this directory
      }
    }
  }
  return null;
}

function resolveConfinedConfigPath(entry: HarnessCatalogEntry, env: ProbeEnvironment): string {
  const baseDir = path.resolve(entry.configScope === 'project' ? env.projectDir : env.homeDir);
  const resolved = path.resolve(baseDir, entry.configFileRel);
  if (!resolved.startsWith(`${baseDir}${path.sep}`)) {
    throw new Error(`Ruta de configuración fuera del directorio permitido para ${entry.id}`);
  }
  return resolved;
}

function buildLaunchSpec(env: ProbeEnvironment): ServerLaunchSpec {
  return {
    stdioScriptPath: path.resolve(env.projectDir, 'src', 'adapters', 'mcp', 'mcpStdio.ts'),
    dbPath: env.dbPath,
    sseUrl: env.sseUrl,
  };
}

function probeSingleHarness(
  entry: HarnessCatalogEntry,
  mode: McpTransportMode,
  env: ProbeEnvironment
): HarnessDetectionResult {
  const binaryPath = findExecutableInDirs(entry.binaries, env.pathDirs);
  let configDirPath: string | null = null;
  for (const relDir of entry.configDirs) {
    const full = path.resolve(env.homeDir, relDir);
    if (fs.existsSync(full)) {
      configDirPath = full;
      break;
    }
  }

  const configFilePath = resolveConfinedConfigPath(entry, env);
  const hasMcpFile = fs.existsSync(configFilePath);
  const detectionSources: DetectionSource[] = [];
  if (binaryPath) detectionSources.push('binary');
  if (configDirPath) detectionSources.push('config_dir');
  if (hasMcpFile) detectionSources.push('mcp_file');

  let mcpConnected = false;
  let connectedMode: McpTransportMode | null = null;
  let parseError: string | undefined;

  if (hasMcpFile) {
    try {
      const raw = fs.readFileSync(configFilePath, 'utf8');
      const status = inspectConfigConnection(raw, entry.configFormat);
      mcpConnected = status.connected;
      connectedMode = status.mode;
      parseError = status.parseError;
    } catch {
      parseError = 'No se pudo leer el archivo de configuración.';
    }
  }

  const effectiveMode: McpTransportMode = entry.supportsSse ? mode : 'stdio';
  const snippet = buildConfigSnippet(entry.configFormat, effectiveMode, buildLaunchSpec(env));

  return {
    id: entry.id,
    name: entry.name,
    vendor: entry.vendor,
    category: entry.category,
    installed: detectionSources.length > 0,
    mcpConnected,
    connectedMode,
    detectionSources,
    binaryPath,
    configDirPath,
    configFilePath,
    configFormat: entry.configFormat,
    supportsSse: entry.supportsSse,
    snippet,
    parseError,
  };
}

export function scanInstalledHarnesses(options?: {
  mode?: McpTransportMode;
  sseUrl?: string;
  env?: Partial<ProbeEnvironment>;
}): HarnessScanResponse {
  const mode = options?.mode ?? 'stdio';
  const env: ProbeEnvironment = {
    ...resolveDefaultProbeEnv(options?.sseUrl),
    ...(options?.env ?? {}),
  };
  const results = HARNESS_CATALOG.map((entry) => probeSingleHarness(entry, mode, env));
  results.sort((a, b) => Number(b.mcpConnected) - Number(a.mcpConnected) || Number(b.installed) - Number(a.installed));

  const spec = buildLaunchSpec(env);
  return {
    harnesses: results,
    detectedCount: results.filter((h) => h.installed).length,
    connectedCount: results.filter((h) => h.mcpConnected).length,
    stdioCommand: `npx --yes tsx ${spec.stdioScriptPath}`,
    sseUrl: spec.sseUrl,
    scannedAt: Date.now(),
  };
}

export function connectHarnessMcp(options: {
  harnessId: HarnessId;
  mode?: McpTransportMode;
  sseUrl?: string;
  env?: Partial<ProbeEnvironment>;
}): HarnessDetectionResult {
  const entry = findCatalogEntry(options.harnessId);
  const env: ProbeEnvironment = {
    ...resolveDefaultProbeEnv(options.sseUrl),
    ...(options.env ?? {}),
  };
  const mode: McpTransportMode = entry.supportsSse ? (options.mode ?? 'stdio') : 'stdio';
  const targetPath = resolveConfinedConfigPath(entry, env);
  const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : null;
  const nextContent = mergeMcpConfigContent(existing, entry.configFormat, mode, buildLaunchSpec(env));

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, nextContent, { encoding: 'utf8', mode: 0o600 });
  return probeSingleHarness(entry, mode, env);
}

export function disconnectHarnessMcp(options: {
  harnessId: HarnessId;
  mode?: McpTransportMode;
  sseUrl?: string;
  env?: Partial<ProbeEnvironment>;
}): HarnessDetectionResult {
  const entry = findCatalogEntry(options.harnessId);
  const env: ProbeEnvironment = {
    ...resolveDefaultProbeEnv(options.sseUrl),
    ...(options.env ?? {}),
  };
  const targetPath = resolveConfinedConfigPath(entry, env);
  if (fs.existsSync(targetPath)) {
    const existing = fs.readFileSync(targetPath, 'utf8');
    const updated = removeMcpConfigContent(existing, entry.configFormat);
    if (updated !== null && updated !== existing) {
      fs.writeFileSync(targetPath, updated, { encoding: 'utf8', mode: 0o600 });
    }
  }
  return probeSingleHarness(entry, options.mode ?? 'stdio', env);
}
