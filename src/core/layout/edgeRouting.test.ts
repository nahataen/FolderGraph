import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRoundedPolylinePath,
  computeDashedLaneGeometry,
  computeSpanBaseOffset,
  computeTreeBusPath,
  type EdgeNodeBound,
} from './edgeRouting';
import { buildStructuralEdges } from './activityEdges';
import type { FileEdgeRecord, FileNodeRecord } from '../../types/indexer';

test('buildRoundedPolylinePath produces smooth SVG M/L/Q path', () => {
  const path = buildRoundedPolylinePath([
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 200, y: 100 },
    { x: 200, y: 0 },
  ]);
  assert.ok(path.startsWith('M 0 0'));
  assert.ok(path.includes('Q '));
  assert.ok(path.endsWith('L 200.0 0.0'));
});

test('computeTreeBusPath aligns sibling horizontal buses at a uniform drop height', () => {
  const pathA = computeTreeBusPath({ sourceX: 400, sourceY: 100, targetX: 180, targetY: 220, busDrop: 28 });
  const pathB = computeTreeBusPath({ sourceX: 400, sourceY: 100, targetX: 560, targetY: 238, busDrop: 28 });
  assert.ok(pathA.includes('128.0'));
  assert.ok(pathB.includes('128.0'));
});

test('computeDashedLaneGeometry separates horizontal lanes and keeps labels inset from vertical legs', () => {
  const lane0 = computeDashedLaneGeometry({
    sourceX: 100,
    sourceY: 200,
    targetX: 340,
    targetY: 200,
    laneIndex: 0,
    baseOffset: 60,
  });
  const lane1 = computeDashedLaneGeometry({
    sourceX: 100,
    sourceY: 200,
    targetX: 460,
    targetY: 200,
    laneIndex: 1,
    baseOffset: 60,
  });

  assert.equal(lane0.labelY, 260);
  assert.equal(lane1.labelY, 288);
  assert.notEqual(lane0.labelY, lane1.labelY);
  assert.ok(lane0.labelX >= 154 && lane0.labelX <= 260, `Expected labelX clear of vertical legs: ${lane0.labelX}`);
});

test('computeDashedLaneGeometry routes vertical entry outside target and obstacle bounds', () => {
  const obstacles: EdgeNodeBound[] = [
    { id: 'src', left: 350, right: 450, top: 180, bottom: 234 },
    { id: 'dst', left: 150, right: 250, top: 180, bottom: 234 },
    { id: 'mid', left: 265, right: 335, top: 180, bottom: 234 },
  ];
  const res = computeDashedLaneGeometry({
    sourceId: 'src',
    targetId: 'dst',
    sourceX: 400,
    sourceY: 234,
    targetX: 200,
    targetY: 180,
    targetHalfW: 50,
    laneIndex: 0,
    baseOffset: 60,
    obstacles,
  });
  assert.ok(!res.path.includes('224.0') && !res.path.includes('176.0'), `Expected path outside target node box: ${res.path}`);
});

test('buildStructuralEdges fans active orange/green dashed lines cleanly onto distinct ports and corridors', () => {
  const mkFile = (id: string, name: string): FileNodeRecord => ({
    id,
    parentId: 'root',
    path: `/src/${name}`,
    name,
    type: 'file',
    sizeWeight: 1,
    metadata: { depth: 1, workspaceId: 'ws' },
    updatedAt: Date.now(),
  });
  const nodes: FileNodeRecord[] = [
    mkFile('a', 'repoA.ts'),
    mkFile('b', 'repoB.ts'),
    mkFile('c', 'repoC.ts'),
    mkFile('dst', 'client.ts'),
  ];
  const edges: FileEdgeRecord[] = [
    { id: 'e1', sourceId: 'a', targetId: 'dst', relationType: 'imports' },
    { id: 'e2', sourceId: 'b', targetId: 'dst', relationType: 'imports' },
    { id: 'e3', sourceId: 'c', targetId: 'dst', relationType: 'imports' },
  ];
  const bounds = new Map<string, EdgeNodeBound>([
    ['a', { id: 'a', left: 60, right: 140, top: 200, bottom: 254 }],
    ['b', { id: 'b', left: 200, right: 280, top: 200, bottom: 254 }],
    ['c', { id: 'c', left: 620, right: 700, top: 200, bottom: 254 }],
    ['dst', { id: 'dst', left: 420, right: 500, top: 200, bottom: 254 }],
  ]);

  const built = buildStructuralEdges(edges, nodes, {
    selectedNodeId: null,
    showImportEdges: false,
    activeMap: new Map([['dst', 'edit']]),
    nodeBounds: bounds,
  });

  assert.equal(built.length, 3);
  const offsets = built.map((e) => Number(e.data?.targetOffsetX));
  const corridors = built.map((e) => Number(e.data?.fixedCorridorX));
  assert.equal(new Set(offsets).size, 3);
  assert.ok(offsets[0] < offsets[1] && offsets[1] < offsets[2], `Expected monotonic left-to-right fan-in: ${offsets}`);
  for (let i = 0; i < corridors.length; i++) {
    for (let j = i + 1; j < corridors.length; j++) {
      assert.ok(Math.abs(corridors[i] - corridors[j]) >= 17, `Corridors too close: ${corridors}`);
    }
  }
});

test('computeSpanBaseOffset clears symbol clouds underneath file rows', () => {
  const bounds = new Map<string, EdgeNodeBound>([
    ['f1', { id: 'f1', left: 50, right: 150, top: 100, bottom: 140 }],
    ['sym1', { id: 'sym1', left: 60, right: 140, top: 170, bottom: 230 }],
    ['f2', { id: 'f2', left: 250, right: 350, top: 100, bottom: 140 }],
  ]);

  const offset = computeSpanBaseOffset('f1', 'f2', bounds);
  assert.equal(offset, 118);
});
