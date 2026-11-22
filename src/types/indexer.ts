export type NodeKind = 'folder' | 'file' | 'symbol';
export type EdgeRelationType = 'contains' | 'imports' | 'references';
export type NodeDisplayMode = 'hybrid' | 'minimal' | 'detailed';

export interface WorkspaceRecord {
  id: string;
  rootPath: string;
  name: string;
  watcherActive: boolean;
  lastScannedAt: number;
}

export interface FileNodeMetadata {
  extension?: string;
  lines?: number;
  imports?: string[];
  exports?: string[];
  symbolKind?: 'class' | 'function' | 'interface' | 'heading' | 'link' | 'config';
  depth: number;
  isRoot?: boolean;
  workspaceId: string;
  workspaceName?: string;
}

export interface FileNodeRecord {
  id: string;
  parentId: string | null;
  path: string;
  name: string;
  type: NodeKind;
  sizeWeight: number;
  metadata: FileNodeMetadata;
  updatedAt: number;
}

export interface FileEdgeRecord {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: EdgeRelationType;
}

export interface ParsedSymbol {
  name: string;
  kind: 'class' | 'function' | 'interface' | 'heading' | 'link' | 'config';
  line: number;
}

export interface FileParseResult {
  lines: number;
  imports: string[];
  exports: string[];
  symbols: ParsedSymbol[];
  wikilinks: string[];
}

export interface IFileParser {
  readonly extensions: string[];
  parse(content: string, filePath: string): FileParseResult;
}

export interface StructuralGraphPayload {
  workspaces: WorkspaceRecord[];
  nodes: FileNodeRecord[];
  edges: FileEdgeRecord[];
}
