import test from 'node:test';
import assert from 'node:assert/strict';
import type { FileEdgeRecord, FileNodeRecord } from '../../types/indexer';
import {
  collectSubtreeIds,
  computeSubtreePositions,
  hasArrangeableSubnodes,
} from './subtreeLayout';

const sampleNodes: FileNodeRecord[] = [
  { id: 'root', parentId: null, name: 'src', path: '/src', type: 'folder', sizeWeight: 3, updatedAt: 1, metadata: { workspaceId: 'ws', depth: 0, isRoot: true } },
  { id: 'folder-a', parentId: 'root', name: 'core', path: '/src/core', type: 'folder', sizeWeight: 2, updatedAt: 1, metadata: { workspaceId: 'ws', depth: 1 } },
  { id: 'folder-b', parentId: 'root', name: 'ui', path: '/src/ui', type: 'folder', sizeWeight: 2, updatedAt: 1, metadata: { workspaceId: 'ws', depth: 1 } },
  { id: 'file-1', parentId: 'folder-a', name: 'engine.ts', path: '/src/core/engine.ts', type: 'file', sizeWeight: 1, updatedAt: 1, metadata: { workspaceId: 'ws', depth: 2, extension: '.ts' } },
  { id: 'sym-1', parentId: 'file-1', name: 'runEngine', path: '/src/core/engine.ts#runEngine', type: 'symbol', sizeWeight: 1, updatedAt: 1, metadata: { workspaceId: 'ws', depth: 3, symbolKind: 'function' } },
  { id: 'sym-2', parentId: 'file-1', name: 'stopEngine', path: '/src/core/engine.ts#stopEngine', type: 'symbol', sizeWeight: 1, updatedAt: 1, metadata: { workspaceId: 'ws', depth: 3, symbolKind: 'function' } },
];

const sampleEdges: FileEdgeRecord[] = [
  { id: 'e1', sourceId: 'root', targetId: 'folder-a', relationType: 'contains' },
  { id: 'e2', sourceId: 'root', targetId: 'folder-b', relationType: 'contains' },
  { id: 'e3', sourceId: 'folder-a', targetId: 'file-1', relationType: 'contains' },
  { id: 'e4', sourceId: 'file-1', targetId: 'sym-1', relationType: 'contains' },
  { id: 'e5', sourceId: 'file-1', targetId: 'sym-2', relationType: 'contains' },
];

test('collectSubtreeIds and hasArrangeableSubnodes isolate selected node descendants', () => {
  const ids = collectSubtreeIds('folder-a', sampleNodes);
  assert.deepEqual(Array.from(ids).sort(), ['file-1', 'folder-a', 'sym-1', 'sym-2']);
  assert.equal(hasArrangeableSubnodes('folder-a', sampleNodes, true), true);
  assert.equal(hasArrangeableSubnodes('file-1', sampleNodes, true), true);
  assert.equal(hasArrangeableSubnodes('file-1', sampleNodes, false), false);
  assert.equal(hasArrangeableSubnodes('sym-1', sampleNodes, true), false);
});

test('computeSubtreePositions keeps selected node anchored and places subnodes cleanly below it', () => {
  const anchor = { x: 640, y: 240 };
  const positions = computeSubtreePositions(sampleNodes, sampleEdges, {
    rootId: 'folder-a',
    anchorPosition: anchor,
    displayMode: 'hybrid',
    showSymbols: true,
    collapsedIds: new Set(['folder-a']),
    highlightedIds: new Set(),
  });

  assert.equal(positions['folder-a'].x, anchor.x);
  assert.equal(positions['folder-a'].y, anchor.y);
  assert.equal(positions['folder-b'], undefined);
  assert.ok(positions['file-1'].y > positions['folder-a'].y);
  assert.ok(positions['sym-1'].y > positions['file-1'].y);
  assert.ok(positions['sym-2'].y > positions['file-1'].y);
  assert.notEqual(positions['sym-1'].x, positions['sym-2'].x);
});
