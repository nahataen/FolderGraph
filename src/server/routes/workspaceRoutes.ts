import crypto from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { exportGraphToMermaid } from '../../core/exporter/mermaidExporter';
import { validateWorkspaceDirectory } from '../../core/indexer/pathSecurity';
import { scanWorkspaceDirectory } from '../../core/indexer/scanner';
import type { FileGraphRepository } from '../../db/fileGraphRepo';
import type { WorkspaceRepository } from '../../db/workspaceRepo';
import type { WorkspaceWatcherService } from '../watcherService';
import type { WsHub } from '../wsHub';

const createWorkspaceSchema = z.object({
  rootPath: z.string().min(1),
  name: z.string().optional(),
});

const exportMermaidSchema = z.object({
  format: z.enum(['flowchart', 'mindmap']).default('flowchart'),
  rootNodeId: z.string().optional(),
  maxDepth: z.number().int().min(1).max(8).optional(),
  includeSymbols: z.boolean().optional(),
  includeImports: z.boolean().optional(),
});

export function createWorkspaceRoutes(deps: {
  workspaceRepo: WorkspaceRepository;
  fileGraphRepo: FileGraphRepository;
  watcherService: WorkspaceWatcherService;
  wsHub: WsHub;
}): Router {
  const router = Router();

  router.get('/workspaces', (_req, res) => {
    res.json({ workspaces: deps.workspaceRepo.listAll() });
  });

  router.post('/workspaces', (req, res) => {
    const parsed = createWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Solicitud inválida para crear workspace.' });
      return;
    }

    const check = validateWorkspaceDirectory(parsed.data.rootPath);
    if (check.ok === false) {
      res.status(400).json({ error: check.error });
      return;
    }

    const existing = deps.workspaceRepo.getByRootPath(check.resolvedPath);
    const wsId =
      existing?.id ??
      crypto.createHash('sha1').update(check.resolvedPath).digest('hex').slice(0, 12);

    const workspace = {
      id: wsId,
      rootPath: check.resolvedPath,
      name: parsed.data.name?.trim() || path.basename(check.resolvedPath) || 'workspace',
      watcherActive: true,
      lastScannedAt: Date.now(),
    };

    deps.workspaceRepo.upsert(workspace);
    const scanned = scanWorkspaceDirectory(workspace);
    deps.fileGraphRepo.replaceWorkspaceGraph(wsId, scanned.nodes, scanned.edges);
    deps.watcherService.watchWorkspace(workspace);

    const allWorkspaces = deps.workspaceRepo.listAll();
    deps.wsHub.broadcast({ type: 'workspace:updated', workspaces: allWorkspaces });
    deps.wsHub.broadcast({
      type: 'graph:delta',
      workspaceId: wsId,
      reason: 'rescan',
      timestamp: Date.now(),
    });

    res.status(201).json({
      workspace,
      nodeCount: scanned.nodes.length,
      edgeCount: scanned.edges.length,
    });
  });

  router.post('/workspaces/:id/rescan', (req, res) => {
    const workspace = deps.workspaceRepo.getById(req.params.id);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace no encontrado.' });
      return;
    }

    const existingNodes = deps.fileGraphRepo.listNodes(workspace.id);
    const scanned = scanWorkspaceDirectory(workspace, undefined, 280, existingNodes);
    const updated = { ...workspace, lastScannedAt: Date.now() };
    deps.workspaceRepo.upsert(updated);
    deps.fileGraphRepo.replaceWorkspaceGraph(workspace.id, scanned.nodes, scanned.edges);
    deps.wsHub.broadcast({
      type: 'graph:delta',
      workspaceId: workspace.id,
      reason: 'rescan',
      timestamp: Date.now(),
    });

    res.json({ workspace: updated, nodeCount: scanned.nodes.length, edgeCount: scanned.edges.length });
  });

  router.delete('/workspaces/:id', (req, res) => {
    const workspace = deps.workspaceRepo.getById(req.params.id);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace no encontrado.' });
      return;
    }
    deps.watcherService.stopWorkspace(workspace.id);
    deps.fileGraphRepo.replaceWorkspaceGraph(workspace.id, [], []);
    deps.workspaceRepo.delete(workspace.id);
    const allWorkspaces = deps.workspaceRepo.listAll();
    deps.wsHub.broadcast({ type: 'workspace:updated', workspaces: allWorkspaces });
    res.json({ deletedId: workspace.id });
  });

  router.get('/graph', (req, res) => {
    const workspaceId = typeof req.query.workspaceId === 'string' && req.query.workspaceId !== 'all'
      ? req.query.workspaceId
      : undefined;
    const workspaces = deps.workspaceRepo.listAll();
    const nodes = deps.fileGraphRepo.listNodes(workspaceId);
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = deps.fileGraphRepo.listEdges(nodeIds);
    res.json({ workspaces, nodes, edges });
  });

  router.get('/search', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const hits = deps.fileGraphRepo.searchFts(q, 60);
    res.json({ query: q, nodes: hits });
  });

  router.post('/export/mermaid', (req, res) => {
    const parsed = exportMermaidSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Opciones de exportación Mermaid inválidas.' });
      return;
    }
    const workspaceId = typeof req.body?.workspaceId === 'string' && req.body.workspaceId !== 'all'
      ? req.body.workspaceId
      : undefined;
    const nodes = deps.fileGraphRepo.listNodes(workspaceId);
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = deps.fileGraphRepo.listEdges(nodeIds);
    const result = exportGraphToMermaid(nodes, edges, parsed.data);
    res.json(result);
  });

  return router;
}
