// ─────────────────────────────────────────────────────────────
//  AIOS — /api/admin/provision  (Admin only)
//
//  Legt fehlende SP-Spalten an ohne bestehende Daten zu berühren.
//  Idempotent: bereits vorhandene Spalten werden übersprungen.
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireRole, isAuthError } from '../lib/auth';
import { getGraphClient } from '../lib/graphClient';
import { serverError } from '../lib/http';

interface ColumnSpec {
  list: string;       // SP-Listenname (display name)
  name: string;       // Spaltenname
  type: 'text' | 'boolean' | 'number';
  description?: string;
}

const COLUMNS_TO_PROVISION: ColumnSpec[] = [
  { list: process.env['LIST_AITOOLS']  ?? 'AIOS_AiTools',  name: 'Approver', type: 'text',    description: 'Freitext-Approver für Tool-Freigabe' },
  { list: process.env['LIST_USECASES'] ?? 'AIOS_Usecases', name: 'ToolRef',  type: 'text',    description: 'Verknüpftes AI-Tool (TOOL-ID)' },
];

async function getSiteId(): Promise<string> {
  const cached = process.env['SHAREPOINT_SITE_ID'];
  if (cached) return cached;

  const siteUrl = process.env['SHAREPOINT_SITE_URL'];
  if (!siteUrl) throw new Error('SHAREPOINT_SITE_URL nicht konfiguriert');

  const url = new URL(siteUrl);
  const client = getGraphClient();
  const result = await client
    .api(`/sites/${url.hostname}:${url.pathname}`)
    .select('id')
    .get() as { id: string };
  return result.id;
}

async function getExistingColumnNames(siteId: string, listName: string): Promise<Set<string>> {
  const client = getGraphClient();
  const result = await client
    .api(`/sites/${siteId}/lists/${listName}/columns`)
    .select('name')
    .get() as { value: { name: string }[] };
  return new Set((result.value ?? []).map(c => c.name));
}

async function addColumn(siteId: string, listName: string, col: ColumnSpec): Promise<void> {
  const client = getGraphClient();
  const body: Record<string, unknown> = { name: col.name, description: col.description ?? '' };

  if (col.type === 'text')    body['text']    = { allowMultipleLines: false, maxLength: 255 };
  if (col.type === 'boolean') body['boolean'] = {};
  if (col.type === 'number')  body['number']  = {};

  await client
    .api(`/sites/${siteId}/lists/${listName}/columns`)
    .post(body);
}

async function handleProvision(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = await requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const siteId = await getSiteId();
  const report: { list: string; column: string; status: 'added' | 'exists' | 'error'; detail?: string }[] = [];

  for (const col of COLUMNS_TO_PROVISION) {
    try {
      const existing = await getExistingColumnNames(siteId, col.list);
      if (existing.has(col.name)) {
        report.push({ list: col.list, column: col.name, status: 'exists' });
      } else {
        await addColumn(siteId, col.list, col);
        report.push({ list: col.list, column: col.name, status: 'added' });
      }
    } catch (err) {
      report.push({ list: col.list, column: col.name, status: 'error', detail: String(err) });
    }
  }

  const added  = report.filter(r => r.status === 'added').length;
  const errors = report.filter(r => r.status === 'error').length;

  return {
    status: errors > 0 ? 207 : 200,
    jsonBody: { added, errors, report },
  };
}

app.http('provision', {
  methods: ['POST'],
  route: 'provision',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    ctx.log('POST /api/provision');
    try {
      return await handleProvision(req);
    } catch (err) {
      return serverError(ctx, err);
    }
  },
});
