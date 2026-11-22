import type Database from 'better-sqlite3';
import type { WorkspaceRecord } from '../types/indexer';

interface WorkspaceRow {
  id: string;
  root_path: string;
  name: string;
  watcher_active: number;
  last_scanned_at: number;
}

function mapRow(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    rootPath: row.root_path,
    name: row.name,
    watcherActive: row.watcher_active === 1,
    lastScannedAt: row.last_scanned_at,
  };
}

export class WorkspaceRepository {
  constructor(private readonly db: Database.Database) {}

  listAll(): WorkspaceRecord[] {
    const rows = this.db
      .prepare('SELECT id, root_path, name, watcher_active, last_scanned_at FROM workspaces ORDER BY last_scanned_at DESC')
      .all() as WorkspaceRow[];
    return rows.map(mapRow);
  }

  getById(id: string): WorkspaceRecord | null {
    const row = this.db
      .prepare('SELECT id, root_path, name, watcher_active, last_scanned_at FROM workspaces WHERE id = ?')
      .get(id) as WorkspaceRow | undefined;
    return row ? mapRow(row) : null;
  }

  getByRootPath(rootPath: string): WorkspaceRecord | null {
    const row = this.db
      .prepare('SELECT id, root_path, name, watcher_active, last_scanned_at FROM workspaces WHERE root_path = ?')
      .get(rootPath) as WorkspaceRow | undefined;
    return row ? mapRow(row) : null;
  }

  upsert(record: WorkspaceRecord): void {
    this.db
      .prepare(`
        INSERT INTO workspaces (id, root_path, name, watcher_active, last_scanned_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          root_path = excluded.root_path,
          name = excluded.name,
          watcher_active = excluded.watcher_active,
          last_scanned_at = excluded.last_scanned_at
      `)
      .run(
        record.id,
        record.rootPath,
        record.name,
        record.watcherActive ? 1 : 0,
        record.lastScannedAt
      );
  }

  setWatcherActive(id: string, active: boolean): void {
    this.db
      .prepare('UPDATE workspaces SET watcher_active = ? WHERE id = ?')
      .run(active ? 1 : 0, id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
  }
}
