import type Database from 'better-sqlite3';
import type { ChatEdgeRecord, ChatNodeRecord } from '../types/chatGraph';
import { sanitizeFtsQuery } from './client';

interface ChatNodeRow {
  id: string;
  session_id: string;
  content: string;
  timestamp: number;
  topic_cluster: string;
  x_pos: number;
  y_pos: number;
  is_isolated: number;
  embedding_json: string | null;
}

interface ChatEdgeRow {
  id: string;
  source_id: string;
  target_id: string;
  similarity_score: number;
  connection_reason: ChatEdgeRecord['connectionReason'];
}

function mapChatNode(row: ChatNodeRow): ChatNodeRecord {
  let embedding: number[] | null = null;
  if (row.embedding_json) {
    try {
      embedding = JSON.parse(row.embedding_json) as number[];
    } catch {
      embedding = null;
    }
  }
  return {
    id: row.id,
    sessionId: row.session_id,
    content: row.content,
    timestamp: row.timestamp,
    topicCluster: row.topic_cluster,
    xPos: row.x_pos,
    yPos: row.y_pos,
    isIsolated: row.is_isolated === 1,
    embedding,
  };
}

function mapChatEdge(row: ChatEdgeRow): ChatEdgeRecord {
  return {
    id: row.id,
    sourceId: row.source_id,
    targetId: row.target_id,
    similarityScore: row.similarity_score,
    connectionReason: row.connection_reason,
  };
}

export class ChatGraphRepository {
  constructor(private readonly db: Database.Database) {}

  listNodes(): ChatNodeRecord[] {
    const rows = this.db
      .prepare('SELECT id, session_id, content, timestamp, topic_cluster, x_pos, y_pos, is_isolated, embedding_json FROM chat_nodes ORDER BY timestamp ASC')
      .all() as ChatNodeRow[];
    return rows.map(mapChatNode);
  }

  listEdges(): ChatEdgeRecord[] {
    const rows = this.db
      .prepare('SELECT id, source_id, target_id, similarity_score, connection_reason FROM chat_edges')
      .all() as ChatEdgeRow[];
    return rows.map(mapChatEdge);
  }

  replaceAll(nodes: ChatNodeRecord[], edges: ChatEdgeRecord[]): void {
    const clearEdges = this.db.prepare('DELETE FROM chat_edges');
    const clearFts = this.db.prepare('DELETE FROM chat_nodes_fts');
    const clearNodes = this.db.prepare('DELETE FROM chat_nodes');

    const insertNode = this.db.prepare(`
      INSERT INTO chat_nodes (id, session_id, content, timestamp, topic_cluster, x_pos, y_pos, is_isolated, embedding_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertFts = this.db.prepare(`
      INSERT INTO chat_nodes_fts (node_id, content, topic_cluster)
      VALUES (?, ?, ?)
    `);
    const insertEdge = this.db.prepare(`
      INSERT INTO chat_edges (id, source_id, target_id, similarity_score, connection_reason)
      VALUES (?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      clearEdges.run();
      clearFts.run();
      clearNodes.run();

      for (const node of nodes) {
        insertNode.run(
          node.id,
          node.sessionId,
          node.content,
          node.timestamp,
          node.topicCluster,
          node.xPos,
          node.yPos,
          node.isIsolated ? 1 : 0,
          node.embedding ? JSON.stringify(node.embedding) : null
        );
        insertFts.run(node.id, node.content, node.topicCluster);
      }

      for (const edge of edges) {
        insertEdge.run(edge.id, edge.sourceId, edge.targetId, edge.similarityScore, edge.connectionReason);
      }
    });

    tx();
  }

  searchFts(rawQuery: string, limit = 40): ChatNodeRecord[] {
    const ftsQuery = sanitizeFtsQuery(rawQuery);
    if (!ftsQuery) {
      return [];
    }
    const rows = this.db
      .prepare(`
        SELECT cn.id, cn.session_id, cn.content, cn.timestamp, cn.topic_cluster, cn.x_pos, cn.y_pos, cn.is_isolated, cn.embedding_json
        FROM chat_nodes_fts fts
        JOIN chat_nodes cn ON cn.id = fts.node_id
        WHERE chat_nodes_fts MATCH ?
        ORDER BY bm25(chat_nodes_fts) ASC
        LIMIT ?
      `)
      .all(ftsQuery, limit) as ChatNodeRow[];
    return rows.map(mapChatNode);
  }
}
