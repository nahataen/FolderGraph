import type { FileNodeRecord } from '../../types/indexer';
import type { ActivityKind, AgentActivityEvent } from '../../types/protocol';
import type { LiveTransferEdge } from './activityEdges';

function getParentPosixDir(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/').replace(/\/+$/, '');
  const idx = normalized.lastIndexOf('/');
  return idx > 0 ? normalized.slice(0, idx) : '';
}

export interface TimelineChangeEntry {
  id: string;
  timestamp: number;
  action: ActivityKind;
  label: string;
  actor: 'agent' | 'fs' | 'user';
  nodeId?: string;
  fallbackFolderId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  filePath?: string;
  lines?: number;
  source: 'live' | 'fs';
}

export function buildChangeTimeline(
  activities: AgentActivityEvent[],
  rawNodes: FileNodeRecord[],
  maxEntries = 36
): TimelineChangeEntry[] {
  const nodeById = new Map(rawNodes.map((n) => [n.id, n]));
  const nodeByPath = new Map(rawNodes.map((n) => [n.path, n]));

  const resolveFolderFallback = (filePath?: string): string | undefined => {
    if (!filePath) return undefined;
    let parent = getParentPosixDir(filePath);
    while (parent) {
      const hit = nodeByPath.get(parent);
      if (hit) return hit.id;
      const next = getParentPosixDir(parent);
      if (next === parent) break;
      parent = next;
    }
    return undefined;
  };

  const entries: TimelineChangeEntry[] = [];

  for (const act of activities) {
    const matchedNode =
      (act.nodeId ? nodeById.get(act.nodeId) : undefined) ??
      (act.filePath ? nodeByPath.get(act.filePath.replace(/\\/g, '/')) : undefined);
    entries.push({
      id: act.id,
      timestamp: act.timestamp,
      action: act.action,
      label: act.label,
      actor: act.actor,
      nodeId: matchedNode?.id,
      fallbackFolderId: matchedNode ? undefined : resolveFolderFallback(act.filePath),
      fromNodeId: act.fromNodeId && nodeById.has(act.fromNodeId) ? act.fromNodeId : undefined,
      toNodeId: act.toNodeId && nodeById.has(act.toNodeId) ? act.toNodeId : undefined,
      filePath: act.filePath ?? matchedNode?.path,
      lines: matchedNode?.metadata.lines,
      source: 'live',
    });
  }

  const fileNodes = rawNodes
    .filter((n) => n.type === 'file')
    .sort((a, b) => (b.metadata.modifiedAt ?? b.updatedAt) - (a.metadata.modifiedAt ?? a.updatedAt))
    .slice(0, maxEntries);

  for (const file of fileNodes) {
    const modTs = file.metadata.modifiedAt ?? file.updatedAt;
    const creTs = file.metadata.createdAt;
    const alreadyCovered = entries.some(
      (e) => e.nodeId === file.id && Math.abs(e.timestamp - modTs) <= 3000
    );
    if (alreadyCovered) continue;

    const isFreshCreate = Boolean(creTs && Math.abs(modTs - creTs) <= 2000);
    entries.push({
      id: `fs:${file.id}:${modTs}`,
      timestamp: modTs,
      action: isFreshCreate ? 'create' : 'edit',
      label: `${isFreshCreate ? 'Creado' : 'Modificado'} ${file.name}`,
      actor: 'fs',
      nodeId: file.id,
      filePath: file.path,
      lines: file.metadata.lines,
      source: 'fs',
    });
  }

  entries.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  if (entries.length > maxEntries) {
    return entries.slice(entries.length - maxEntries);
  }
  return entries;
}

export function buildScrubOverlay(
  entry: TimelineChangeEntry | null,
  rawNodes: FileNodeRecord[],
  baseCollapsedIds: Set<string>,
  baseActiveActivities?: Map<string, ActivityKind>,
  baseTransfers?: LiveTransferEdge[]
): {
  effectiveCollapsedIds: Set<string>;
  effectiveActiveActivities: Map<string, ActivityKind>;
  effectiveTransfers: LiveTransferEdge[];
  focusNodeId: string | null;
} {
  if (!entry) {
    return {
      effectiveCollapsedIds: baseCollapsedIds,
      effectiveActiveActivities: baseActiveActivities ?? new Map(),
      effectiveTransfers: baseTransfers ?? [],
      focusNodeId: null,
    };
  }

  const effectiveActiveActivities = new Map<string, ActivityKind>();
  const targetId = entry.toNodeId ?? entry.nodeId ?? entry.fallbackFolderId;
  if (targetId) {
    effectiveActiveActivities.set(targetId, entry.action);
  }
  if (entry.fromNodeId && entry.fromNodeId !== targetId) {
    effectiveActiveActivities.set(entry.fromNodeId, entry.action);
  }

  const effectiveTransfers: LiveTransferEdge[] =
    entry.fromNodeId && entry.toNodeId && entry.fromNodeId !== entry.toNodeId
      ? [
          {
            id: `scrub:${entry.id}`,
            fromNodeId: entry.fromNodeId,
            toNodeId: entry.toNodeId,
            action: entry.action,
            label: entry.action === 'move' ? 'movido' : 'cambio',
          },
        ]
      : [];

  const effectiveCollapsedIds = new Set(baseCollapsedIds);
  if (targetId && effectiveCollapsedIds.size > 0) {
    const byId = new Map(rawNodes.map((n) => [n.id, n]));
    let curr = byId.get(targetId)?.parentId ?? null;
    const guard = new Set<string>();
    while (curr && !guard.has(curr)) {
      guard.add(curr);
      effectiveCollapsedIds.delete(curr);
      curr = byId.get(curr)?.parentId ?? null;
    }
  }

  return {
    effectiveCollapsedIds,
    effectiveActiveActivities,
    effectiveTransfers,
    focusNodeId: targetId ?? null,
  };
}
