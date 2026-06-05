// ─────────────────────────────────────────────────────────────
//  AIOS — Lokale SQLite-Implementierung
//  Identische Schnittstelle wie sharepoint.ts — Drop-in-Ersatz
//
//  Filter: OData-Lite  →  fields/X eq 'Y' [and fields/Z eq 'W']
//  Nur einfache Equality-Filter nötig (entspricht SP-Nutzung im Code)
// ─────────────────────────────────────────────────────────────

import { getDb } from './db';
import type { SpItem, SpPageResult } from './sharepoint';

export type { SpItem, SpPageResult };

type ListKey = 'USECASES' | 'INCIDENTS' | 'ARTEFAKTE' | 'AUDITLOG' | 'CONFIG';

interface DbRow {
  sp_id:      string;
  fields:     string;
  created_at: string;
}

// ── Hilfsfunktionen ───────────────────────────────────────────

function rowToItem(row: DbRow): SpItem {
  let fields: Record<string, unknown> = {};
  try { fields = JSON.parse(row.fields) as Record<string, unknown>; } catch { /* */ }
  return { id: row.sp_id, fields };
}

/** Parst "fields/X eq 'Y' and fields/Z eq 'W'" */
function parseFilter(filter: string): Array<{ field: string; value: string }> {
  return filter.split(/ and /i).flatMap(part => {
    const m = part.trim().match(/^fields\/(\w+)\s+eq\s+'([^']*)'$/);
    return m ? [{ field: m[1], value: m[2] }] : [];
  });
}

function matchesFilter(
  fields: Record<string, unknown>,
  conditions: Array<{ field: string; value: string }>,
): boolean {
  return conditions.every(c => String(fields[c.field] ?? '') === c.value);
}

function newSpId(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

// ── CRUD ──────────────────────────────────────────────────────

export async function listItems(
  listKey: ListKey,
  filter?: string,
  _select?: string[],
  top = 999,
): Promise<SpItem[]> {
  // IMPORTANT: fetch ALL rows first, apply JS filter, THEN slice.
  // Applying LIMIT in SQL before JS-filtering would break findItem (top=1).
  const rows = getDb()
    .prepare('SELECT sp_id, fields, created_at FROM items WHERE list_name = ?')
    .all(listKey) as DbRow[];

  let items = rows.map(rowToItem);
  if (filter) {
    const conds = parseFilter(filter);
    items = items.filter(i => matchesFilter(i.fields as Record<string, unknown>, conds));
  }
  return items.slice(0, top);
}

export async function getItem(listKey: ListKey, spId: string): Promise<SpItem> {
  const row = getDb()
    .prepare('SELECT sp_id, fields, created_at FROM items WHERE list_name = ? AND sp_id = ?')
    .get(listKey, spId) as DbRow | undefined;

  if (!row) throw new Error(`Item ${spId} nicht gefunden in ${listKey}`);
  return rowToItem(row);
}

export async function createItem(
  listKey: ListKey,
  fields: Record<string, unknown>,
): Promise<SpItem> {
  const spId = newSpId();
  const now  = new Date().toISOString();
  const f    = { ...fields, Created: now, Modified: now };

  getDb()
    .prepare('INSERT INTO items (list_name, sp_id, fields) VALUES (?, ?, ?)')
    .run(listKey, spId, JSON.stringify(f));

  return { id: spId, fields: f };
}

export async function updateItem(
  listKey: ListKey,
  spId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const row = getDb()
    .prepare('SELECT fields FROM items WHERE list_name = ? AND sp_id = ?')
    .get(listKey, spId) as { fields: string } | undefined;

  if (!row) throw new Error(`Item ${spId} nicht gefunden in ${listKey}`);

  const existing = JSON.parse(row.fields) as Record<string, unknown>;
  const updated  = { ...existing, ...fields, Modified: new Date().toISOString() };

  getDb()
    .prepare('UPDATE items SET fields = ? WHERE list_name = ? AND sp_id = ?')
    .run(JSON.stringify(updated), listKey, spId);
}

export async function deleteItem(listKey: ListKey, spId: string): Promise<void> {
  getDb()
    .prepare('DELETE FROM items WHERE list_name = ? AND sp_id = ?')
    .run(listKey, spId);
}

export async function findItem(listKey: ListKey, filter: string): Promise<SpItem | null> {
  const items = await listItems(listKey, filter, undefined, 1);
  return items[0] ?? null;
}
