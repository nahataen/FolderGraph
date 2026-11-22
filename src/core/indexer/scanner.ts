import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { FileEdgeRecord, FileNodeRecord, WorkspaceRecord } from '../../types/indexer';
import { ParserRegistry } from './parsers/parserRegistry';

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

export function makeNodeId(workspaceId: string, rawKey: string): string {
  return crypto.createHash('sha1').update(`${workspaceId}:${rawKey}`).digest('hex').slice(0, 16);
}

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
  maxFiles = 280
): { nodes: FileNodeRecord[]; edges: FileEdgeRecord[] } {
  const nodes: FileNodeRecord[] = [];
  const edges: FileEdgeRecord[] = [];
  const now = Date.now();
  const rootResolved = normalizePosix(path.resolve(workspace.rootPath));
  const rootId = makeNodeId(workspace.id, rootResolved);

  nodes.push({
    id: rootId,
    parentId: null,
    path: rootResolved,
    name: workspace.name,
    type: 'folder',
    sizeWeight: 4,
    metadata: { depth: 0, isRoot: true, workspaceId: workspace.id, workspaceName: workspace.name },
    updatedAt: now,
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
        nodes.push({
          id: folderId,
          parentId,
          path: fullPath,
          name: entry.name,
          type: 'folder',
          sizeWeight: 2.5,
          metadata: { depth, isRoot: false, workspaceId: workspace.id, workspaceName: workspace.name },
          updatedAt: now,
        });
        edges.push({ id: `contains:${parentId}:${folderId}`, sourceId: parentId, targetId: folderId, relationType: 'contains' });
        walk(fullPath, folderId, depth + 1);
      } else if (entry.isFile()) {
        fileCount += 1;
        const ext = path.extname(entry.name).toLowerCase();
        const fileId = makeNodeId(workspace.id, fullPath);
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
          },
          updatedAt: now,
        });
        edges.push({ id: `contains:${parentId}:${fileId}`, sourceId: parentId, targetId: fileId, relationType: 'contains' });

        if (parsed.imports.length > 0 || parsed.wikilinks.length > 0) {
          pendingImports.push({ sourceId: fileId, filePath: fullPath, imports: parsed.imports, wikilinks: parsed.wikilinks });
        }

        parsed.symbols.slice(0, 6).forEach((sym) => {
          const symPath = `${fullPath}#${sym.kind}:${sym.name}`;
          const symId = makeNodeId(workspace.id, symPath);
          nodes.push({
            id: symId,
            parentId: fileId,
            path: symPath,
            name: sym.name,
            type: 'symbol',
            sizeWeight: 0.6,
            metadata: { symbolKind: sym.kind, lines: sym.line, depth: depth + 1, workspaceId: workspace.id },
            updatedAt: now,
          });
          edges.push({ id: `contains:${fileId}:${symId}`, sourceId: fileId, targetId: symId, relationType: 'contains' });
        });
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
  const now = Date.now();

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
      },
      updatedAt: now,
    },
  ];

  const edges: FileEdgeRecord[] = [];
  if (parentNode) {
    edges.push({ id: `contains:${parentId}:${fileId}`, sourceId: parentId, targetId: fileId, relationType: 'contains' });
  }

  parsed.symbols.slice(0, 6).forEach((sym) => {
    const symPath = `${normalizedFile}#${sym.kind}:${sym.name}`;
    const symId = makeNodeId(workspace.id, symPath);
    nodes.push({
      id: symId,
      parentId: fileId,
      path: symPath,
      name: sym.name,
      type: 'symbol',
      sizeWeight: 0.6,
      metadata: { symbolKind: sym.kind, lines: sym.line, depth: depth + 1, workspaceId: workspace.id },
      updatedAt: now,
    });
    edges.push({ id: `contains:${fileId}:${symId}`, sourceId: fileId, targetId: symId, relationType: 'contains' });
  });

  return { nodes, edges };
}
