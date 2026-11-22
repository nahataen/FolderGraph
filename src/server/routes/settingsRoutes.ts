import { Router } from 'express';
import { z } from 'zod';
import { StrataGraphMcpTools } from '../../adapters/mcp/mcpTools';
import type { ChatGraphRepository } from '../../db/chatGraphRepo';
import type { FileGraphRepository } from '../../db/fileGraphRepo';
import type { SettingsRepository } from '../../db/settingsRepo';
import type { WorkspaceRepository } from '../../db/workspaceRepo';
import type { AgentActivityEvent } from '../../types/protocol';

const updateAiSchema = z.object({
  preset: z.enum(['disabled', 'ollama_local', 'lmstudio_local', 'nvidia_nim', 'openai', 'custom_https']),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  modelName: z.string().default(''),
  embeddingModel: z.string().optional(),
  enabled: z.boolean(),
});

const mcpTestSchema = z.object({
  tool: z.enum([
    'get_compact_context',
    'get_project_structure',
    'search_codebase_nodes',
    'get_chat_timeline',
    'export_graph_mermaid',
    'report_agent_action',
  ]),
  args: z.record(z.string(), z.unknown()).optional(),
});

export function createSettingsRoutes(deps: {
  settingsRepo: SettingsRepository;
  workspaceRepo: WorkspaceRepository;
  fileGraphRepo: FileGraphRepository;
  chatGraphRepo: ChatGraphRepository;
  onActivity?: (activity: AgentActivityEvent) => void;
}): Router {
  const router = Router();
  const mcpTools = new StrataGraphMcpTools({
    workspaceRepo: deps.workspaceRepo,
    fileGraphRepo: deps.fileGraphRepo,
    chatGraphRepo: deps.chatGraphRepo,
    onActivity: deps.onActivity,
  });

  router.get('/settings/ai', (_req, res) => {
    res.json(deps.settingsRepo.getPublicAISettings());
  });

  router.put('/settings/ai', (req, res) => {
    const parsed = updateAiSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuración de IA inválida.' });
      return;
    }
    const updated = deps.settingsRepo.updateAISettings(parsed.data);
    res.json(updated);
  });

  router.post('/mcp/invoke', (req, res) => {
    const parsed = mcpTestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invocación MCP inválida.' });
      return;
    }

    const args = parsed.data.args ?? {};
    switch (parsed.data.tool) {
      case 'get_compact_context': {
        const target = typeof args.target === 'string' ? args.target : undefined;
        const maxFiles = typeof args.maxFiles === 'number' ? args.maxFiles : 140;
        res.json(mcpTools.getCompactContext(target, maxFiles));
        return;
      }
      case 'get_project_structure': {
        const pathArg = typeof args.path === 'string' ? args.path : undefined;
        const depthArg = typeof args.depth === 'number' ? args.depth : 3;
        res.json(mcpTools.getProjectStructure(pathArg, depthArg));
        return;
      }
      case 'search_codebase_nodes': {
        const query = typeof args.query === 'string' ? args.query : 'scanner';
        res.json(mcpTools.searchCodebaseNodes(query));
        return;
      }
      case 'get_chat_timeline': {
        const topic = typeof args.topic_filter === 'string' ? args.topic_filter : undefined;
        const onlyConnected = Boolean(args.only_connected);
        res.json(mcpTools.getChatTimeline(topic, onlyConnected));
        return;
      }
      case 'export_graph_mermaid': {
        const target = typeof args.target === 'string' ? args.target : undefined;
        const format = args.format === 'mindmap' ? 'mindmap' : 'flowchart';
        res.json(mcpTools.exportGraphMermaid(target, { format }));
        return;
      }
      case 'report_agent_action': {
        const action = typeof args.action === 'string' ? args.action : 'edit';
        res.json(
          mcpTools.reportAgentAction({
            action: action as AgentActivityEvent['action'],
            targetPath: typeof args.targetPath === 'string' ? args.targetPath : undefined,
            fromPath: typeof args.fromPath === 'string' ? args.fromPath : undefined,
            toPath: typeof args.toPath === 'string' ? args.toPath : undefined,
            label: typeof args.label === 'string' ? args.label : undefined,
          })
        );
        return;
      }
    }
  });

  return router;
}
