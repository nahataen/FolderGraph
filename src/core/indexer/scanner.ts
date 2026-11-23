import fs from 'node:fs';
import path from 'node:path';
import type { FileEdgeRecord, FileNodeRecord, WorkspaceRecord } from '../../types/indexer';
import { readFsTimestamps } from './fsTimestamps';
import { ParserRegistry } from './parsers/parserRegistry';
import { appendFileSymbols, makeNodeId } from './symbolNodes';

export { makeNodeId };

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.playwright-cli',
  '.aistudio',
  'data',
  '__pycache__',
  '.venv',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.md', '.mdx', '.json', '.css', '.html', '.sql', '.rs', '.toml', '.yml', '.yaml',
]);

export function normalizePosix(p: string): string {
  return p.replace(/\\/g, '/');
}

export function shouldIgnorePath(targetPath: string): boolean {
  const segments = normalizePosix(targetPath).split('/');
  return segments.some((seg) => seg.startsWith('.') && seg !== '.' && seg !== '..' ? true : IGNORED_DIRS.has(seg));
}

function resolveImportTarget(
  sourceFilePath: string,
  importSpecifier: string,
  filePathToId: Map<string, string>,
  fileNameToId: Map<string, string>
): string | null {
  if (importSpecifier.startsWith('.')) {
    const sourceDir = path.dirname(sourceFilePath);
    const baseCandidate = normalizePosix(path.resolve(sourceDir, importSpecifier));
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.py', '.md', '/index.ts', '/index.tsx', '/index.js'];
    for (const ext of extensions) {
      const hit = filePathToId.get(baseCandidate + ext);
      if (hit) return hit;
    }
    return null;
  }

  const normalizedSpec = importSpecifier.replace(/\.md$/i, '').toLowerCase();
  return fileNameToId.get(normalizedSpec) ?? null;
}

export function scanWorkspaceDirectory(
  workspace: WorkspaceRecord,
  registry = new ParserRegistry(),
  maxFiles = 280,
  previousNodes: FileNodeRecord[] = []
): { nodes: FileNodeRecord[]; edges: FileEdgeRecord[] } {
  const nodes: FileNodeRecord[] = [];
  const edges: FileEdgeRecord[] = [];
  const prevCreatedById = new Map<string, number>();
  for (const prev of previousNodes) {
    if (prev.metadata.createdAt) prevCreatedById.set(prev.id, prev.metadata.createdAt);
  }
  const rootResolved = normalizePosix(path.resolve(workspace.rootPath));
  const rootId = makeNodeId(workspace.id, rootResolved);
  const rootTs = readFsTimestamps(rootResolved, prevCreatedById.get(rootId));

  nodes.push({
    id: rootId,
    parentId: null,
    path: rootResolved,
    name: workspace.name,
    type: 'folder',
    sizeWeight: 4,
    metadata: {
      depth: 0,
      isRoot: true,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      createdAt: rootTs.createdAt,
      modifiedAt: rootTs.modifiedAt,
    },
    updatedAt: rootTs.modifiedAt,
  });

  const filePathToId = new Map<string, string>();
  const fileNameToId = new Map<string, string>();
  const pendingImports: Array<{ sourceId: string; filePath: string; imports: string[]; wikilinks: string[] }> = [];
  let fileCount = 0;

  function walk(dirPath: string, parentId: string, depth: number): void {
    if (fileCount >= maxFiles) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (fileCount >= maxFiles) break;
      if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;

      const fullPath = normalizePosix(path.join(dirPath, entry.name));
      if (entry.isDirectory()) {
        const folderId = makeNodeId(workspace.id, fullPath);
        const folderTs = readFsTimestamps(fullPath, prevCreatedById.get(folderId));
        nodes.push({
          id: folderId,
          parentId,
          path: fullPath,
          name: entry.name,
          type: 'folder',
          sizeWeight: 2.5,
          metadata: {
            depth,
            isRoot: false,
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            createdAt: folderTs.createdAt,
            modifiedAt: folderTs.modifiedAt,
          },
          updatedAt: folderTs.modifiedAt,
        });
        edges.push({ id: `contains:${parentId}:${folderId}`, sourceId: parentId, targetId: folderId, relationType: 'contains' });
        walk(fullPath, folderId, depth + 1);
      } else if (entry.isFile()) {
        fileCount += 1;
        const ext = path.extname(entry.name).toLowerCase();
        const fileId = makeNodeId(workspace.id, fullPath);
        const fileTs = readFsTimestamps(fullPath, prevCreatedById.get(fileId));
        filePathToId.set(fullPath, fileId);
        fileNameToId.set(path.basename(entry.name, ext).toLowerCase(), fileId);

        let parsed = { lines: 0, imports: [] as string[], exports: [] as string[], symbols: [] as { name: string; kind: 'class' | 'function' | 'interface' | 'heading' | 'link' | 'config'; line: number }[], wikilinks: [] as string[] };
        if (TEXT_EXTENSIONS.has(ext)) {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.size <= 250_000) {
              const content = fs.readFileSync(fullPath, 'utf8');
              parsed = registry.parseFile(fullPath, content);
            }
          } catch {
            // Skip unreadable files gracefully
          }
        }

        nodes.push({
          id: fileId,
          parentId,
          path: fullPath,
          name: entry.name,
          type: 'file',
          sizeWeight: 1.4,
          metadata: {
            extension: ext || 'file',
            lines: parsed.lines,
            imports: parsed.imports,
            exports: parsed.exports,
            depth,
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            createdAt: fileTs.createdAt,
            modifiedAt: fileTs.modifiedAt,
          },
          updatedAt: fileTs.modifiedAt,
        });
        edges.push({ id: `contains:${parentId}:${fileId}`, sourceId: parentId, targetId: fileId, relationType: 'contains' });

        if (parsed.imports.length > 0 || parsed.wikilinks.length > 0) {
          pendingImports.push({ sourceId: fileId, filePath: fullPath, imports: parsed.imports, wikilinks: parsed.wikilinks });
        }

        appendFileSymbols(workspace.id, fileId, fullPath, depth, parsed.symbols, fileTs, nodes, edges);
      }
    }
  }

  walk(rootResolved, rootId, 1);

  for (const item of pendingImports) {
    const wikiSet = new Set(item.wikilinks);
    for (const spec of item.imports) {
      const targetId = resolveImportTarget(item.filePath, spec, filePathToId, fileNameToId);
      if (targetId && targetId !== item.sourceId) {
        const rel = wikiSet.has(spec) ? 'references' : 'imports';
        edges.push({ id: `${rel}:${item.sourceId}:${targetId}`, sourceId: item.sourceId, targetId, relationType: rel });
      }
    }
  }

  return { nodes, edges };
}

