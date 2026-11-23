import test from 'node:test';
import assert from 'node:assert/strict';
import type { FileNodeRecord } from '../../types/indexer';
import type { AgentActivityEvent } from '../../types/protocol';
import { buildChangeTimeline, buildScrubOverlay } from './timelineScrubber';

const nodes: FileNodeRecord[] = [
  {
    id: 'root',
    parentId: null,
    path: '/repo',
    name: 'repo',
    type: 'folder',
    sizeWeight: 4,
    metadata: { depth: 0, isRoot: true, workspaceId: 'w1' },
    updatedAt: 1000,
  },
  {
    id: 'sub',
    parentId: 'root',
    path: '/repo/src',
    name: 'src',
    type: 'folder',
    sizeWeight: 2,
    metadata: { depth: 1, workspaceId: 'w1' },
    updatedAt: 2000,
  },
  {
    id: 'f1',
    parentId: 'sub',
    path: '/repo/src/a.ts',
    name: 'a.ts',
    type: 'file',
    sizeWeight: 1.4,
    metadata: { depth: 2, extension: '.ts', lines: 42, workspaceId: 'w1', createdAt: 1000, modifiedAt: 5000 },
    updatedAt: 5000,
  },
  {
    id: 'f2',
    parentId: 'sub',
    path: '/repo/src/b.ts',
    name: 'b.ts',
    type: 'file',
    sizeWeight: 1.4,
    metadata: { depth: 2, extension: '.ts', lines: 18, workspaceId: 'w1', createdAt: 8000, modifiedAt: 8500 },
    updatedAt: 8500,
  },
];

test('buildChangeTimeline sorts chronologically oldest-to-newest and deduplicates nearby FS entries', () => {
  const activities: AgentActivityEvent[] = [
    {
      id: 'act-1',
      actor: 'fs',
      action: 'edit',
      label: 'Editado a.ts',
      nodeId: 'f1',
      filePath: '/repo/src/a.ts',
      timestamp: 5500,
    },
    {
      id: 'act-del',
      actor: 'fs',
      action: 'delete',
      label: 'Eliminado old.ts',
      filePath: '/repo/src/old.ts',
      timestamp: 9500,
    },
  ];

  const entries = buildChangeTimeline(activities, nodes);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].id, 'act-1');
  assert.equal(entries[1].nodeId, 'f2');
  assert.equal(entries[1].action, 'create');
  assert.equal(entries[2].id, 'act-del');
  assert.equal(entries[2].fallbackFolderId, 'sub');
});

test('buildScrubOverlay highlights target node and temporarily uncollapses parent folders', () => {
  const entries = buildChangeTimeline([], nodes);
  const targetEntry = entries.find((e) => e.nodeId === 'f1')!;
  const overlay = buildScrubOverlay(targetEntry, nodes, new Set(['sub']));

  assert.equal(overlay.effectiveCollapsedIds.has('sub'), false);
  assert.equal(overlay.effectiveActiveActivities.get('f1'), 'edit');
  assert.equal(overlay.focusNodeId, 'f1');
});
