import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStructuralFlowGraph } from './dagreLayout';
import type { FileEdgeRecord, FileNodeRecord } from '../../types/indexer';

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
    id: 'file1',
    parentId: 'src',
    path: '/repo/src/index.ts',
    name: 'index.ts',
    type: 'file',
    sizeWeight: 1.4,
    metadata: { depth: 2, extension: '.ts', workspaceId: 'w1' },
    updatedAt: 1,
  },
  ...['fnA', 'fnB', 'fnC', 'fnD', 'fnE', 'fnF'].map((name) => ({
    id: `sym_${name}`,
    parentId: 'file1',
    path: `/repo/src/index.ts#function:${name}`,
    name,
    type: 'symbol' as const,
    sizeWeight: 0.6,
    metadata: { depth: 3, symbolKind: 'function' as const, workspaceId: 'w1' },
    updatedAt: 1,
  })),
];

const edges: FileEdgeRecord[] = [
  { id: 'e1', sourceId: 'root', targetId: 'src', relationType: 'contains' },
  { id: 'e2', sourceId: 'src', targetId: 'file1', relationType: 'contains' },
  ...['fnA', 'fnB', 'fnC', 'fnD', 'fnE', 'fnF'].map((name) => ({
    id: `e_${name}`,
    sourceId: 'file1',
    targetId: `sym_${name}`,
    relationType: 'contains' as const,
  })),
];

test('buildStructuralFlowGraph collapses descendants and reports hidden count', () => {
  const collapsed = buildStructuralFlowGraph(nodes, edges, {
    displayMode: 'hybrid',
    showSymbols: true,
    showImportEdges: false,
    selectedNodeId: null,
    highlightedIds: new Set(),
    collapsedIds: new Set(['src']),
  });

  assert.equal(collapsed.nodes.length, 2);
  const srcNode = collapsed.nodes.find((n) => n.id === 'src')!;
  assert.equal(srcNode.data.isCollapsed, true);
  assert.equal(srcNode.data.hiddenDescendantCount, 7);
});

test('buildStructuralFlowGraph spaces expanded symbol cards without overlapping', () => {
  const expanded = buildStructuralFlowGraph(nodes, edges, {
    displayMode: 'detailed',
    showSymbols: true,
    showImportEdges: false,
    selectedNodeId: 'file1',
    highlightedIds: new Set(),
    collapsedIds: new Set(),
  });

  const syms = expanded.nodes.filter((n) => n.data.record.type === 'symbol');
  assert.equal(syms.length, 6);

  for (let i = 0; i < syms.length; i++) {
    for (let j = i + 1; j < syms.length; j++) {
      const dx = Math.abs(syms[i].position.x - syms[j].position.x);
      const dy = Math.abs(syms[i].position.y - syms[j].position.y);
      assert.ok(dx >= 132 || dy >= 28, `Symbols ${syms[i].id} and ${syms[j].id} overlap (dx=${dx}, dy=${dy})`);
    }
  }
});

test('buildStructuralFlowGraph packs symbol dots more compactly in minimal mode than detailed mode', () => {
  const minimal = buildStructuralFlowGraph(nodes, edges, {
    displayMode: 'minimal',
    showSymbols: true,
    showImportEdges: false,
    selectedNodeId: null,
    highlightedIds: new Set(),
    collapsedIds: new Set(),
  });
  const detailed = buildStructuralFlowGraph(nodes, edges, {
    displayMode: 'detailed',
    showSymbols: true,
    showImportEdges: false,
    selectedNodeId: null,
    highlightedIds: new Set(),
    collapsedIds: new Set(),
  });

  const minSyms = minimal.nodes.filter((n) => n.data.record.type === 'symbol');
  const detSyms = detailed.nodes.filter((n) => n.data.record.type === 'symbol');
  const minSpan = Math.max(...minSyms.map((s) => s.position.x)) - Math.min(...minSyms.map((s) => s.position.x));
  const detSpan = Math.max(...detSyms.map((s) => s.position.x)) - Math.min(...detSyms.map((s) => s.position.x));

  assert.ok(minSpan < detSpan, `Expected minimal span (${minSpan}) < detailed span (${detSpan})`);
});

test('buildStructuralFlowGraph animates active paths and live transfer edges', () => {
  const active = buildStructuralFlowGraph(nodes, edges, {
    displayMode: 'hybrid',
    showSymbols: true,
    showImportEdges: false,
    selectedNodeId: null,
    highlightedIds: new Set(),
    collapsedIds: new Set(),
    activeNodeActivities: new Map([['file1', 'edit']]),
    liveTransfers: [{ id: 'tr1', fromNodeId: 'src', toNodeId: 'file1', action: 'move', label: 'movido' }],
  });

  const srcNode = active.nodes.find((n) => n.id === 'src')!;
  const fileNode = active.nodes.find((n) => n.id === 'file1')!;
  assert.equal(srcNode.data.activityKind, 'edit');
  assert.equal(fileNode.data.activityKind, 'edit');

  const animatedContains = active.edges.find((e) => e.source === 'src' && e.target === 'file1' && e.id === 'e2')!;
  assert.equal(animatedContains.animated, true);

  const transferEdge = active.edges.find((e) => e.id === 'live:tr1')!;
  assert.equal(transferEdge.type, 'dashedRelation');
  assert.equal(transferEdge.animated, true);
  assert.equal((transferEdge.data as { shortTag?: string })?.shortTag, 'movido');
});

test('buildStructuralFlowGraph supports capsules mode and propagates nodeTheme', () => {
  const capGraph = buildStructuralFlowGraph(nodes, edges, {
    displayMode: 'capsules',
    nodeTheme: 'neon',
    showSymbols: true,
    showImportEdges: false,
    selectedNodeId: null,
    highlightedIds: new Set(),
    collapsedIds: new Set(),
  });

  const fileNode = capGraph.nodes.find((n) => n.id === 'file1')!;
  assert.equal(fileNode.data.displayMode, 'capsules');
  assert.equal(fileNode.data.nodeTheme, 'neon');
});
