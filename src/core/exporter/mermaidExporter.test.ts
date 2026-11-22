import test from 'node:test';
import assert from 'node:assert/strict';
import { exportGraphToMermaid } from './mermaidExporter';
import type { FileEdgeRecord, FileNodeRecord } from '../../types/indexer';

const sampleNodes: FileNodeRecord[] = [
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
    id: 'src',
    parentId: 'root',
    path: '/repo/src',
    name: 'src',
    type: 'folder',
    sizeWeight: 2.5,
    metadata: { depth: 1, workspaceId: 'w1' },
    updatedAt: 1,
  },
  {
    id: 'app',
    parentId: 'src',
    path: '/repo/src/App.tsx',
    name: 'App.tsx',
    type: 'file',
    sizeWeight: 1.4,
    metadata: { depth: 2, extension: '.tsx', workspaceId: 'w1' },
    updatedAt: 1,
  },
];

const sampleEdges: FileEdgeRecord[] = [
  { id: 'e1', sourceId: 'root', targetId: 'src', relationType: 'contains' },
  { id: 'e2', sourceId: 'src', targetId: 'app', relationType: 'contains' },
];

test('exportGraphToMermaid generates flowchart TD and mindmap formats', () => {
  const flow = exportGraphToMermaid(sampleNodes, sampleEdges, { format: 'flowchart' });
  assert.ok(flow.code.startsWith('flowchart TD'));
  assert.ok(flow.code.includes('n_root(("repo"))'));
  assert.ok(flow.code.includes('n_app["App.tsx"]'));
  assert.equal(flow.nodeCount, 3);

  const mind = exportGraphToMermaid(sampleNodes, sampleEdges, { format: 'mindmap' });
  assert.ok(mind.code.startsWith('mindmap'));
  assert.ok(mind.code.includes('root((repo))'));
  assert.ok(mind.code.includes('App.tsx'));
});

test('exportGraphToMermaid supports subgraph rootNodeId filtering', () => {
  const sub = exportGraphToMermaid(sampleNodes, sampleEdges, {
    format: 'flowchart',
    rootNodeId: 'src',
  });
  assert.equal(sub.nodeCount, 2);
  assert.equal(sub.code.includes('n_root'), false);
  assert.equal(sub.code.includes('n_app'), true);
});
