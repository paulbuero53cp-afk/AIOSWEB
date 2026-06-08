// ─────────────────────────────────────────────────────────────
//  AIOS — /api/debug  (TEMPORÄR — nach Login-Fix entfernen)
//  Gibt Principal + SP-Lookup-Ergebnis zurück ohne zu blockieren
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getClientPrincipal } from '../lib/auth';
import { findItem, listItems } from '../lib/storage';

async function debugHandler(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const principal = getClientPrincipal(req);

  const result: Record<string, unknown> = {
    ts: new Date().toISOString(),
    principal: principal
      ? {
          userId:      principal.userId,
          userDetails: principal.userDetails,
          userRoles:   principal.userRoles,
          identityProvider: principal.identityProvider,
        }
      : null,
    env: {
      USE_MOCK_DATA:      process.env['USE_MOCK_DATA'] ?? '(not set)',
      SHAREPOINT_SITE_URL: process.env['SHAREPOINT_SITE_URL'] ? 'SET' : '(not set)',
      AZURE_TENANT_ID:    process.env['AZURE_TENANT_ID']    ? 'SET' : '(not set)',
      AZURE_CLIENT_ID:    process.env['AZURE_CLIENT_ID']    ? 'SET' : '(not set)',
      AZURE_CLIENT_SECRET:process.env['AZURE_CLIENT_SECRET']? 'SET' : '(not set)',
    },
  };

  if (principal) {
    try {
      const byId = await findItem('USERS', `fields/AadUserId eq '${principal.userId}'`);
      result['sp_byId'] = byId
        ? { found: true, fields: byId.fields }
        : { found: false };
    } catch (e) {
      result['sp_byId'] = { error: String(e) };
    }

    try {
      const byEmail = await findItem('USERS', `fields/Email eq '${principal.userDetails}'`);
      result['sp_byEmail'] = byEmail
        ? { found: true, fields: byEmail.fields }
        : { found: false };
    } catch (e) {
      result['sp_byEmail'] = { error: String(e) };
    }

    try {
      const all = await listItems('USERS');
      result['sp_allUsers_count'] = all.length;
      result['sp_allUsers_emails'] = all.map(u => u.fields['Email']);
    } catch (e) {
      result['sp_allUsers'] = { error: String(e) };
    }
  }

  return { status: 200, jsonBody: result };
}

app.http('diag', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'diag',
  handler: debugHandler,
});
