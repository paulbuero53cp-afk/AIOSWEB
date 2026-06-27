// ─────────────────────────────────────────────────────────────
//  AIOS — /api/aitools[/{id}]
//
//  Register erlaubter KI-Tools (Allowlist) inkl. Begründung + Historie.
//  GET    /api/aitools          → alle aktiven Tools (jeder eingeladene Nutzer)
//  POST   /api/aitools          → neues Tool (Editor+)
//  PATCH  /api/aitools/{id}     → Felder/Status ändern
//                                 (Freigabe-Status nur Approver/Admin,
//                                  Begründung Pflicht bei Statusänderung)
//  DELETE /api/aitools/{id}     → Soft-Delete active=false (Admin)
//
//  Historie wird über die bestehende AIOS_AuditLog geführt
//  (Entity='AiTool', EntityId=ToolId).
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireUser, requireRole, isAuthError } from '../lib/auth';
import { listItems, findItem, createItem, updateItem, odataEscape } from '../lib/storage';
import { serverError } from '../lib/http';
import { spToAiTool, aiToolToSp, spToAudit, AiTool } from '../lib/mappers';
import { writeAuditLog, diffObjects } from '../lib/audit';

const MOCK = process.env['USE_MOCK_DATA'] === 'true';

// Freigabe-Entscheidungen — nur Approver/Admin dürfen diese Status setzen.
// Workflow: Angefragt → In Prüfung → Erlaubt / Nicht erlaubt
const APPROVAL_STATES = ['Erlaubt', 'Eingeschränkt erlaubt', 'Nicht erlaubt', 'Abgelehnt', 'Zurückgezogen'];

// ── GET /api/aitools ──────────────────────────────────────────
async function handleGet(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = await requireUser(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 200, jsonBody: [] };

  const items = await listItems('AITOOLS');
  const tools: AiTool[] = items
    .map(item => spToAiTool(item.id, item.fields as Record<string, unknown>))
    .filter(t => t.active);

  return { status: 200, jsonBody: tools };
}

// ── GET /api/aitools/{id} → Änderungshistorie dieses Tools ────
// Scoped auf Entity=AiTool + dieses Tool, damit auch Nicht-Admins die
// Historie sehen, ohne das globale (Admin-only) Audit-Log zu öffnen.
async function handleHistory(req: HttpRequest, toolId: string): Promise<HttpResponseInit> {
  const principal = await requireUser(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 200, jsonBody: [] };

  const items = await listItems(
    'AUDITLOG',
    `fields/Entity eq 'AiTool' and fields/EntityId eq '${odataEscape(toolId)}'`,
    undefined, 100,
  );
  const entries = items
    .map(i => spToAudit(i.id, i.fields as Record<string, unknown>))
    .sort((a, b) => b.ts.localeCompare(a.ts));
  return { status: 200, jsonBody: entries };
}

// ── ID-Generator  TOOL-YYYY-NNN ───────────────────────────────
async function generateToolId(): Promise<string> {
  const yr  = new Date().getFullYear();
  const pfx = `TOOL-${yr}-`;
  const allItems = await listItems('AITOOLS');
  const maxSeq = allItems.reduce((max, item) => {
    const id = String((item.fields as Record<string, unknown>)['ToolId'] ?? '');
    if (!id.startsWith(pfx)) return max;
    const seq = parseInt(id.slice(pfx.length), 10);
    return isNaN(seq) ? max : Math.max(max, seq);
  }, 0);
  return `${pfx}${String(maxSeq + 1).padStart(3, '0')}`;
}

// ── POST /api/aitools ─────────────────────────────────────────
async function handlePost(req: HttpRequest): Promise<HttpResponseInit> {
  const body = await req.json() as Partial<AiTool>;

  // Freigabe-Status direkt beim Anlegen nur durch Approver/Admin.
  const wantsDecision = typeof body.status === 'string' && APPROVAL_STATES.includes(body.status);
  const principal = await requireRole(
    req,
    wantsDecision
      ? ['AIOS.Approver', 'AIOS.Admin']
      : ['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin'],
  );
  if (isAuthError(principal)) return principal;

  if (!body.name?.trim()) {
    return { status: 400, jsonBody: { error: 'name ist Pflichtfeld' } };
  }
  // Begründung Pflicht, sobald ein Freigabe-Status gesetzt wird.
  if (wantsDecision && !(body.justification ?? '').trim()) {
    return { status: 400, jsonBody: { error: 'Begründung ist bei Statusänderung Pflicht' } };
  }
  if (body.url && !/^https?:\/\//i.test(body.url)) {
    return { status: 400, jsonBody: { error: 'url muss mit https:// beginnen' } };
  }

  if (MOCK) {
    const now = new Date().toISOString();
    return { status: 201, jsonBody: { id: `TOOL-MOCK-${Date.now()}`, active: true, createdAt: now, updatedAt: now, ...body } };
  }

  const now    = new Date().toISOString();
  const toolId = await generateToolId();         // serverseitig — kein ID-Spoofing
  const status = body.status ?? 'In Prüfung';

  const newTool: Partial<AiTool> = {
    ...body,
    id:        toolId,
    status,
    active:    true,
    createdAt: now,
    updatedAt: now,
    createdBy: principal.userDetails,
    updatedBy: principal.userDetails,
    ...(wantsDecision ? { decidedBy: principal.userDetails, decisionDate: now } : {}),
  };

  const fields  = aiToolToSp(newTool);
  const created = await createItem('AITOOLS', fields);
  const result  = spToAiTool(created.id, { ...fields, Created: now, Modified: now });

  await writeAuditLog(principal, 'create', 'AiTool', toolId,
    diffObjects({}, newTool as unknown as Record<string, unknown>),
    body.justification ?? '');

  return { status: 201, jsonBody: result };
}

