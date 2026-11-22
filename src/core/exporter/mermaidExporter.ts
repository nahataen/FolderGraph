import type { FileEdgeRecord, FileNodeRecord } from '../../types/indexer';
import type { MermaidExportOptions, MermaidExportResult } from '../../types/protocol';

function sanitizeMermaidId(rawId: string): string {
  return `n_${rawId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

function escapeMermaidLabel(label: string): string {
  return label.replace(/["`()[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
}

function collectSubgraph(
  nodes: FileNodeRecord[],
  edges: FileEdgeRecord[],
  options: MermaidExportOptions
): { filteredNodes: FileNodeRecord[]; filteredEdges: FileEdgeRecord[] } {
  const includeSymbols = options.includeSymbols ?? false;
  const includeImports = options.includeImports ?? true;
  const maxDepth = options.maxDepth ?? 6;

  let allowedIds: Set<string>;
  if (options.rootNodeId) {
    allowedIds = new Set<string>([options.rootNodeId]);
    const childrenMap = new Map<string, string[]>();
    for (const node of nodes) {
      if (node.parentId) {
        const list = childrenMap.get(node.parentId) ?? [];
        list.push(node.id);
        childrenMap.set(node.parentId, list);
      }
    }
    const queue = [{ id: options.rootNodeId, depth: 0 }];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;
      for (const childId of childrenMap.get(current.id) ?? []) {
        if (!allowedIds.has(childId)) {
          allowedIds.add(childId);
          queue.push({ id: childId, depth: current.depth + 1 });
        }
      }
    }
  } else {
    allowedIds = new Set(nodes.filter((n) => n.metadata.depth <= maxDepth).map((n) => n.id));
  }

  const filteredNodes = nodes.filter((node) => {
    if (!allowedIds.has(node.id)) return false;
    if (!includeSymbols && node.type === 'symbol') return false;
    return true;
  });

  const activeNodeSet = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter((edge) => {
    if (!activeNodeSet.has(edge.sourceId) || !activeNodeSet.has(edge.targetId)) return false;
    if (!includeImports && edge.relationType !== 'contains') return false;
    return true;
  });

  return { filteredNodes, filteredEdges };
}

function renderFlowchart(nodes: FileNodeRecord[], edges: FileEdgeRecord[]): string {
  if (nodes.length === 0) {
    return 'flowchart TD\n  empty["Sin nodos indexados"]';
  }

  const lines: string[] = ['flowchart TD'];
  for (const node of nodes) {
    const mId = sanitizeMermaidId(node.id);
    const label = escapeMermaidLabel(node.name);
    if (node.type === 'folder') {
      lines.push(`  ${mId}(("${label}"))`);
    } else if (node.type === 'symbol') {
      lines.push(`  ${mId}(["${label}"])`);
    } else {
      lines.push(`  ${mId}["${label}"]`);
    }
  }

  for (const edge of edges) {
    const src = sanitizeMermaidId(edge.sourceId);
    const tgt = sanitizeMermaidId(edge.targetId);
    if (edge.relationType === 'contains') {
      lines.push(`  ${src} --> ${tgt}`);
    } else if (edge.relationType === 'imports') {
      lines.push(`  ${src} -. imports .-> ${tgt}`);
    } else {
      lines.push(`  ${src} -. refs .-> ${tgt}`);
    }
  }

  return lines.join('\n');
}

function renderMindmap(nodes: FileNodeRecord[], edges: FileEdgeRecord[]): string {
  if (nodes.length === 0) {
    return 'mindmap\n  root((Sin nodos))';
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, FileNodeRecord[]>();
  const hasParentInSet = new Set<string>();

  for (const edge of edges) {
    if (edge.relationType !== 'contains') continue;
    const child = nodeMap.get(edge.targetId);
    if (!child) continue;
    const list = childrenMap.get(edge.sourceId) ?? [];
    list.push(child);
    childrenMap.set(edge.sourceId, list);
    hasParentInSet.add(edge.targetId);
  }

  const roots = nodes.filter((n) => !hasParentInSet.has(n.id));
  const lines: string[] = ['mindmap'];
  const visited = new Set<string>();

  function emitNode(node: FileNodeRecord, indent: number): void {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    const pad = '  '.repeat(indent);
    const label = escapeMermaidLabel(node.name);
    if (indent === 1) {
      lines.push(`${pad}root((${label}))`);
    } else if (node.type === 'folder') {
      lines.push(`${pad}(${label})`);
    } else {
      lines.push(`${pad}${label}`);
    }
    const children = (childrenMap.get(node.id) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    for (const child of children) {
      emitNode(child, indent + 1);
    }
  }

  if (roots.length === 1) {
    emitNode(roots[0], 1);
  } else {
    lines.push('  root((Workspace))');
    for (const root of roots) {
      emitNode(root, 2);
    }
  }

  return lines.join('\n');
}

export function exportGraphToMermaid(
  nodes: FileNodeRecord[],
  edges: FileEdgeRecord[],
  options: MermaidExportOptions
): MermaidExportResult {
  const { filteredNodes, filteredEdges } = collectSubgraph(nodes, edges, options);
  const code =
    options.format === 'mindmap'
      ? renderMindmap(filteredNodes, filteredEdges)
      : renderFlowchart(filteredNodes, filteredEdges);

  return {
    format: options.format,
    code,
    nodeCount: filteredNodes.length,
    edgeCount: filteredEdges.length,
  };
}
