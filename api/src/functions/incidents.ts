// ─────────────────────────────────────────────────────────────
//  AIOS — /api/incidents[/{id}]
//
//  GET    /api/incidents          → alle Incidents
//  POST   /api/incidents          → neuer Incident (Editor+)
//  PATCH  /api/incidents/{id}     → Status-Update (Editor+)
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireUser, requireRole, isAuthError } from '../lib/auth';
import { listItems, findItem, createItem, updateItem, odataEscape } from '../lib/storage';
import { serverError } from '../lib/http';
import { spToIncident, incidentToSp, Incident } from '../lib/mappers';
import { writeAuditLog, diffObjects } from '../lib/audit';
import { MOCK_INCIDENTS } from '../lib/mockData';

const MOCK = process.env['USE_MOCK_DATA'] === 'true';

async function handleGet(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = await requireUser(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 200, jsonBody: MOCK_INCIDENTS };

  const spItems = await listItems('INCIDENTS');
  return {
    status: 200,
    jsonBody: spItems.map(i => spToIncident(i.id, i.fields as Record<string, unknown>)),
  };
}

async function handlePost(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = await requireRole(req, ['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const body = await req.json() as Partial<Incident>;

  if (MOCK) {
    const now = new Date().toISOString();
    const result: Incident = { id: `INC-${Date.now()}`, ucid: '', type: 'Incident', sev: 'Low', st: 'Open', desc: '', act: '', date: now.slice(0, 10), createdAt: now, updatedAt: now, createdBy: principal.userDetails, updatedBy: principal.userDetails, ...body };
    return { status: 201, jsonBody: result };
  }
  if (!body.ucid) return { status: 400, jsonBody: { error: 'ucid ist Pflichtfeld' } };

  const now = new Date().toISOString();
  const id = `INC-${Date.now()}`;

  const newInc: Partial<Incident> = {
    ...body, id,
    createdAt: now, updatedAt: now,
    createdBy: principal.userDetails,
    updatedBy: principal.userDetails,
  };

  const fields = incidentToSp(newInc);
  const created = await createItem('INCIDENTS', { Title: id, ...fields });
  const result  = spToIncident(created.id, { ...fields, Created: now });

  await writeAuditLog(principal, 'create', 'Incident', id,
    diffObjects({}, newInc as unknown as Record<string, unknown>), '');

  return { status: 201, jsonBody: result };
}

async function handlePatch(req: HttpRequest, incId: string): Promise<HttpResponseInit> {
  const principal = await requireRole(req, ['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  if (MOCK) {
    const inc = MOCK_INCIDENTS.find(i => i.id === incId);
    if (!inc) return { status: 404, jsonBody: { error: `Incident ${incId} nicht gefunden` } };
    const body = await req.json() as Partial<Incident>;
    return { status: 200, jsonBody: { ...inc, ...body, updatedAt: new Date().toISOString(), updatedBy: principal.userDetails } };
  }

  const item = await findItem('INCIDENTS', `fields/IncId eq '${odataEscape(incId)}'`);
  if (!item) return { status: 404, jsonBody: { error: `Incident ${incId} nicht gefunden` } };

  const before = spToIncident(item.id, item.fields as Record<string, unknown>);
  const body   = await req.json() as Partial<Incident>;
  const patch  = { ...body, updatedAt: new Date().toISOString(), updatedBy: principal.userDetails };

  await updateItem('INCIDENTS', item.id, incidentToSp(patch));

  const after = { ...before, ...patch };
  await writeAuditLog(
    principal, 'edit', 'Incident', incId,
    diffObjects(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>),
    '',
  );

  return { status: 200, jsonBody: after };
}

async function incidentsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const incId = req.params['id'];
  context.log(`${req.method} /api/incidents${incId ? '/' + incId : ''}`);
  try {
    if (req.method === 'GET')   return await handleGet(req);
    if (req.method === 'POST')  return await handlePost(req);
    if (req.method === 'PATCH') return incId ? await handlePatch(req, incId) : { status: 400 };
    return { status: 405 };
  } catch (err) {
    return serverError(context, err);
  }
}

app.http('incidents', {
  methods: ['GET', 'POST', 'PATCH'],
  route: 'incidents/{id?}',
  authLevel: 'anonymous',
  handler: incidentsHandler,
});