export function scanSingleFileNodes(
  workspace: WorkspaceRecord,
  filePath: string,
  allExistingNodes: FileNodeRecord[],
  registry = new ParserRegistry()
): { nodes: FileNodeRecord[]; edges: FileEdgeRecord[] } {
  const normalizedFile = normalizePosix(path.resolve(filePath));
  const parentDir = normalizePosix(path.dirname(normalizedFile));
  const parentId = makeNodeId(workspace.id, parentDir);
  const ext = path.extname(normalizedFile).toLowerCase();
  const fileId = makeNodeId(workspace.id, normalizedFile);
  const existingFile = allExistingNodes.find((n) => n.id === fileId);
  const fileTs = readFsTimestamps(normalizedFile, existingFile?.metadata.createdAt);

  const parentNode = allExistingNodes.find((n) => n.id === parentId);
  const depth = parentNode ? parentNode.metadata.depth + 1 : 1;

  let parsed = { lines: 0, imports: [] as string[], exports: [] as string[], symbols: [] as { name: string; kind: 'class' | 'function' | 'interface' | 'heading' | 'link' | 'config'; line: number }[], wikilinks: [] as string[] };
  if (TEXT_EXTENSIONS.has(ext) && fs.existsSync(normalizedFile)) {
    const content = fs.readFileSync(normalizedFile, 'utf8');
    parsed = registry.parseFile(normalizedFile, content);
  }

  const nodes: FileNodeRecord[] = [
    {
      id: fileId,
      parentId,
      path: normalizedFile,
      name: path.basename(normalizedFile),
      type: 'file',
      sizeWeight: 1.4,
      metadata: {
        extension: ext || 'file',
        lines: parsed.lines,
        imports: parsed.imports,
        exports: parsed.exports,
        depth,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        createdAt: fileTs.createdAt,
        modifiedAt: fileTs.modifiedAt,
      },
      updatedAt: fileTs.modifiedAt,
    },
  ];

  const edges: FileEdgeRecord[] = [];
  if (parentNode) {
    edges.push({ id: `contains:${parentId}:${fileId}`, sourceId: parentId, targetId: fileId, relationType: 'contains' });
  }

  appendFileSymbols(workspace.id, fileId, normalizedFile, depth, parsed.symbols, fileTs, nodes, edges);

  return { nodes, edges };
}
