import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { createActiveAIProvider } from '../../adapters/ai/aiProvider';
import { computeChatTimelineGraph } from '../../core/chat-graph/clustering';
import type { ChatGraphRepository } from '../../db/chatGraphRepo';
import type { FileGraphRepository } from '../../db/fileGraphRepo';
import type { SettingsRepository } from '../../db/settingsRepo';
import type { WsHub } from '../wsHub';

const addMessageSchema = z.object({
  content: z.string().trim().min(2).max(4000),
  sessionId: z.string().optional(),
});

const summarizeSchema = z.object({
  nodeId: z.string().min(1),
});

export function createChatRoutes(deps: {
  chatGraphRepo: ChatGraphRepository;
  fileGraphRepo: FileGraphRepository;
  settingsRepo: SettingsRepository;
  wsHub: WsHub;
}): Router {
  const router = Router();

  router.get('/chat-graph', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const nodes = q ? deps.chatGraphRepo.searchFts(q, 50) : deps.chatGraphRepo.listNodes();
    const activeIds = new Set(nodes.map((n) => n.id));
    const edges = deps.chatGraphRepo.listEdges().filter((e) => activeIds.has(e.sourceId) && activeIds.has(e.targetId));
    const topics = Array.from(new Set(deps.chatGraphRepo.listNodes().map((n) => n.topicCluster)));
    res.json({ nodes, edges, topics });
  });

  router.post('/chat-graph/messages', async (req, res) => {
    const parsed = addMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'El mensaje debe tener al menos 2 caracteres.' });
      return;
    }

    const existing = deps.chatGraphRepo.listNodes();
    const aiProvider = createActiveAIProvider(deps.settingsRepo);
    const embeddingResult = aiProvider ? await aiProvider.embedText(parsed.data.content) : null;

    const newMessage = {
      id: `chat-${crypto.randomUUID().slice(0, 8)}`,
      sessionId: parsed.data.sessionId?.trim() || 'default',
      content: parsed.data.content,
      timestamp: Date.now(),
      embedding: embeddingResult?.vector ?? null,
    };

    const allRaw = [
      ...existing.map((n) => ({
        id: n.id,
        sessionId: n.sessionId,
        content: n.content,
        timestamp: n.timestamp,
        embedding: n.embedding,
      })),
      newMessage,
    ];

    const fileNodes = deps.fileGraphRepo.listNodes();
    const clustered = computeChatTimelineGraph(allRaw, fileNodes);
    deps.chatGraphRepo.replaceAll(clustered.nodes, clustered.edges);
    deps.wsHub.broadcast({ type: 'chat:updated', nodes: clustered.nodes, edges: clustered.edges });

    const createdNode = clustered.nodes.find((n) => n.id === newMessage.id);
    const topics = Array.from(new Set(clustered.nodes.map((n) => n.topicCluster)));
    res.status(201).json({ node: createdNode, nodes: clustered.nodes, edges: clustered.edges, topics });
  });

  router.delete('/chat-graph/messages/:id', (req, res) => {
    const existing = deps.chatGraphRepo.listNodes();
    const remaining = existing.filter((n) => n.id !== req.params.id);
    if (remaining.length === existing.length) {
      res.status(404).json({ error: 'Nodo de chat no encontrado.' });
      return;
    }
    const fileNodes = deps.fileGraphRepo.listNodes();
    const clustered = computeChatTimelineGraph(remaining, fileNodes);
    deps.chatGraphRepo.replaceAll(clustered.nodes, clustered.edges);
    deps.wsHub.broadcast({ type: 'chat:updated', nodes: clustered.nodes, edges: clustered.edges });
    res.json({ nodes: clustered.nodes, edges: clustered.edges });
  });

  router.post('/chat-graph/summarize', async (req, res) => {
    const parsed = summarizeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'ID de nodo requerido.' });
      return;
    }
    const target = deps.chatGraphRepo.listNodes().find((n) => n.id === parsed.data.nodeId);
    if (!target) {
      res.status(404).json({ error: 'Nodo no encontrado.' });
      return;
    }

    const aiProvider = createActiveAIProvider(deps.settingsRepo);
    if (!aiProvider) {
      res.status(400).json({ error: 'Configura un proveedor de IA opcional en Ajustes para generar resúmenes bajo demanda.' });
      return;
    }

    const summary = await aiProvider.summarizeText(target.content, `Tema: ${target.topicCluster}`);
    if (!summary) {
      res.status(502).json({ error: 'No se pudo conectar con el proveedor OpenAI-compatible configurado.' });
      return;
    }
    res.json({ nodeId: target.id, summary });
  });

  return router;
}
