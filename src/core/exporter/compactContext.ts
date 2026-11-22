import type { FileEdgeRecord, FileNodeRecord } from '../../types/indexer';

export interface CompactContextResult {
  summaryText: string;
  fileCount: number;
  symbolCount: number;
  rawBytesEstimate: number;
  compactBytes: number;
  estimatedTokensSaved: number;
  compressionRatio: number;
  matchedNodeIds: string[];
}

export function buildCompactAgentContext(
  nodes: FileNodeRecord[],
  edges: FileEdgeRecord[],
  options: { rootNodeId?: string; maxFiles?: number } = {}
): CompactContextResult {
  const maxFiles = Math.max(1, Math.min(options.maxFiles ?? 160, 400));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  let scopedNodes = nodes;
  if (options.rootNodeId && nodeMap.has(options.rootNodeId)) {
    const allowed = new Set<string>([options.rootNodeId]);
    const queue = [options.rootNodeId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const n of nodes) {
        if (n.parentId === curr && !allowed.has(n.id)) {
          allowed.add(n.id);
          queue.push(n.id);
        }
      }
    }
    scopedNodes = nodes.filter((n) => allowed.has(n.id));
  }

  const symbolsByFile = new Map<string, string[]>();
  for (const n of scopedNodes) {
    if (n.type === 'symbol' && n.parentId) {
      const list = symbolsByFile.get(n.parentId) ?? [];
      list.push(n.name);
      symbolsByFile.set(n.parentId, list);
    }
  }

  const files = scopedNodes
    .filter((n) => n.type === 'file')
    .sort((a, b) => a.path.localeCompare(b.path))
    .slice(0, maxFiles);

  const fileIds = new Set(files.map((f) => f.id));
  const lines: string[] = [
    `# StrataGraph Compact Map (${files.length} files)`,
  ];

  let rawBytesEstimate = 0;
  let symbolCount = 0;

  for (const file of files) {
    const lineCount = file.metadata.lines ?? 12;
    rawBytesEstimate += Math.max(180, lineCount * 38);
    const syms = symbolsByFile.get(file.id) ?? [];
    symbolCount += syms.length;
    const imps = (file.metadata.imports ?? []).slice(0, 6);
    const exps = (file.metadata.exports ?? []).slice(0, 6);

    const parts = [`${file.path} (${lineCount}L)`];
    if (exps.length > 0) parts.push(`exp:[${exps.join(',')}]`);
    if (syms.length > 0) parts.push(`sym:[${syms.join(',')}]`);
    if (imps.length > 0) parts.push(`imp:[${imps.join(',')}]`);
    lines.push(parts.join(' | '));
  }

  const relEdges = edges.filter(
    (e) => e.relationType !== 'contains' && fileIds.has(e.sourceId) && fileIds.has(e.targetId)
  );
  if (relEdges.length > 0) {
    lines.push('## Links');
    for (const edge of relEdges.slice(0, 80)) {
      const src = nodeMap.get(edge.sourceId)?.name ?? edge.sourceId;
      const dst = nodeMap.get(edge.targetId)?.name ?? edge.targetId;
      lines.push(`${src} -> ${dst} (${edge.relationType})`);
    }
  }

  const summaryText = lines.join('\n');
  const compactBytes = summaryText.length;
  const estimatedTokensSaved = Math.max(0, Math.round((rawBytesEstimate - compactBytes) / 4));
  const compressionRatio =
    rawBytesEstimate > 0 ? Number((1 - compactBytes / rawBytesEstimate).toFixed(2)) : 0;

  return {
    summaryText,
    fileCount: files.length,
    symbolCount,
    rawBytesEstimate,
    compactBytes,
    estimatedTokensSaved,
    compressionRatio,
    matchedNodeIds: files.map((f) => f.id),
  };
}
