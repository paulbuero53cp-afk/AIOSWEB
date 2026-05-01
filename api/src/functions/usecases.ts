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
import { listItems, findItem, createItem, updateItem } from '../lib/sharepoint';
import { spToUC, ucToSp, UseCase } from '../lib/mappers';
import { writeAuditLog, diffObjects } from '../lib/audit';

// ── GET /api/usecases ─────────────────────────────────────────
async function handleGet(
  req: HttpRequest,
): Promise<HttpResponseInit> {
  const principal = requireAuth(req);
  if (isAuthError(principal)) return principal;

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

  const item = await findItem('USECASES', `fields/UCId eq '${ucId}'`);
  if (!item) return { status: 404, jsonBody: { error: `Use Case ${ucId} nicht gefunden` } };

  return { status: 200, jsonBody: spToUC(item.id, item.fields as Record<string, unknown>) };
}

// ── POST /api/usecases ────────────────────────────────────────
async function handlePost(
  req: HttpRequest,
): Promise<HttpResponseInit> {
  const principal = requireRole(req, ['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const body = await req.json() as Partial<UseCase>;
  if (!body.title?.trim()) {
    return { status: 400, jsonBody: { error: 'title ist Pflichtfeld' } };
  }

  // Link-Validierung
  if (body.link && !/^https?:\/\//i.test(body.link)) {
    return { status: 400, jsonBody: { error: 'link muss mit https:// beginnen' } };
  }

  const now = new Date().toISOString();
  const newUC: Partial<UseCase> = {
    ...body,
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
  await writeAuditLog(principal, 'create', 'UseCase', body.id ?? result.id, {}, '');

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
    if (req.method === 'GET')    return ucId ? handleGetOne(req, ucId) : handleGet(req);
    if (req.method === 'POST')   return handlePost(req);
    if (req.method === 'PATCH')  return ucId ? handlePatch(req, ucId) : { status: 400 };
    if (req.method === 'DELETE') return ucId ? handleDelete(req, ucId) : { status: 400 };

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
