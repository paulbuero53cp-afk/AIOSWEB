// ─────────────────────────────────────────────────────────────
//  AIOS — /api/auditlog
//
//  GET /api/auditlog?limit=100&entity=UseCase
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireRole, isAuthError } from '../lib/auth';
import { listItems } from '../lib/sharepoint';
import { spToAudit } from '../lib/mappers';

async function auditlogHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  // Nur Admin kann Audit Log lesen
  const principal = requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const limitParam  = req.query.get('limit');
  const entityParam = req.query.get('entity');
  const limit = Math.min(parseInt(limitParam ?? '100'), 500);

  try {
    const filter = entityParam
      ? `fields/Entity eq '${entityParam}'`
      : undefined;

    const items = await listItems('AUDITLOG', filter, undefined, limit);
    const entries = items
      .map(i => spToAudit(i.id, i.fields as Record<string, unknown>))
      .sort((a, b) => b.ts.localeCompare(a.ts));  // Neueste zuerst

    return { status: 200, jsonBody: entries };
  } catch (err) {
    context.error('auditlog error:', err);
    return { status: 500, jsonBody: { error: String(err) } };
  }
}

app.http('auditlog', {
  methods: ['GET'],
  route: 'auditlog',
  authLevel: 'anonymous',
  handler: auditlogHandler,
});
