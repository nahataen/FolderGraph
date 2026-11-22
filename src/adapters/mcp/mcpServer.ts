import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { StrataGraphMcpTools, type McpToolDependencies } from './mcpTools';

export function createStrataGraphMcpServer(deps: McpToolDependencies): {
  server: McpServer;
  tools: StrataGraphMcpTools;
} {
  const tools = new StrataGraphMcpTools(deps);
  const server = new McpServer({
    name: 'stratagraph-mcp',
    version: '1.0.0',
  });

  server.tool(
    'get_project_structure',
    'Devuelve el árbol de archivos indexados y sus dependencias estáticas',
    {
      path: z.string().optional().describe('Ruta raíz o nombre del workspace'),
      depth: z.number().int().min(1).max(10).optional().describe('Profundidad máxima del árbol'),
    },
    async ({ path, depth }) => ({
      content: [{ type: 'text', text: JSON.stringify(tools.getProjectStructure(path, depth ?? 3), null, 2) }],
    })
  );

  server.tool(
    'search_codebase_nodes',
    'Busca archivos, funciones o símbolos usando el índice SQLite FTS5',
    {
      query: z.string().min(1).describe('Término o símbolo a buscar'),
    },
    async ({ query }) => ({
      content: [{ type: 'text', text: JSON.stringify(tools.searchCodebaseNodes(query), null, 2) }],
    })
  );

  server.tool(
    'get_chat_timeline',
    'Devuelve los nodos cronológicos del mapa de ideas y sus conexiones',
    {
      topic_filter: z.string().optional().describe('Filtro por nombre de tema'),
      only_connected: z.boolean().optional().describe('Excluir nodos aislados'),
    },
    async ({ topic_filter, only_connected }) => ({
      content: [{ type: 'text', text: JSON.stringify(tools.getChatTimeline(topic_filter, only_connected ?? false), null, 2) }],
    })
  );

  server.tool(
    'get_compact_context',
    'Devuelve un mapa estructural ultra-compacto para reducir el consumo de tokens y cuota del agente',
    {
      target: z.string().optional().describe('ID, ruta o nombre de carpeta/archivo'),
      maxFiles: z.number().int().min(1).max(400).optional(),
    },
    async ({ target, maxFiles }) => ({
      content: [{ type: 'text', text: JSON.stringify(tools.getCompactContext(target, maxFiles ?? 140), null, 2) }],
    })
  );

  server.tool(
    'report_agent_action',
    'Notifica en tiempo real al grafo visual que el agente está editando, creando o moviendo archivos',
    {
      action: z.enum(['edit', 'create', 'delete', 'move', 'read']),
      targetPath: z.string().optional(),
      fromPath: z.string().optional(),
      toPath: z.string().optional(),
      label: z.string().optional(),
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(tools.reportAgentAction(args), null, 2) }],
    })
  );

  server.tool(
    'export_graph_mermaid',
    'Genera un diagrama Mermaid flowchart TD o mindmap del proyecto o subgrafo',
    {
      target: z.string().optional().describe('ID, ruta o nombre del nodo raíz'),
      format: z.enum(['flowchart', 'mindmap']).optional().describe('Formato Mermaid'),
      maxDepth: z.number().int().min(1).max(8).optional(),
    },
    async ({ target, format, maxDepth }) => ({
      content: [{ type: 'text', text: JSON.stringify(tools.exportGraphMermaid(target, { format, maxDepth }), null, 2) }],
    })
  );

  return { server, tools };
}

export function mountMcpSseEndpoints(app: Express, deps: McpToolDependencies): void {
  const transports = new Map<string, SSEServerTransport>();

  app.get('/mcp/sse', async (_req: Request, res: Response) => {
    const { server } = createStrataGraphMcpServer(deps);
    const transport = new SSEServerTransport('/mcp/messages', res);
    transports.set(transport.sessionId, transport);
    res.on('close', () => {
      transports.delete(transport.sessionId);
    });
    await server.connect(transport);
  });

  app.post('/mcp/messages', async (req: Request, res: Response) => {
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: 'Sesión MCP no encontrada' });
      return;
    }
    await transport.handlePostMessage(req, res, req.body);
  });
}
