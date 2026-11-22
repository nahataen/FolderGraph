import crypto from 'node:crypto';
import chokidar, { type FSWatcher } from 'chokidar';
import path from 'node:path';
import {
  makeNodeId,
  normalizePosix,
  scanSingleFileNodes,
  scanWorkspaceDirectory,
  shouldIgnorePath,
} from '../core/indexer/scanner';
import type { FileGraphRepository } from '../db/fileGraphRepo';
import type { WorkspaceRepository } from '../db/workspaceRepo';
import type { WorkspaceRecord } from '../types/indexer';
import type { WsHub } from './wsHub';

export class WorkspaceWatcherService {
  private readonly watchers = new Map<string, FSWatcher>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly recentUnlinks = new Map<string, { nodeId: string; path: string; ts: number }>();

  constructor(
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly fileGraphRepo: FileGraphRepository,
    private readonly wsHub: WsHub
  ) {}

  startAllActive(): void {
    const workspaces = this.workspaceRepo.listAll();
    for (const ws of workspaces) {
      if (ws.watcherActive) {
        this.watchWorkspace(ws);
      }
    }
  }

  watchWorkspace(workspace: WorkspaceRecord): void {
    this.stopWorkspace(workspace.id);

    const watcher = chokidar.watch(workspace.rootPath, {
      ignoreInitial: true,
      persistent: true,
      depth: 8,
      ignored: (targetPath: string) => {
        const rel = path.relative(workspace.rootPath, targetPath);
        if (!rel || rel === '') return false;
        return shouldIgnorePath(rel);
      },
    });

    const handleFileEvent = (reason: 'add' | 'change', targetPath: string) => {
      const normalized = normalizePosix(path.resolve(targetPath));
      const existing = this.fileGraphRepo.listNodes(workspace.id);
      const { nodes, edges } = scanSingleFileNodes(workspace, normalized, existing);
      this.fileGraphRepo.deleteByPathPrefix(`${normalized}#`);
      this.fileGraphRepo.upsertSubgraph(nodes, edges);

      const fileId = makeNodeId(workspace.id, normalized);
      const baseName = path.basename(normalized);
      const prevUnlink = this.recentUnlinks.get(`${workspace.id}:${baseName}`);
      const isMove = reason === 'add' && prevUnlink && Date.now() - prevUnlink.ts <= 900;
      if (isMove) this.recentUnlinks.delete(`${workspace.id}:${baseName}`);

      this.wsHub.broadcast({
        type: 'graph:delta',
        workspaceId: workspace.id,
        reason,
        changedPath: normalized,
        changedNodeId: fileId,
        timestamp: Date.now(),
      });

      this.wsHub.broadcast({
        type: 'agent:activity',
        activity: {
          id: crypto.randomUUID(),
          actor: 'fs',
          action: isMove ? 'move' : reason === 'add' ? 'create' : 'edit',
          label: isMove
            ? `Movido ${baseName}`
            : `${reason === 'add' ? 'Creado' : 'Editado'} ${baseName}`,
          nodeId: fileId,
          fromNodeId: isMove ? prevUnlink.nodeId : undefined,
          toNodeId: isMove ? fileId : undefined,
          filePath: normalized,
          timestamp: Date.now(),
        },
      });
    };

    const scheduleFullBranchRescan = (reason: 'add' | 'unlink' | 'rescan', changedPath: string) => {
      const existingTimer = this.timers.get(workspace.id);
      if (existingTimer) clearTimeout(existingTimer);
      const timer = setTimeout(() => {
        const result = scanWorkspaceDirectory(workspace);
        this.fileGraphRepo.replaceWorkspaceGraph(workspace.id, result.nodes, result.edges);
        this.workspaceRepo.upsert({ ...workspace, lastScannedAt: Date.now() });
        this.wsHub.broadcast({
          type: 'graph:delta',
          workspaceId: workspace.id,
          reason,
          changedPath: normalizePosix(changedPath),
          timestamp: Date.now(),
        });
      }, 280);
      this.timers.set(workspace.id, timer);
    };

    watcher
      .on('add', (p) => handleFileEvent('add', p))
      .on('change', (p) => handleFileEvent('change', p))
      .on('unlink', (p) => {
        const normalized = normalizePosix(path.resolve(p));
        const fileId = makeNodeId(workspace.id, normalized);
        const baseName = path.basename(normalized);
        this.recentUnlinks.set(`${workspace.id}:${baseName}`, { nodeId: fileId, path: normalized, ts: Date.now() });
        this.fileGraphRepo.deleteByPathPrefix(normalized);
        this.wsHub.broadcast({
          type: 'graph:delta',
          workspaceId: workspace.id,
          reason: 'unlink',
          changedPath: normalized,
          changedNodeId: fileId,
          timestamp: Date.now(),
        });
        this.wsHub.broadcast({
          type: 'agent:activity',
          activity: {
            id: crypto.randomUUID(),
            actor: 'fs',
            action: 'delete',
            label: `Eliminado ${baseName}`,
            nodeId: fileId,
            filePath: normalized,
            timestamp: Date.now(),
          },
        });
      })
      .on('addDir', (p) => scheduleFullBranchRescan('add', p))
      .on('unlinkDir', (p) => scheduleFullBranchRescan('unlink', p));

    this.watchers.set(workspace.id, watcher);
  }

  stopWorkspace(workspaceId: string): void {
    const watcher = this.watchers.get(workspaceId);
    if (watcher) {
      void watcher.close();
      this.watchers.delete(workspaceId);
    }
    const timer = this.timers.get(workspaceId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(workspaceId);
    }
  }

  stopAll(): void {
    for (const id of this.watchers.keys()) {
      this.stopWorkspace(id);
    }
  }
}
