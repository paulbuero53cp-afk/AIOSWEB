// ─────────────────────────────────────────────────────────────
//  AIOS — /api/auditlog
//
//  GET /api/auditlog?limit=100&entity=UseCase
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireRole, isAuthError } from '../lib/auth';
import { listItems, odataEscape } from '../lib/storage';
import { serverError } from '../lib/http';
import { spToAudit } from '../lib/mappers';
import { MOCK_AUDIT } from '../lib/mockData';

const MOCK = process.env['USE_MOCK_DATA'] === 'true';

async function auditlogHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const principal = await requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const limitParam  = req.query.get('limit');
  const entityParam = req.query.get('entity');
  const limit = Math.min(parseInt(limitParam ?? '100'), 500);

  if (MOCK) {
    const entries = MOCK_AUDIT
      .filter(e => !entityParam || e.entity === entityParam)
      .slice(0, limit);
    return { status: 200, jsonBody: entries };
  }

  try {
    const filter = entityParam
      ? `fields/Entity eq '${odataEscape(entityParam)}'`
      : undefined;

    const items = await listItems('AUDITLOG', filter, undefined, limit);
    const entries = items
      .map(i => spToAudit(i.id, i.fields as Record<string, unknown>))
      .sort((a, b) => b.ts.localeCompare(a.ts));

    return { status: 200, jsonBody: entries };
  } catch (err) {
    return serverError(context, err);
  }
}

app.http('auditlog', {
  methods: ['GET'],
  route: 'auditlog',
  authLevel: 'anonymous',
  handler: auditlogHandler,
});
