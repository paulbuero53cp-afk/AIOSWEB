// ─────────────────────────────────────────────────────────────
//  AIOS — /api/usecases[/{id}]
//
//  GET    /api/usecases          → alle aktiven Use Cases
//  POST   /api/usecases          → neuer Use Case (Editor+)
//  PATCH  /api/usecases/{id}     → Felder aktualisieren (Editor+)
//  DELETE /api/usecases/{id}     → Soft-Delete act=false (Admin)
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth, requireRole, isAuthError } from '../lib/auth';
import { listItems, findItem, createItem, updateItem } from '../lib/storage';
import { spToUC, ucToSp, UseCase } from '../lib/mappers';
import { writeAuditLog, diffObjects } from '../lib/audit';
import { MOCK_USECASES } from '../lib/mockData';

const MOCK = process.env['USE_MOCK_DATA'] === 'true';

// ── GET /api/usecases ─────────────────────────────────────────
async function handleGet(
  req: HttpRequest,
): Promise<HttpResponseInit> {
  const principal = requireAuth(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 200, jsonBody: MOCK_USECASES.filter(uc => uc.act) };

  const spItems = await listItems('USECASES');
  const useCases: UseCase[] = spItems
    .map(item => spToUC(item.id, item.fields as Record<string, unknown>))
    .filter(uc => uc.act);   // Soft-deleted herausfiltern

  return { status: 200, jsonBody: useCases };
}

// ── GET /api/usecases/{id} ────────────────────────────────────
async function handleGetOne(
  req: HttpRequest,
  ucId: string,
): Promise<HttpResponseInit> {
  const principal = requireAuth(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) {
    const uc = MOCK_USECASES.find(u => u.id === ucId);
    return uc
      ? { status: 200, jsonBody: uc }
      : { status: 404, jsonBody: { error: `Use Case ${ucId} nicht gefunden` } };
  }

  const item = await findItem('USECASES', `fields/UCId eq '${ucId}'`);
  if (!item) return { status: 404, jsonBody: { error: `Use Case ${ucId} nicht gefunden` } };

  return { status: 200, jsonBody: spToUC(item.id, item.fields as Record<string, unknown>) };
}

// ── ID-Generator  UC-YYYY-MM-NNN ─────────────────────────────
async function generateUcId(): Promise<string> {
  const d   = new Date();
  const yr  = d.getFullYear();
  const mo  = String(d.getMonth() + 1).padStart(2, '0');
  const pfx = `UC-${yr}-${mo}-`;

  // Alle vorhandenen IDs laden und höchste Sequenznummer ermitteln
  const allItems = await listItems('USECASES');
  const maxSeq = allItems.reduce((max, item) => {
    const id = String((item.fields as Record<string, unknown>)['UCId'] ?? '');
    if (!id.startsWith(pfx)) return max;
    const seq = parseInt(id.slice(pfx.length), 10);
    return isNaN(seq) ? max : Math.max(max, seq);
  }, 0);

  return `${pfx}${String(maxSeq + 1).padStart(3, '0')}`;
}

