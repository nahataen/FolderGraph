import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { mountMcpSseEndpoints } from './src/adapters/mcp/mcpServer';
import { ChatGraphRepository } from './src/db/chatGraphRepo';
import { closeDb, getDb } from './src/db/client';
import { FileGraphRepository } from './src/db/fileGraphRepo';
import { SettingsRepository } from './src/db/settingsRepo';
import { WorkspaceRepository } from './src/db/workspaceRepo';
import { createAgentRoutes } from './src/server/routes/agentRoutes';
import { createChatRoutes } from './src/server/routes/chatRoutes';
import { createHarnessRoutes } from './src/server/routes/harnessRoutes';
import { createSettingsRoutes } from './src/server/routes/settingsRoutes';
import { createWorkspaceRoutes } from './src/server/routes/workspaceRoutes';
import { seedInitialWorkspacesAndChat } from './src/server/seedDefaultData';
import { WorkspaceWatcherService } from './src/server/watcherService';
import { WsHub } from './src/server/wsHub';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const httpServer = http.createServer(app);
  const wsHub = new WsHub(httpServer);

  const db = getDb();
  const workspaceRepo = new WorkspaceRepository(db);
  const fileGraphRepo = new FileGraphRepository(db);
  const chatGraphRepo = new ChatGraphRepository(db);
  const settingsRepo = new SettingsRepository(db);

  seedInitialWorkspacesAndChat(workspaceRepo, fileGraphRepo, chatGraphRepo);

  const agentApi = createAgentRoutes({ fileGraphRepo, wsHub });
  const watcherService = new WorkspaceWatcherService(
    workspaceRepo,
    fileGraphRepo,
    wsHub,
    (activity) => agentApi.recordActivity(activity)
  );
  watcherService.startAllActive();

  const emitMcpActivity = (activity: Parameters<typeof agentApi.recordActivity>[0]) => {
    agentApi.recordActivity(activity);
    wsHub.broadcast({ type: 'agent:activity', activity });
  };

  app.use('/api', createWorkspaceRoutes({ workspaceRepo, fileGraphRepo, watcherService, wsHub }));
  app.use('/api', createChatRoutes({ chatGraphRepo, fileGraphRepo, settingsRepo, wsHub }));
  app.use('/api', createSettingsRoutes({ settingsRepo, workspaceRepo, fileGraphRepo, chatGraphRepo, onActivity: emitMcpActivity }));
  app.use('/api', createHarnessRoutes());
  app.use('/api', agentApi.router);

  mountMcpSseEndpoints(app, {
    workspaceRepo,
    fileGraphRepo,
    chatGraphRepo,
    onActivity: emitMcpActivity,
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT || 3000);
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`StrataGraph local server listening on http://0.0.0.0:${port}`);
  });

  const shutdown = () => {
    watcherService.stopAll();
    wsHub.close();
    closeDb();
    httpServer.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Error fatal al iniciar StrataGraph:', err);
  process.exit(1);
});
