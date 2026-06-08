// ─────────────────────────────────────────────────────────────
//  AIOS — /api/artefakte
//
//  GET  /api/artefakte/{type}/{ucId}    → Artefakt laden
//  POST /api/artefakte/{type}/{ucId}    → Artefakt speichern
//  GET  /api/artefakte/all/{ucId}       → alle 4 Typen für ein UC
//  GET  /api/artefakte/export           → vollständiger JSON-Backup (Admin)
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth, requireRole, isAuthError } from '../lib/auth';
import { listItems, findItem, createItem, updateItem, odataEscape } from '../lib/storage';
import { serverError } from '../lib/http';
import { spToArtefakt, artefaktToSp, Artefakt } from '../lib/mappers';
import { writeAuditLog } from '../lib/audit';
import { MOCK_ARTEFAKTE } from '../lib/mockData';

const MOCK = process.env['USE_MOCK_DATA'] === 'true';

const VALID_TYPES = ['ra', 'gc', 'bc', 'dsfa'] as const;
type ArtType = typeof VALID_TYPES[number];

function isValidType(t: string): t is ArtType {
  return VALID_TYPES.includes(t as ArtType);
}

// ── GET Einzelartefakt ────────────────────────────────────────
async function handleGet(
  req: HttpRequest,
  type: ArtType,
  ucId: string,
): Promise<HttpResponseInit> {
  // F10: Artefakt-Inhalte (inkl. DSFA) nur für Editor+ — nicht für Viewer.
  const principal = requireRole(req, ['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  if (MOCK) {
    const payload = MOCK_ARTEFAKTE[ucId]?.[type] ?? {};
    return { status: 200, jsonBody: payload };
  }

  const item = await findItem(
    'ARTEFAKTE',
    `fields/UCId eq '${odataEscape(ucId)}' and fields/ArtType eq '${odataEscape(type)}'`,
  );

  if (!item) return { status: 200, jsonBody: {} }; // leer = noch nicht ausgefüllt

  const art = spToArtefakt(item.id, item.fields as Record<string, unknown>);
  return { status: 200, jsonBody: art.payload };
}

// ── GET alle 4 Typen eines UC ─────────────────────────────────
async function handleGetAll(
  req: HttpRequest,
  ucId: string,
): Promise<HttpResponseInit> {
  // F10: Artefakt-Inhalte (inkl. DSFA) nur für Editor+ — nicht für Viewer.
  const principal = requireRole(req, ['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  if (MOCK) {
    const uc = MOCK_ARTEFAKTE[ucId] ?? {};
    return { status: 200, jsonBody: { ra: uc['ra'] ?? {}, gc: uc['gc'] ?? {}, bc: uc['bc'] ?? {}, dsfa: uc['dsfa'] ?? {} } };
  }

  const items = await listItems('ARTEFAKTE', `fields/UCId eq '${odataEscape(ucId)}'`);
  const result: Record<string, unknown> = { ra: {}, gc: {}, bc: {}, dsfa: {} };

  for (const item of items) {
    const art = spToArtefakt(item.id, item.fields as Record<string, unknown>);
    if (isValidType(art.type)) result[art.type] = art.payload;
  }

  return { status: 200, jsonBody: result };
}

// ── GET Status-Map (alle Rollen) ─────────────────────────────
// Gibt { [ucId]: ['ra', 'gc', ...] } zurück — welche Typen existieren
async function handleStatus(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = requireAuth(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) {
    const status: Record<string, string[]> = {};
    for (const [ucId, arts] of Object.entries(MOCK_ARTEFAKTE)) {
      status[ucId] = Object.keys(arts).filter(k => Object.keys(arts[k] ?? {}).length > 0);
    }
    return { status: 200, jsonBody: status };
  }

  const items = await listItems('ARTEFAKTE');
  const status: Record<string, string[]> = {};

  for (const item of items) {
    const art = spToArtefakt(item.id, item.fields as Record<string, unknown>);
    if (!isValidType(art.type)) continue;
    if (!status[art.ucId]) status[art.ucId] = [];
    if (!status[art.ucId].includes(art.type)) status[art.ucId].push(art.type);
  }

  return { status: 200, jsonBody: status };
}

// ── GET vollständiger Export (Admin) ─────────────────────────
async function handleExport(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 200, jsonBody: MOCK_ARTEFAKTE };

  const items = await listItems('ARTEFAKTE');
  const artDB: Record<string, Record<string, Record<string, unknown>>> = {
    ra: {}, gc: {}, bc: {}, dsfa: {},
  };

  for (const item of items) {
    const art = spToArtefakt(item.id, item.fields as Record<string, unknown>);
    if (isValidType(art.type)) {
      artDB[art.type][art.ucId] = art.payload;
    }
  }

  // F13: Massendatenexport protokollieren
  await writeAuditLog(principal, 'export', 'Artefakt', 'ALL', {}, 'Vollexport aller Artefakte');

  return { status: 200, jsonBody: artDB };
}

// ── POST Artefakt speichern ───────────────────────────────────
async function handlePost(
  req: HttpRequest,
  type: ArtType,
  ucId: string,
): Promise<HttpResponseInit> {
  const principal = requireRole(req, ['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const payload = await req.json() as Record<string, unknown>;

  if (MOCK) return { status: 200, jsonBody: payload };
  const now = new Date().toISOString();

  // Bestehendes Item suchen
  const existing = await findItem(
    'ARTEFAKTE',
    `fields/UCId eq '${odataEscape(ucId)}' and fields/ArtType eq '${odataEscape(type)}'`,
  );

  const artData: Partial<Artefakt> = {
    ucId, type, payload, savedAt: now, savedBy: principal.userDetails,
  };
  const spFields = artefaktToSp(artData);

  if (existing) {
    await updateItem('ARTEFAKTE', existing.id, spFields);
  } else {
    await createItem('ARTEFAKTE', {
      Title: `${ucId}-${type}`,
      ...spFields,
    });
  }

  await writeAuditLog(
    principal, 'save-artefakt', 'Artefakt', `${ucId}/${type}`, {}, '',
  );

  return { status: 200, jsonBody: payload };
}

// ── Router ────────────────────────────────────────────────────
async function artefakteHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const type  = req.params['type'];
  const ucId  = req.params['ucId'];

  context.log(`${req.method} /api/artefakte/${type}/${ucId ?? ''}`);

  try {
    // /api/artefakte/export
    if (type === 'export' && req.method === 'GET') return await handleExport(req);

    // /api/artefakte/status
    if (type === 'status' && req.method === 'GET') return await handleStatus(req);

    // /api/artefakte/all/{ucId}
    if (type === 'all' && ucId && req.method === 'GET') return await handleGetAll(req, ucId);

    // Typ-Validierung
    if (!isValidType(type)) {
      return { status: 400, jsonBody: { error: `Ungültiger Artefakt-Typ: ${type}. Erlaubt: ra, gc, bc, dsfa` } };
    }
    if (!ucId) return { status: 400, jsonBody: { error: 'ucId fehlt' } };

    if (req.method === 'GET')  return await handleGet(req, type, ucId);
    if (req.method === 'POST') return await handlePost(req, type, ucId);

    return { status: 405 };
  } catch (err) {
    return serverError(context, err);
  }
}

app.http('artefakte', {
  methods: ['GET', 'POST'],
  route: 'artefakte/{type}/{ucId?}',
  authLevel: 'anonymous',
  handler: artefakteHandler,
});
