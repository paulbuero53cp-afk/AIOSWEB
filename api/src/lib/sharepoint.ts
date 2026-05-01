// ─────────────────────────────────────────────────────────────
//  AIOS — SharePoint List Operations via Microsoft Graph
//
//  Alle CRUD-Ops gehen gegen:
//  /sites/{siteId}/lists/{listName}/items
//
//  Strategie: List-Namen aus ENV, Site-ID gecacht nach erstem Call
// ─────────────────────────────────────────────────────────────

import { getGraphClient } from './graphClient';

// ── Site-ID Cache ─────────────────────────────────────────────
let _siteId: string | null = null;

async function getSiteId(): Promise<string> {
  if (_siteId) return _siteId;

  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  if (!siteUrl) throw new Error('SHAREPOINT_SITE_URL nicht konfiguriert');

  // Aus lokaler Env wenn bereits aufgelöst
  const cached = process.env.SHAREPOINT_SITE_ID;
  if (cached) { _siteId = cached; return cached; }

  // URL → hostname + path extrahieren
  const url = new URL(siteUrl);
  const hostname = url.hostname;
  const sitePath = url.pathname;                  // z.B. /sites/AIOS

  const client = getGraphClient();
  const result = await client
    .api(`/sites/${hostname}:${sitePath}`)
    .select('id')
    .get() as { id: string };

  _siteId = result.id;
  return _siteId;
}

// ── List-Namen aus ENV ────────────────────────────────────────
function listName(key: 'USECASES' | 'INCIDENTS' | 'ARTEFAKTE' | 'AUDITLOG' | 'CONFIG'): string {
  return process.env[`LIST_${key}`] ?? `AIOS_${key.charAt(0) + key.slice(1).toLowerCase()}`;
}

// ── Basis-URL für Liste ───────────────────────────────────────
async function listBase(listKey: Parameters<typeof listName>[0]): Promise<string> {
  const siteId = await getSiteId();
  return `/sites/${siteId}/lists/${listName(listKey)}/items`;
}

// ── Typen ─────────────────────────────────────────────────────
export interface SpItem {
  id: string;               // SP Item-ID (numerisch als String)
  fields: Record<string, unknown>;
}

export interface SpPageResult {
  value: SpItem[];
  '@odata.nextLink'?: string;
}

// ── CRUD ──────────────────────────────────────────────────────

/** Alle Items einer Liste lesen (alle Seiten) */
export async function listItems(
  listKey: Parameters<typeof listName>[0],
  filter?: string,
  select?: string[],
  top = 999,
): Promise<SpItem[]> {
  const client = getGraphClient();
  const base = await listBase(listKey);

  let url = `${base}?$expand=fields&$top=${top}`;
  if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
  if (select?.length) url += `&$select=${select.join(',')}`;

  const allItems: SpItem[] = [];
  let nextUrl: string | undefined = url;

  while (nextUrl) {
    const page = await client.api(nextUrl).get() as SpPageResult;
    allItems.push(...(page.value ?? []));
    nextUrl = page['@odata.nextLink'];
  }

  return allItems;
}

/** Einzelnes Item per SP-Item-ID */
export async function getItem(
  listKey: Parameters<typeof listName>[0],
  spId: string,
): Promise<SpItem> {
  const client = getGraphClient();
  const base = await listBase(listKey);
  return client.api(`${base}/${spId}?$expand=fields`).get() as Promise<SpItem>;
}

/** Neues Item erstellen */
export async function createItem(
  listKey: Parameters<typeof listName>[0],
  fields: Record<string, unknown>,
): Promise<SpItem> {
  const client = getGraphClient();
  const base = await listBase(listKey);
  return client.api(base).post({ fields }) as Promise<SpItem>;
}

/** Item-Felder aktualisieren (PATCH) */
export async function updateItem(
  listKey: Parameters<typeof listName>[0],
  spId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const client = getGraphClient();
  const base = await listBase(listKey);
  await client.api(`${base}/${spId}/fields`).patch(fields);
}

/** Item löschen */
export async function deleteItem(
  listKey: Parameters<typeof listName>[0],
  spId: string,
): Promise<void> {
  const client = getGraphClient();
  const base = await listBase(listKey);
  await client.api(`${base}/${spId}`).delete();
}

/** Item per Filter suchen (erstes Ergebnis) */
export async function findItem(
  listKey: Parameters<typeof listName>[0],
  filter: string,
): Promise<SpItem | null> {
  const items = await listItems(listKey, filter, undefined, 1);
  return items[0] ?? null;
}
