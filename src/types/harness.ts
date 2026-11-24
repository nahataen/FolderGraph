export type HarnessId =
  | 'claude-code'
  | 'codex'
  | 'antigravity'
  | 'gemini-cli'
  | 'deepseek'
  | 'minimax'
  | 'vscode'
  | 'cursor'
  | 'opencode'
  | 'windsurf'
  | 'claude-desktop'
  | 'project-mcp';

export type McpTransportMode = 'stdio' | 'sse';

export type HarnessConfigFormat =
  | 'json_mcpServers'
  | 'json_servers'
  | 'json_opencode'
  | 'toml_codex';

export type DetectionSource = 'binary' | 'config_dir' | 'mcp_file';

export interface HarnessDetectionResult {
  id: HarnessId;
  name: string;
  vendor: string;
  category: 'cli' | 'ide' | 'desktop' | 'workspace';
  installed: boolean;
  mcpConnected: boolean;
  connectedMode: McpTransportMode | null;
  detectionSources: DetectionSource[];
  binaryPath: string | null;
  configDirPath: string | null;
  configFilePath: string;
  configFormat: HarnessConfigFormat;
  supportsSse: boolean;
  snippet: string;
  parseError?: string;
}

export interface HarnessScanResponse {
  harnesses: HarnessDetectionResult[];
  detectedCount: number;
  connectedCount: number;
  stdioCommand: string;
  sseUrl: string;
  scannedAt: number;
}
