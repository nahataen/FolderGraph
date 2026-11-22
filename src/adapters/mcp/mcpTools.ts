import crypto from 'node:crypto';
import { buildCompactAgentContext } from '../../core/exporter/compactContext';
import { exportGraphToMermaid } from '../../core/exporter/mermaidExporter';
import type { ChatGraphRepository } from '../../db/chatGraphRepo';
import type { FileGraphRepository } from '../../db/fileGraphRepo';
import type { WorkspaceRepository } from '../../db/workspaceRepo';
import type { ActivityKind, AgentActivityEvent } from '../../types/protocol';

export interface McpToolDependencies {
  workspaceRepo: WorkspaceRepository;
  fileGraphRepo: FileGraphRepository;
  chatGraphRepo: ChatGraphRepository;
  onActivity?: (activity: AgentActivityEvent) => void;
}

export class StrataGraphMcpTools {
  constructor(private readonly deps: McpToolDependencies) {}

  private emitActivity(partial: Omit<AgentActivityEvent, 'id' | 'timestamp'>): AgentActivityEvent {
    const activity: AgentActivityEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...partial,
    };
    this.deps.onActivity?.(activity);
    return activity;
  }

  getProjectStructure(targetPath?: string, depth = 3) {
    const workspaces = this.deps.workspaceRepo.listAll();
    const matchedWorkspace = targetPath
      ? workspaces.find((w) => targetPath.startsWith(w.rootPath) || w.name === targetPath)
      : workspaces[0];

    const allNodes = this.deps.fileGraphRepo.listNodes(matchedWorkspace?.id);
    const filteredNodes = allNodes.filter((n) => {
      if (n.metadata.depth > depth) return false;
      if (targetPath && n.path !== targetPath && !n.path.startsWith(targetPath)) {
        return !matchedWorkspace || matchedWorkspace.rootPath !== targetPath;
      }
      return true;
    });

    const idSet = new Set(filteredNodes.map((n) => n.id));
    const edges = this.deps.fileGraphRepo.listEdges(idSet);
    const root = filteredNodes.find((n) => n.metadata.isRoot) ?? filteredNodes[0];

    this.emitActivity({
      actor: 'agent',
      action: 'mcp_query',
      label: `Agente leyó estructura (${filteredNodes.length} nodos)`,
      nodeId: root?.id,
      tokensSaved: Math.max(120, filteredNodes.length * 45),
    });

    return {
      workspace: matchedWorkspace ?? null,
      nodeCount: filteredNodes.length,
      edgeCount: edges.length,
      nodes: filteredNodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        path: n.path,
        parentId: n.parentId,
        imports: n.metadata.imports ?? [],
        exports: n.metadata.exports ?? [],
      })),
      edges,
    };
  }

  getCompactContext(target?: string, maxFiles = 140) {
    const nodes = this.deps.fileGraphRepo.listNodes();
    const edges = this.deps.fileGraphRepo.listEdges();
    const matched = target
      ? nodes.find((n) => n.id === target || n.path === target || n.name === target)
      : undefined;

    const result = buildCompactAgentContext(nodes, edges, {
      rootNodeId: matched?.id,
      maxFiles,
    });

    this.emitActivity({
      actor: 'agent',
      action: 'read',
      label: `Contexto compacto MCP (${result.fileCount} arch.)`,
      nodeId: matched?.id ?? result.matchedNodeIds[0],
      tokensSaved: result.estimatedTokensSaved,
    });

    return result;
  }

  searchCodebaseNodes(query: string) {
    const hits = this.deps.fileGraphRepo.searchFts(query, 40);
    this.emitActivity({
      actor: 'agent',
      action: 'search',
      label: `Agente buscó "${query}" (${hits.length})`,
      nodeId: hits[0]?.id,
      tokensSaved: Math.max(180, hits.length * 60),
    });
    return {
      query,
      totalHits: hits.length,
      results: hits.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        path: n.path,
        lines: n.metadata.lines ?? 0,
        imports: n.metadata.imports ?? [],
      })),
    };
  }

  reportAgentAction(input: {
    action: ActivityKind;
    targetPath?: string;
    fromPath?: string;
    toPath?: string;
    label?: string;
  }) {
    const nodes = this.deps.fileGraphRepo.listNodes();
    const findMatch = (q?: string) =>
      q ? nodes.find((n) => n.id === q || n.path === q || n.path.endsWith(q) || n.name === q) : undefined;
    const mainNode = findMatch(input.targetPath ?? input.toPath);
    const fromNode = findMatch(input.fromPath);
    const toNode = findMatch(input.toPath ?? input.targetPath);

    return this.emitActivity({
      actor: 'agent',
      action: input.action,
      label: input.label?.trim() || `Agente: ${input.action} ${mainNode?.name ?? input.targetPath ?? ''}`.trim(),
      nodeId: mainNode?.id,
      fromNodeId: fromNode?.id,
      toNodeId: toNode?.id,
      filePath: mainNode?.path ?? input.targetPath,
    });
  }

  getChatTimeline(topicFilter?: string, onlyConnected = false) {
    const allNodes = this.deps.chatGraphRepo.listNodes();
    const allEdges = this.deps.chatGraphRepo.listEdges();

    const filteredNodes = allNodes.filter((n) => {
      if (onlyConnected && n.isIsolated) return false;
      if (topicFilter && !n.topicCluster.toLowerCase().includes(topicFilter.toLowerCase())) return false;
      return true;
    });

    const activeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = allEdges.filter((e) => activeIds.has(e.sourceId) && activeIds.has(e.targetId));

    return {
      totalNodes: filteredNodes.length,
      totalEdges: filteredEdges.length,
      nodes: filteredNodes.map((n) => ({
        id: n.id,
        content: n.content,
        timestamp: n.timestamp,
        topicCluster: n.topicCluster,
        isIsolated: n.isIsolated,
      })),
      edges: filteredEdges,
    };
  }

  exportGraphMermaid(target?: string, filter?: { format?: 'flowchart' | 'mindmap'; maxDepth?: number; includeSymbols?: boolean }) {
    const nodes = this.deps.fileGraphRepo.listNodes();
    const edges = this.deps.fileGraphRepo.listEdges();
    const matchedRoot = target
      ? nodes.find((n) => n.id === target || n.path === target || n.name === target)
      : undefined;

    this.emitActivity({
      actor: 'agent',
      action: 'mcp_query',
      label: `Agente exportó Mermaid (${matchedRoot?.name ?? 'todo'})`,
      nodeId: matchedRoot?.id,
      tokensSaved: 420,
    });

    return exportGraphToMermaid(nodes, edges, {
      format: filter?.format ?? 'flowchart',
      rootNodeId: matchedRoot?.id,
      maxDepth: filter?.maxDepth ?? 4,
      includeSymbols: filter?.includeSymbols ?? false,
      includeImports: true,
    });
  }
}