// ── PATCH /api/aitools/{id} ───────────────────────────────────
async function handlePatch(req: HttpRequest, toolId: string): Promise<HttpResponseInit> {
  const body = await req.json() as Partial<AiTool>;

  // Statuswechsel auf einen Freigabe-Status → nur Approver/Admin.
  const isDecision = typeof body.status === 'string' && APPROVAL_STATES.includes(body.status);
  const principal = await requireRole(
    req,
    isDecision
      ? ['AIOS.Approver', 'AIOS.Admin']
      : ['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin'],
  );
  if (isAuthError(principal)) return principal;

  // Begründung Pflicht bei jeder Statusänderung.
  if (body.status !== undefined && !(body.justification ?? '').trim()) {
    return { status: 400, jsonBody: { error: 'Begründung ist bei Statusänderung Pflicht' } };
  }
  if (body.url !== undefined && body.url !== '' && !/^https?:\/\//i.test(body.url)) {
    return { status: 400, jsonBody: { error: 'url muss mit https:// beginnen' } };
  }

  if (MOCK) return { status: 200, jsonBody: { id: toolId, ...body, updatedAt: new Date().toISOString() } };

  const item = await findItem('AITOOLS', `fields/ToolId eq '${odataEscape(toolId)}'`);
  if (!item) return { status: 404, jsonBody: { error: `Tool ${toolId} nicht gefunden` } };

  const before = spToAiTool(item.id, item.fields as Record<string, unknown>);
  const now    = new Date().toISOString();

  const patch: Partial<AiTool> = {
    ...body,
    updatedAt: now,
    updatedBy: principal.userDetails,
    // Bei Statusentscheidung Entscheider + Datum mitführen.
    ...(body.status !== undefined ? { decidedBy: principal.userDetails, decisionDate: now } : {}),
  };

  await updateItem('AITOOLS', item.id, aiToolToSp(patch));

  const after = { ...before, ...patch };

  // Audit-Action: approve / reject / edit
  let action: 'approve' | 'reject' | 'edit' = 'edit';
  if (body.status === 'Erlaubt' || body.status === 'Eingeschränkt erlaubt') action = 'approve';
  else if (body.status === 'Nicht erlaubt' || body.status === 'Abgelehnt' || body.status === 'Zurückgezogen') action = 'reject';

  await writeAuditLog(
    principal, action, 'AiTool', toolId,
    diffObjects(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>),
    body.justification ?? '',
  );

  return { status: 200, jsonBody: after };
}

// ── DELETE /api/aitools/{id} (Soft-Delete) ────────────────────
async function handleDelete(req: HttpRequest, toolId: string): Promise<HttpResponseInit> {
  const principal = await requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 204 };

  const item = await findItem('AITOOLS', `fields/ToolId eq '${odataEscape(toolId)}'`);
  if (!item) return { status: 404, jsonBody: { error: `Tool ${toolId} nicht gefunden` } };

  const before = spToAiTool(item.id, item.fields as Record<string, unknown>);
  await updateItem('AITOOLS', item.id, { Active: false, UpdatedBy_x: principal.userDetails });

  await writeAuditLog(principal, 'delete', 'AiTool', toolId,
    diffObjects(before as unknown as Record<string, unknown>,
                { ...before, active: false } as unknown as Record<string, unknown>),
    `Archiviert: ${before.name}`);

  return { status: 204 };
}

// ── Router ────────────────────────────────────────────────────
async function aitoolsHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const id = req.params['id'];
  context.log(`${req.method} /api/aitools${id ? '/' + id : ''}`);

  try {
    if (req.method === 'GET')    return id ? await handleHistory(req, id) : await handleGet(req);
    if (req.method === 'POST')   return await handlePost(req);
    if (req.method === 'PATCH')  return id ? await handlePatch(req, id)  : { status: 400 };
    if (req.method === 'DELETE') return id ? await handleDelete(req, id) : { status: 400 };
    return { status: 405, jsonBody: { error: 'Method not allowed' } };
  } catch (err) {
    return serverError(context, err);
  }
}

app.http('aitools', {
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  route: 'aitools/{id?}',
  authLevel: 'anonymous',   // Auth via SWA
  handler: aitoolsHandler,
});
