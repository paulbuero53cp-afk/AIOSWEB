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
import { listItems, findItem, createItem, updateItem } from '../lib/sharepoint';
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
  const principal = requireAuth(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) {
    const payload = MOCK_ARTEFAKTE[ucId]?.[type] ?? {};
    return { status: 200, jsonBody: payload };
  }

  const item = await findItem(
    'ARTEFAKTE',
    `fields/UCId eq '${ucId}' and fields/ArtType eq '${type}'`,
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
  const principal = requireAuth(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) {
    const uc = MOCK_ARTEFAKTE[ucId] ?? {};
    return { status: 200, jsonBody: { ra: uc['ra'] ?? {}, gc: uc['gc'] ?? {}, bc: uc['bc'] ?? {}, dsfa: uc['dsfa'] ?? {} } };
  }

  const items = await listItems('ARTEFAKTE', `fields/UCId eq '${ucId}'`);
  const result: Record<string, unknown> = { ra: {}, gc: {}, bc: {}, dsfa: {} };

  for (const item of items) {
    const art = spToArtefakt(item.id, item.fields as Record<string, unknown>);
    if (isValidType(art.type)) result[art.type] = art.payload;
  }

  return { status: 200, jsonBody: result };
}

// ── GET vollständiger Export (Admin) ──────────────────────────
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
    `fields/UCId eq '${ucId}' and fields/ArtType eq '${type}'`,
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
    if (type === 'export' && req.method === 'GET') return handleExport(req);

    // /api/artefakte/all/{ucId}
    if (type === 'all' && ucId && req.method === 'GET') return handleGetAll(req, ucId);

    // Typ-Validierung
    if (!isValidType(type)) {
      return { status: 400, jsonBody: { error: `Ungültiger Artefakt-Typ: ${type}. Erlaubt: ra, gc, bc, dsfa` } };
    }
    if (!ucId) return { status: 400, jsonBody: { error: 'ucId fehlt' } };

    if (req.method === 'GET')  return handleGet(req, type, ucId);
    if (req.method === 'POST') return handlePost(req, type, ucId);

    return { status: 405 };
  } catch (err) {
    context.error('artefakte error:', err);
    return { status: 500, jsonBody: { error: String(err) } };
  }
}

app.http('artefakte', {
  methods: ['GET', 'POST'],
  route: 'artefakte/{type}/{ucId?}',
  authLevel: 'anonymous',
  handler: artefakteHandler,
});
