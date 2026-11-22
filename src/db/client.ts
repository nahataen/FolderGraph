import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

let dbInstance: Database.Database | null = null;

export function createDatabase(dbPath: string): Database.Database {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(path.resolve(dbPath));
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initializeSchema(db);
  return db;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    const defaultPath = process.env.STRATAGRAPH_DB_PATH || path.resolve(process.cwd(), 'data', 'stratagraph.db');
    dbInstance = createDatabase(defaultPath);
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function sanitizeFtsQuery(rawQuery: string): string {
  const tokens = rawQuery
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-zA-Z0-9_\-./]/g, ''))
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return '';
  }
  return tokens.map((token) => `"${token}"*`).join(' ');
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      root_path TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      watcher_active INTEGER NOT NULL DEFAULT 1,
      last_scanned_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS file_nodes (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      path TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('folder', 'file', 'symbol')),
      size_weight REAL NOT NULL DEFAULT 1,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_file_nodes_parent ON file_nodes(parent_id);
    CREATE INDEX IF NOT EXISTS idx_file_nodes_path ON file_nodes(path);
    CREATE INDEX IF NOT EXISTS idx_file_nodes_type ON file_nodes(type);

    CREATE VIRTUAL TABLE IF NOT EXISTS file_nodes_fts USING fts5(
      node_id UNINDEXED,
      name,
      path,
      metadata_text
    );

    CREATE TABLE IF NOT EXISTS file_edges (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL CHECK (relation_type IN ('contains', 'imports', 'references')),
      FOREIGN KEY (source_id) REFERENCES file_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES file_nodes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_file_edges_source ON file_edges(source_id);
    CREATE INDEX IF NOT EXISTS idx_file_edges_target ON file_edges(target_id);

    CREATE TABLE IF NOT EXISTS chat_nodes (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      topic_cluster TEXT NOT NULL,
      x_pos REAL NOT NULL DEFAULT 0,
      y_pos REAL NOT NULL DEFAULT 0,
      is_isolated INTEGER NOT NULL DEFAULT 1,
      embedding_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_chat_nodes_session ON chat_nodes(session_id);
    CREATE INDEX IF NOT EXISTS idx_chat_nodes_topic ON chat_nodes(topic_cluster);

    CREATE VIRTUAL TABLE IF NOT EXISTS chat_nodes_fts USING fts5(
      node_id UNINDEXED,
      content,
      topic_cluster
    );

    CREATE TABLE IF NOT EXISTS chat_edges (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      similarity_score REAL NOT NULL DEFAULT 0,
      connection_reason TEXT NOT NULL CHECK (connection_reason IN ('keyword', 'entity', 'semantic')),
      FOREIGN KEY (source_id) REFERENCES chat_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES chat_nodes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_edges_source ON chat_edges(source_id);
    CREATE INDEX IF NOT EXISTS idx_chat_edges_target ON chat_edges(target_id);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}
