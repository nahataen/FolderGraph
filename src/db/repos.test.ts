import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabase } from './client';
import { WorkspaceRepository } from './workspaceRepo';
import { FileGraphRepository } from './fileGraphRepo';

test('SQLite repositories persist workspace and execute FTS5 search', () => {
  const db = createDatabase(':memory:');
  const wsRepo = new WorkspaceRepository(db);
  const graphRepo = new FileGraphRepository(db);

  wsRepo.upsert({
    id: 'ws1',
    rootPath: '/tmp/demo',
    name: 'demo',
    watcherActive: true,
    lastScannedAt: Date.now(),
  });

  graphRepo.replaceWorkspaceGraph(
    'ws1',
    [
      {
        id: 'n1',
        parentId: null,
        path: '/tmp/demo/mermaidExporter.ts',
        name: 'mermaidExporter.ts',
        type: 'file',
        sizeWeight: 1.4,
        metadata: { depth: 1, extension: '.ts', exports: ['exportGraphToMermaid'], workspaceId: 'ws1' },
        updatedAt: Date.now(),
      },
    ],
    []
  );

  const workspaces = wsRepo.listAll();
  assert.equal(workspaces.length, 1);

  const hits = graphRepo.searchFts('mermaid');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, 'mermaidExporter.ts');
  db.close();
});

test('createDatabase automatically recovers from corrupted database and WAL files', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratagraph-corrupt-'));
  const dbPath = path.join(tempDir, 'stratagraph.db');
  fs.writeFileSync(dbPath, Buffer.from('corrupt sqlite header bytes 0000000000000000'));
  fs.writeFileSync(`${dbPath}-wal`, Buffer.from('corrupt wal bytes'));
  fs.writeFileSync(`${dbPath}-shm`, Buffer.from('corrupt shm bytes'));

  const db = createDatabase(dbPath);
  const wsRepo = new WorkspaceRepository(db);
  wsRepo.upsert({
    id: 'ws-rec',
    rootPath: '/tmp/recovered',
    name: 'recovered',
    watcherActive: true,
    lastScannedAt: Date.now(),
  });

  assert.equal(wsRepo.listAll().length, 1);
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});
