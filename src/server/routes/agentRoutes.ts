import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { buildCompactAgentContext } from '../../core/exporter/compactContext';
import type { FileGraphRepository } from '../../db/fileGraphRepo';
import type { AgentActivityEvent } from '../../types/protocol';
import type { WsHub } from '../wsHub';

const activitySchema = z.object({
  actor: z.enum(['agent', 'fs', 'user']).default('agent'),
  action: z.enum(['edit', 'create', 'delete', 'move', 'read', 'search', 'mcp_query']),
  targetPath: z.string().optional(),
  fromPath: z.string().optional(),
  toPath: z.string().optional(),
  label: z.string().optional(),
  tokensSaved: z.number().int().min(0).optional(),
});

export function createAgentRoutes(deps: {
  fileGraphRepo: FileGraphRepository;
  wsHub: WsHub;
}): { router: Router; recordActivity: (activity: AgentActivityEvent) => void } {
  const router = Router();
  const recentActivities: AgentActivityEvent[] = [];

  const recordActivity = (activity: AgentActivityEvent) => {
    recentActivities.unshift(activity);
    if (recentActivities.length > 60) recentActivities.pop();
  };

  router.get('/agent/context', (req, res) => {
    const workspaceId =
      typeof req.query.workspaceId === 'string' && req.query.workspaceId !== 'all'
        ? req.query.workspaceId
        : undefined;
    const rootNodeId = typeof req.query.rootNodeId === 'string' ? req.query.rootNodeId : undefined;
    const nodes = deps.fileGraphRepo.listNodes(workspaceId);
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = deps.fileGraphRepo.listEdges(nodeIds);
    const result = buildCompactAgentContext(nodes, edges, { rootNodeId });

    if (req.query.notify === '1') {
      const activity: AgentActivityEvent = {
        id: crypto.randomUUID(),
        actor: 'user',
        action: 'read',
        label: `Contexto compacto (${result.fileCount} arch.)`,
        nodeId: rootNodeId ?? result.matchedNodeIds[0],
        tokensSaved: result.estimatedTokensSaved,
        timestamp: Date.now(),
      };
      recordActivity(activity);
      deps.wsHub.broadcast({ type: 'agent:activity', activity });
    }

    res.json(result);
  });

  router.get('/agent/activity', (_req, res) => {
    res.json({ activities: recentActivities });
  });

  router.post('/agent/activity', (req, res) => {
    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Evento de actividad inválido.' });
      return;
    }

    const nodes = deps.fileGraphRepo.listNodes();
    const resolveNode = (q?: string) =>
      q ? nodes.find((n) => n.id === q || n.path === q || n.path.endsWith(q) || n.name === q) : undefined;

    const mainNode = resolveNode(parsed.data.targetPath ?? parsed.data.toPath);
    const fromNode = resolveNode(parsed.data.fromPath);
    const toNode = resolveNode(parsed.data.toPath ?? parsed.data.targetPath);

    const activity: AgentActivityEvent = {
      id: crypto.randomUUID(),
      actor: parsed.data.actor,
      action: parsed.data.action,
      label:
        parsed.data.label?.trim() ||
        `${parsed.data.actor === 'agent' ? 'Agente' : 'Acción'}: ${parsed.data.action} ${mainNode?.name ?? ''}`.trim(),
      nodeId: mainNode?.id,
      fromNodeId: fromNode?.id,
      toNodeId: toNode?.id,
      filePath: mainNode?.path ?? parsed.data.targetPath,
      tokensSaved: parsed.data.tokensSaved,
      timestamp: Date.now(),
    };

    recordActivity(activity);
    deps.wsHub.broadcast({ type: 'agent:activity', activity });
    res.status(201).json({ activity });
  });

  return { router, recordActivity };
}