// ── POST /api/usecases ────────────────────────────────────────
async function handlePost(
  req: HttpRequest,
): Promise<HttpResponseInit> {
  const principal = requireRole(req, ['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const body = await req.json() as Partial<UseCase>;

  if (MOCK) {
    const now = new Date().toISOString();
    const d = new Date();
    const mockId = `UC-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`;
    const defaults: UseCase = { id: mockId, title: '', act: true, cl: '', sys: '', legacy: '', own: '', cap: '', useCaseCategory: 'Sonstiges', kiType: [], auto: '', lc: 'Idea', pd: 'Start', rt: 'Low', tier: '1', rev: 'yes', vs: 1, fs: 1, rs: 1, kpi: 'no', app: 'Not required', or: 'Not ready', hitl: 'yes', gt: [false,false,false,false], sb: [false,false,false,false], mc: [false,false,false,false,false,false,false], desc: '', link: '', createdAt: now, updatedAt: now, createdBy: principal.userDetails, updatedBy: principal.userDetails };
    const result: UseCase = { ...defaults, ...body as UseCase };
    return { status: 201, jsonBody: result };
  }
  if (!body.title?.trim()) {
    return { status: 400, jsonBody: { error: 'title ist Pflichtfeld' } };
  }

  // Link-Validierung
  if (body.link && !/^https?:\/\//i.test(body.link)) {
    return { status: 400, jsonBody: { error: 'link muss mit https:// beginnen' } };
  }

  const now  = new Date().toISOString();
  // ID generieren: UC-YYYY-MM-NNN (fortlaufend pro Monat)
  const ucId = body.id?.trim() || await generateUcId();

  const newUC: Partial<UseCase> = {
    ...body,
    id:        ucId,
    act:       true,
    createdAt: now,
    updatedAt: now,
    createdBy: principal.userDetails,
    updatedBy: principal.userDetails,
  };

  const fields = ucToSp(newUC);
  const created = await createItem('USECASES', { Title: body.title, ...fields });
  const result  = spToUC(created.id, { ...fields, Created: now, Modified: now });

  // Audit
  await writeAuditLog(principal, 'create', 'UseCase', ucId, {}, '');

  return { status: 201, jsonBody: result };
}

// ── PATCH /api/usecases/{id} ──────────────────────────────────
async function handlePatch(
  req: HttpRequest,
  ucId: string,
): Promise<HttpResponseInit> {
  // Approve/Reject: nur Approver+; alles andere: Editor+
  const body = await req.json() as Partial<UseCase>;
  const needsApprover = 'app' in body;
  const principal = requireRole(
    req,
    needsApprover
      ? ['AIOS.Approver', 'AIOS.Admin']
      : ['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin'],
  );
  if (isAuthError(principal)) return principal;

  if (MOCK) {
    const uc = MOCK_USECASES.find(u => u.id === ucId);
    if (!uc) return { status: 404, jsonBody: { error: `Use Case ${ucId} nicht gefunden` } };
    return { status: 200, jsonBody: { ...uc, ...body, updatedAt: new Date().toISOString(), updatedBy: principal.userDetails } };
  }

  const item = await findItem('USECASES', `fields/UCId eq '${ucId}'`);
  if (!item) return { status: 404, jsonBody: { error: `Use Case ${ucId} nicht gefunden` } };

  const before = spToUC(item.id, item.fields as Record<string, unknown>);

  const patch: Partial<UseCase> = {
    ...body,
    updatedAt: new Date().toISOString(),
    updatedBy: principal.userDetails,
  };

  await updateItem('USECASES', item.id, ucToSp(patch));

  const after = { ...before, ...patch };

  // Audit-Action bestimmen
  let action: 'approve' | 'reject' | 'edit' | 'inline-edit' = 'edit';
  if (body.app === 'Approved') action = 'approve';
  else if (body.app === 'Rejected') action = 'reject';
  else if (Object.keys(body).length <= 2) action = 'inline-edit';

  await writeAuditLog(
    principal, action, 'UseCase', ucId,
    diffObjects(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>),
    '',
  );

  return { status: 200, jsonBody: after };
}

// ── DELETE /api/usecases/{id} (Soft-Delete) ───────────────────
async function handleDelete(
  req: HttpRequest,
  ucId: string,
): Promise<HttpResponseInit> {
  const principal = requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 204 };

  const item = await findItem('USECASES', `fields/UCId eq '${ucId}'`);
  if (!item) return { status: 404, jsonBody: { error: `Use Case ${ucId} nicht gefunden` } };

  await updateItem('USECASES', item.id, {
    Active: false,
    UpdatedBy_x: principal.userDetails,
  });

  await writeAuditLog(principal, 'delete', 'UseCase', ucId, {}, 'Soft-Delete');

  return { status: 204 };
}

// ── Router ────────────────────────────────────────────────────
async function usecasesHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const ucId = req.params['id'];
  context.log(`${req.method} /api/usecases${ucId ? '/' + ucId : ''}`);

  try {
    if (req.method === 'GET')    return ucId ? await handleGetOne(req, ucId) : await handleGet(req);
    if (req.method === 'POST')   return await handlePost(req);
    if (req.method === 'PATCH')  return ucId ? await handlePatch(req, ucId) : { status: 400 };
    if (req.method === 'DELETE') return ucId ? await handleDelete(req, ucId) : { status: 400 };

    return { status: 405, jsonBody: { error: 'Method not allowed' } };
  } catch (err) {
    context.error('usecases error:', err);
    return { status: 500, jsonBody: { error: 'Interner Fehler', detail: String(err) } };
  }
}

app.http('usecases', {
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  route: 'usecases/{id?}',
  authLevel: 'anonymous',   // Auth via SWA — nicht via Function-Key
  handler: usecasesHandler,
});
