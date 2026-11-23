import crypto from 'node:crypto';
import type { FileEdgeRecord, FileNodeRecord, ParsedSymbol } from '../../types/indexer';
import type { FsTimestamps } from './fsTimestamps';

export function makeNodeId(workspaceId: string, rawKey: string): string {
  return crypto.createHash('sha1').update(`${workspaceId}:${rawKey}`).digest('hex').slice(0, 16);
}

export function appendFileSymbols(
  workspaceId: string,
  fileId: string,
  filePath: string,
  depth: number,
  symbols: ParsedSymbol[],
  ts: FsTimestamps,
  nodes: FileNodeRecord[],
  edges: FileEdgeRecord[]
): void {
  symbols.slice(0, 6).forEach((sym) => {
    const symPath = `${filePath}#${sym.kind}:${sym.name}`;
    const symId = makeNodeId(workspaceId, symPath);
    nodes.push({
      id: symId,
      parentId: fileId,
      path: symPath,
      name: sym.name,
      type: 'symbol',
      sizeWeight: 0.6,
      metadata: {
        symbolKind: sym.kind,
        lines: sym.line,
        depth: depth + 1,
        workspaceId,
        createdAt: ts.createdAt,
        modifiedAt: ts.modifiedAt,
      },
      updatedAt: ts.modifiedAt,
    });
    edges.push({
      id: `contains:${fileId}:${symId}`,
      sourceId: fileId,
      targetId: symId,
      relationType: 'contains',
    });
  });
}
