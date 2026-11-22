import type Database from 'better-sqlite3';
import type { FileEdgeRecord, FileNodeMetadata, FileNodeRecord, NodeKind } from '../types/indexer';
import { sanitizeFtsQuery } from './client';

interface FileNodeRow {
  id: string;
  parent_id: string | null;
  path: string;
  name: string;
  type: NodeKind;
  size_weight: number;
  metadata_json: string;
  updated_at: number;
}

interface FileEdgeRow {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: FileEdgeRecord['relationType'];
}

function mapNodeRow(row: FileNodeRow): FileNodeRecord {
  let parsedMeta: FileNodeMetadata = { depth: 0, workspaceId: '' };
  try {
    parsedMeta = JSON.parse(row.metadata_json) as FileNodeMetadata;
  } catch {
    parsedMeta = { depth: 0, workspaceId: '' };
  }
  return {
    id: row.id,
    parentId: row.parent_id,
    path: row.path,
    name: row.name,
    type: row.type,
    sizeWeight: row.size_weight,
    metadata: parsedMeta,
    updatedAt: row.updated_at,
  };
}

function mapEdgeRow(row: FileEdgeRow): FileEdgeRecord {
  return {
    id: row.id,
    sourceId: row.source_id,
    targetId: row.target_id,
    relationType: row.relation_type,
  };
}

export class FileGraphRepository {
  constructor(private readonly db: Database.Database) {}

  listNodes(workspaceId?: string): FileNodeRecord[] {
    const rows = this.db
      .prepare('SELECT id, parent_id, path, name, type, size_weight, metadata_json, updated_at FROM file_nodes ORDER BY path ASC')
      .all() as FileNodeRow[];
    const mapped = rows.map(mapNodeRow);
    return workspaceId ? mapped.filter((node) => node.metadata.workspaceId === workspaceId) : mapped;
  }

  listEdges(nodeIds?: Set<string>): FileEdgeRecord[] {
    const rows = this.db
      .prepare('SELECT id, source_id, target_id, relation_type FROM file_edges')
      .all() as FileEdgeRow[];
    const mapped = rows.map(mapEdgeRow);
    if (!nodeIds) {
      return mapped;
    }
    return mapped.filter((edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId));
  }

  replaceWorkspaceGraph(workspaceId: string, nodes: FileNodeRecord[], edges: FileEdgeRecord[]): void {
    const existingNodes = this.listNodes(workspaceId);
    const deleteNodeStmt = this.db.prepare('DELETE FROM file_nodes WHERE id = ?');
    const deleteFtsStmt = this.db.prepare('DELETE FROM file_nodes_fts WHERE node_id = ?');
    const upsertNodeStmt = this.db.prepare(`
      INSERT INTO file_nodes (id, parent_id, path, name, type, size_weight, metadata_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        parent_id = excluded.parent_id,
        path = excluded.path,
        name = excluded.name,
        type = excluded.type,
        size_weight = excluded.size_weight,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
    `);
    const insertFtsStmt = this.db.prepare(`
      INSERT INTO file_nodes_fts (node_id, name, path, metadata_text)
      VALUES (?, ?, ?, ?)
    `);
    const upsertEdgeStmt = this.db.prepare(`
      INSERT INTO file_edges (id, source_id, target_id, relation_type)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        source_id = excluded.source_id,
        target_id = excluded.target_id,
        relation_type = excluded.relation_type
    `);

    const tx = this.db.transaction(() => {
      for (const oldNode of existingNodes) {
        deleteFtsStmt.run(oldNode.id);
        deleteNodeStmt.run(oldNode.id);
      }

      for (const node of nodes) {
        const metaJson = JSON.stringify(node.metadata);
        const searchMeta = [
          node.metadata.extension ?? '',
          ...(node.metadata.imports ?? []),
          ...(node.metadata.exports ?? []),
          node.metadata.symbolKind ?? '',
        ].join(' ');
        upsertNodeStmt.run(
          node.id,
          node.parentId,
          node.path,
          node.name,
          node.type,
          node.sizeWeight,
          metaJson,
          node.updatedAt
        );
        insertFtsStmt.run(node.id, node.name, node.path, searchMeta);
      }

      for (const edge of edges) {
        upsertEdgeStmt.run(edge.id, edge.sourceId, edge.targetId, edge.relationType);
      }
    });

    tx();
  }

  deleteByPathPrefix(pathPrefix: string): void {
    const normalized = pathPrefix.replace(/\\/g, '/');
    const allNodes = this.listNodes();
    const toDelete = allNodes.filter(
      (n) => n.path === normalized || n.path.startsWith(`${normalized}/`) || n.path.startsWith(`${normalized}#`)
    );
    const deleteNodeStmt = this.db.prepare('DELETE FROM file_nodes WHERE id = ?');
    const deleteFtsStmt = this.db.prepare('DELETE FROM file_nodes_fts WHERE node_id = ?');

    const tx = this.db.transaction(() => {
      for (const node of toDelete) {
        deleteFtsStmt.run(node.id);
        deleteNodeStmt.run(node.id);
      }
    });
    tx();
  }

  upsertSubgraph(nodes: FileNodeRecord[], edges: FileEdgeRecord[]): void {
    const upsertNodeStmt = this.db.prepare(`
      INSERT INTO file_nodes (id, parent_id, path, name, type, size_weight, metadata_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        parent_id = excluded.parent_id,
        path = excluded.path,
        name = excluded.name,
        type = excluded.type,
        size_weight = excluded.size_weight,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
    `);
    const deleteFtsStmt = this.db.prepare('DELETE FROM file_nodes_fts WHERE node_id = ?');
    const insertFtsStmt = this.db.prepare(`
      INSERT INTO file_nodes_fts (node_id, name, path, metadata_text)
      VALUES (?, ?, ?, ?)
    `);
    const upsertEdgeStmt = this.db.prepare(`
      INSERT INTO file_edges (id, source_id, target_id, relation_type)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        source_id = excluded.source_id,
        target_id = excluded.target_id,
        relation_type = excluded.relation_type
    `);

    const tx = this.db.transaction(() => {
      for (const node of nodes) {
        const metaJson = JSON.stringify(node.metadata);
        const searchMeta = [
          node.metadata.extension ?? '',
          ...(node.metadata.imports ?? []),
          ...(node.metadata.exports ?? []),
          node.metadata.symbolKind ?? '',
        ].join(' ');
        upsertNodeStmt.run(
          node.id,
          node.parentId,
          node.path,
          node.name,
          node.type,
          node.sizeWeight,
          metaJson,
          node.updatedAt
        );
        deleteFtsStmt.run(node.id);
        insertFtsStmt.run(node.id, node.name, node.path, searchMeta);
      }
      for (const edge of edges) {
        upsertEdgeStmt.run(edge.id, edge.sourceId, edge.targetId, edge.relationType);
      }
    });
    tx();
  }

  searchFts(rawQuery: string, limit = 60): FileNodeRecord[] {
    const ftsQuery = sanitizeFtsQuery(rawQuery);
    if (!ftsQuery) {
      return [];
    }
    const rows = this.db
      .prepare(`
        SELECT fn.id, fn.parent_id, fn.path, fn.name, fn.type, fn.size_weight, fn.metadata_json, fn.updated_at
        FROM file_nodes_fts fts
        JOIN file_nodes fn ON fn.id = fts.node_id
        WHERE file_nodes_fts MATCH ?
        ORDER BY bm25(file_nodes_fts) ASC
        LIMIT ?
      `)
      .all(ftsQuery, limit) as FileNodeRow[];
    return rows.map(mapNodeRow);
  }
}
