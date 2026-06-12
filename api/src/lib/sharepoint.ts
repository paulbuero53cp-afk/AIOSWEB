// ─────────────────────────────────────────────────────────────
//  AIOS — SharePoint List Operations via Microsoft Graph
//
//  Alle CRUD-Ops gehen gegen:
//  /sites/{siteId}/lists/{listName}/items
//
//  Strategie: List-Namen aus ENV, Site-ID gecacht nach erstem Call
// ─────────────────────────────────────────────────────────────

import { getGraphClient } from './graphClient';

/**
 * Escaped einen Wert für die Verwendung in einem OData-String-Literal
 * (`fields/X eq '<wert>'`). Single-Quotes werden verdoppelt — verhindert
 * Filter-Injection über Pfad-/Query-Parameter (F15).
 */
export function odataEscape(v: string): string {
  return v.replace(/'/g, "''");
}

// ── SharePoint-Feldnamen-Übersetzung ──────────────────────────
// SP kodiert Spaltennamen die mit zwei Großbuchstaben beginnen:
// GT→_x0047_T, SB→_x0053_B, MC→_x004d_C
const SP_FIELD_MAP: Record<string, string> = {
  GT01: '_x0047_T01', GT02: '_x0047_T02', GT03: '_x0047_T03', GT04: '_x0047_T04',
  SB01: '_x0053_B01', SB02: '_x0053_B02', SB03: '_x0053_B03', SB04: '_x0053_B04',
  MC01: '_x004d_C01', MC02: '_x004d_C02', MC03: '_x004d_C03', MC04: '_x004d_C04',
  MC05: '_x004d_C05', MC06: '_x004d_C06', MC07: '_x004d_C07',
};
const SP_FIELD_MAP_REV: Record<string, string> =
  Object.fromEntries(Object.entries(SP_FIELD_MAP).map(([k, v]) => [v, k]));

function toSp(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[SP_FIELD_MAP[k] ?? k] = v;
  return out;
}
function fromSp(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[SP_FIELD_MAP_REV[k] ?? k] = v;
  return out;
}

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
function listName(key: 'USECASES' | 'INCIDENTS' | 'ARTEFAKTE' | 'AUDITLOG' | 'CONFIG' | 'USERS'): string {
  if (key === 'USERS') return process.env['LIST_USERS'] ?? 'AIOS_Users';
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
    // Prefer-Header erlaubt Filtern auf nicht-indizierten Spalten (UCId, IncId, UCRef…)
    // Risiko: kann bei sehr großen Listen langsam werden — akzeptabel für AIOS-Größe
    const req = filter
      ? client.api(nextUrl).header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
      : client.api(nextUrl);
    const page = await req.get() as SpPageResult;
    // SP-kodierte Feldnamen zurückübersetzen (GT01 etc.)
    for (const item of (page.value ?? [])) {
      item.fields = fromSp(item.fields);
    }
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
  const item = await client.api(`${base}/${spId}?$expand=fields`).get() as SpItem;
  item.fields = fromSp(item.fields);
  return item;
}

// ── Feld-Fehler-Parser ────────────────────────────────────────
// Extrahiert Feldname aus "Field 'GT01' is not recognized" o.ä.
function extractUnknownField(err: unknown): string | null {
  const msg = (err as { message?: string })?.message ?? String(err);
  const m = msg.match(/Field\s+'?(\w+)'?\s+is not recognized/i)
           ?? msg.match(/column\s+'?(\w+)'?\s+does not exist/i);
  return m?.[1] ?? null;
}

// Erkennt Choice-Validierungsfehler (ungültiger Wert in einer Choice-Spalte).
// SP gibt "The value '...' is not valid for the field '...'" zurück.
function extractChoiceError(err: unknown): string | null {
  const msg = (err as { message?: string })?.message ?? String(err);
  const m = msg.match(/value\s+'?([^']+)'?\s+is not valid for (the )?field\s+'?(\w+)'?/i)
           ?? msg.match(/Ungültiger Wert/i);
  if (m) return msg;
  return null;
}

/** Neues Item erstellen — überspringt unbekannte SP-Felder automatisch */
export async function createItem(
  listKey: Parameters<typeof listName>[0],
  fields: Record<string, unknown>,
): Promise<SpItem> {
  const client = getGraphClient();
  const base = await listBase(listKey);
  const safe = toSp({ ...fields }); // GT01 → _x0047_T01 etc.

  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      return await client.api(base).post({ fields: safe }) as SpItem;
    } catch (err) {
      const bad = extractUnknownField(err);
      if (bad && bad in safe) { delete safe[bad]; continue; }
      const choiceErr = extractChoiceError(err);
      if (choiceErr) throw new Error(`SharePoint Choice-Validierung fehlgeschlagen: ${choiceErr}. Bitte Provisioning-Skript erneut ausführen.`);
      throw err;
    }
  }
  throw new Error('createItem: zu viele unbekannte Felder, abgebrochen');
}

/** Item-Felder aktualisieren (PATCH) — überspringt unbekannte SP-Felder automatisch */
export async function updateItem(
  listKey: Parameters<typeof listName>[0],
  spId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const client = getGraphClient();
  const base = await listBase(listKey);
  const safe = toSp({ ...fields }); // GT01 → _x0047_T01 etc.

  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await client.api(`${base}/${spId}/fields`).patch(safe);
      return;
    } catch (err) {
      const bad = extractUnknownField(err);
      if (bad && bad in safe) { delete safe[bad]; continue; }
      const choiceErr = extractChoiceError(err);
      if (choiceErr) throw new Error(`SharePoint Choice-Validierung fehlgeschlagen: ${choiceErr}. Bitte Provisioning-Skript erneut ausführen.`);
      throw err;
    }
  }
  throw new Error('updateItem: zu viele unbekannte Felder, abgebrochen');
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
