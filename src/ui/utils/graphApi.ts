import type { FileEdgeRecord, FileNodeRecord, WorkspaceRecord } from '../../types/indexer';

export async function fetchGraphData(workspaceId: string): Promise<{
  workspaces: WorkspaceRecord[];
  nodes: FileNodeRecord[];
  edges: FileEdgeRecord[];
}> {
  const res = await fetch(`/api/graph?workspaceId=${encodeURIComponent(workspaceId)}`);
  if (!res.ok) throw new Error('Error al cargar el grafo estructural.');
  return (await res.json()) as {
    workspaces: WorkspaceRecord[];
    nodes: FileNodeRecord[];
    edges: FileEdgeRecord[];
  };
}

export async function searchGraphNodes(query: string): Promise<FileNodeRecord[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { nodes: FileNodeRecord[] };
  return data.nodes;
}

export async function createWorkspaceRequest(rootPath: string): Promise<void> {
  const res = await fetch('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rootPath }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error || 'No se pudo indexar la carpeta.');
}

export async function rescanWorkspaceRequest(id: string): Promise<void> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(id)}/rescan`, { method: 'POST' });
  if (!res.ok) throw new Error('Error al re-escanear la carpeta.');
}

export async function deleteWorkspaceRequest(id: string): Promise<void> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar workspace.');
}

export async function copyCompactContextRequest(
  workspaceId: string,
  rootNodeId?: string
): Promise<number> {
  const params = new URLSearchParams({ workspaceId, notify: '1' });
  if (rootNodeId) params.set('rootNodeId', rootNodeId);
  const res = await fetch(`/api/agent/context?${params.toString()}`);
  if (!res.ok) return 0;
  const data = (await res.json()) as { summaryText: string; estimatedTokensSaved: number };
  if (navigator.clipboard?.writeText) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(data.summaryText),
        new Promise<void>((resolve) => setTimeout(resolve, 250)),
      ]);
    } catch {
      // Clipboard write may be blocked inside sandboxed iframes
    }
  }
  return data.estimatedTokensSaved;
}
