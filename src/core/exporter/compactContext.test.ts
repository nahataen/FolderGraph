import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompactAgentContext } from './compactContext';
import type { FileEdgeRecord, FileNodeRecord } from '../../types/indexer';

test('buildCompactAgentContext generates compact map and estimates saved tokens', () => {
  const nodes: FileNodeRecord[] = [
    {
      id: 'root',
      parentId: null,
      path: '/repo',
      name: 'repo',
      type: 'folder',
      sizeWeight: 4,
      metadata: { depth: 0, isRoot: true, workspaceId: 'w1' },
      updatedAt: 1,
    },
    {
      id: 'f1',
      parentId: 'root',
      path: '/repo/server.ts',
      name: 'server.ts',
      type: 'file',
      sizeWeight: 1.4,
      metadata: {
        depth: 1,
        lines: 180,
        imports: ['./db'],
        exports: ['startServer'],
        workspaceId: 'w1',
      },
      updatedAt: 1,
    },
    {
      id: 's1',
      parentId: 'f1',
      path: '/repo/server.ts#function:startServer',
      name: 'startServer',
      type: 'symbol',
      sizeWeight: 0.6,
      metadata: { depth: 2, symbolKind: 'function', workspaceId: 'w1' },
      updatedAt: 1,
    },
  ];
  const edges: FileEdgeRecord[] = [
    { id: 'c1', sourceId: 'root', targetId: 'f1', relationType: 'contains' },
    { id: 'c2', sourceId: 'f1', targetId: 's1', relationType: 'contains' },
  ];

  const result = buildCompactAgentContext(nodes, edges);
  assert.equal(result.fileCount, 1);
  assert.equal(result.symbolCount, 1);
  assert.ok(result.summaryText.includes('/repo/server.ts (180L)'));
  assert.ok(result.summaryText.includes('sym:[startServer]'));
  assert.ok(result.estimatedTokensSaved > 500);
  assert.ok(result.compressionRatio > 0.8);
});
