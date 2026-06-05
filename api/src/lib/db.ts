// ─────────────────────────────────────────────────────────────
//  AIOS — SQLite Connection
//  Datei liegt in api/data/aios.db (per LOCAL_DB_PATH überschreibbar)
// ─────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbDir  = process.env.LOCAL_DB_PATH ?? path.join(process.cwd(), 'data');
  const dbFile = path.join(dbDir, 'aios.db');
  fs.mkdirSync(dbDir, { recursive: true });

  _db = new Database(dbFile);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      list_name  TEXT    NOT NULL,
      sp_id      TEXT    NOT NULL UNIQUE,
      fields     TEXT    NOT NULL DEFAULT '{}',
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_items_list  ON items(list_name);
    CREATE INDEX IF NOT EXISTS idx_items_sp_id ON items(sp_id);
  `);

  return _db;
}
