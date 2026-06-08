// ─────────────────────────────────────────────────────────────
//  AIOS — Storage Adapter
//
//  USE_LOCAL_DB=true  → SQLite (localdb.ts)
//  USE_LOCAL_DB=false → SharePoint via Graph (sharepoint.ts)
//
//  Umschalten: nur ENV-Variable ändern, kein Code-Change nötig
// ─────────────────────────────────────────────────────────────

import type * as SP from './sharepoint';

type Backend = typeof SP;

// Dynamic require — lädt nur das relevante Modul zur Laufzeit
// eslint-disable-next-line @typescript-eslint/no-var-requires
const _b: Backend = process.env['USE_LOCAL_DB'] === 'true'
  ? require('./localdb')  as Backend
  : require('./sharepoint') as Backend;

export type { SpItem, SpPageResult } from './sharepoint';
export { odataEscape } from './sharepoint';

export const listItems  = _b.listItems;
export const getItem    = _b.getItem;
export const createItem = _b.createItem;
export const updateItem = _b.updateItem;
export const deleteItem = _b.deleteItem;
export const findItem   = _b.findItem;
