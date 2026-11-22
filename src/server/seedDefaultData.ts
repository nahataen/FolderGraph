import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { computeChatTimelineGraph } from '../core/chat-graph/clustering';
import { scanWorkspaceDirectory } from '../core/indexer/scanner';
import type { ChatGraphRepository } from '../db/chatGraphRepo';
import type { FileGraphRepository } from '../db/fileGraphRepo';
import type { WorkspaceRepository } from '../db/workspaceRepo';

export function seedInitialWorkspacesAndChat(
  workspaceRepo: WorkspaceRepository,
  fileGraphRepo: FileGraphRepository,
  chatGraphRepo: ChatGraphRepository
): void {
  const existingWorkspaces = workspaceRepo.listAll();
  if (existingWorkspaces.length === 0) {
    const defaultRoot = path.resolve(process.cwd(), 'src');
    if (fs.existsSync(defaultRoot)) {
      const wsId = crypto.createHash('sha1').update(defaultRoot).digest('hex').slice(0, 12);
      const workspace = {
        id: wsId,
        rootPath: defaultRoot,
        name: 'src',
        watcherActive: true,
        lastScannedAt: Date.now(),
      };
      workspaceRepo.upsert(workspace);
      const scanned = scanWorkspaceDirectory(workspace);
      fileGraphRepo.replaceWorkspaceGraph(wsId, scanned.nodes, scanned.edges);
    }
  }

  const existingChatNodes = chatGraphRepo.listNodes();
  if (existingChatNodes.length === 0) {
    const baseTime = Date.now() - 1000 * 60 * 90;
    const allFiles = fileGraphRepo.listNodes();
    const initialMessages = [
      {
        id: 'chat-1',
        sessionId: 'default',
        content: 'Definir el escáner incremental en `scanner.ts` para procesar archivos TS, Python y Markdown sin bloquear la UI.',
        timestamp: baseTime,
      },
      {
        id: 'chat-2',
        sessionId: 'default',
        content: 'Diseñar el exportador `mermaidExporter.ts` con soporte para flowchart TD y mindmap por subgrafo.',
        timestamp: baseTime + 1000 * 60 * 12,
      },
      {
        id: 'chat-3',
        sessionId: 'default',
        content: 'Tangente rápida: revisar empaquetado futuro con Tauri y permisos de lectura local en macOS.',
        timestamp: baseTime + 1000 * 60 * 24,
      },
      {
        id: 'chat-4',
        sessionId: 'default',
        content: 'Retomar `scanner.ts`: conectar Chokidar para recalcular solo la rama modificada vía WebSocket.',
        timestamp: baseTime + 1000 * 60 * 42,
      },
      {
        id: 'chat-5',
        sessionId: 'default',
        content: 'Configurar búsqueda instantánea SQLite FTS5 sobre nombres, rutas y símbolos exportados en `fileGraphRepo.ts`.',
        timestamp: baseTime + 1000 * 60 * 58,
      },
      {
        id: 'chat-6',
        sessionId: 'default',
        content: 'Añadir botón de copiado en un clic y vista previa limpia para `mermaidExporter.ts` dentro de la barra lateral.',
        timestamp: baseTime + 1000 * 60 * 75,
      },
    ];

    const clustered = computeChatTimelineGraph(initialMessages, allFiles);
    chatGraphRepo.replaceAll(clustered.nodes, clustered.edges);
  }
}
