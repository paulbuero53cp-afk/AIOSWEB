// ─────────────────────────────────────────────────────────────
//  AIOS — /api/users[/{id}]
//
//  GET    /api/users          → alle Benutzer (Admin)
//  GET    /api/users/me       → eigenes Profil + Rolle (jeder eingeloggte)
//  POST   /api/users          → neuen Benutzer anlegen (Admin)
//  PATCH  /api/users/{id}     → Rolle / Active ändern (Admin)
//  DELETE /api/users/{id}     → Benutzer löschen (Admin)
//
//  Role Resolution Strategie:
//    1. Suche userId in AIOS_Users → Rolle aus SP
//    2. Nicht gefunden → SWA userRoles als Fallback
//    3. Beides leer → 403
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth, requireRole, isAuthError } from '../lib/auth';
import { listItems, findItem, createItem, updateItem, deleteItem, getItem } from '../lib/storage';
import { spToAiosUser, aiosUserToSp, AiosUser } from '../lib/mappers';
import { MOCK_USERS } from '../lib/mockData';

const MOCK = process.env['USE_MOCK_DATA'] === 'true';

// ── GET /api/users ────────────────────────────────────────────
async function handleGetAll(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 200, jsonBody: MOCK_USERS };

  const spItems = await listItems('USERS');
  const users: AiosUser[] = spItems.map(item =>
    spToAiosUser(item.id, item.fields as Record<string, unknown>),
  );
  return { status: 200, jsonBody: users };
}

// ── GET /api/users/me ─────────────────────────────────────────
async function handleGetMe(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = requireAuth(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) {
    // Mock: immer Admin zurückgeben
    const me = MOCK_USERS[0];
    return { status: 200, jsonBody: me };
  }

  // Gesamter SP-Block in try/catch — Graph-Fehler sollen nicht den Login blockieren
  try {
    // Alle User laden + in JS filtern (OData-Filter auf nicht-indizierten Spalten unzuverlässig)
    const allItems = await listItems('USERS');
    const emailLower = principal.userDetails.toLowerCase();
    const spItem = allItems.find(item => {
      const f = item.fields as Record<string, unknown>;
      return (
        (f['AadUserId'] && String(f['AadUserId']) === principal.userId) ||
        (f['Email'] && String(f['Email']).toLowerCase() === emailLower)
      );
    }) ?? null;

    if (spItem) {
      const user = spToAiosUser(spItem.id, spItem.fields as Record<string, unknown>);

      // LastLogin + AadUserId aktualisieren (fire & forget)
      const patch: Record<string, unknown> = { LastLogin: new Date().toISOString() };
      if (!user.aadUserId && principal.userId) {
        patch['AadUserId'] = principal.userId;
        user.aadUserId = principal.userId;
      }
      updateItem('USERS', spItem.id, patch).catch(() => {/* ignorieren */});

      if (!user.active) {
        return { status: 403, jsonBody: { error: 'Zugriff gesperrt. Bitte Admin kontaktieren.' } };
      }
      return { status: 200, jsonBody: user };
    }

    // Fallback 1: SWA userRoles
    const swaRoles = (principal.userRoles ?? []).filter(r => r.startsWith('AIOS.'));
    if (swaRoles.length > 0) {
      return { status: 200, jsonBody: {
        id: '', email: principal.userDetails, displayName: principal.userDetails,
        aadUserId: principal.userId, role: swaRoles[0],
        active: true, invitedAt: '', invitedBy: 'SWA-Fallback',
        lastLogin: new Date().toISOString(), _fallback: true,
      }};
    }

    // Fallback 2: Bootstrap — Liste hat wenige Einträge → Viewer gewähren
    if (allItems.length <= 5) {
      return { status: 200, jsonBody: {
        id: '', email: principal.userDetails, displayName: principal.userDetails,
        aadUserId: principal.userId, role: 'AIOS.Viewer',
        active: true, invitedAt: '', invitedBy: 'Bootstrap',
        lastLogin: new Date().toISOString(), _bootstrap: true,
      }};
    }

  } catch (graphErr) {
    // Graph-Fehler → Viewer-Fallback damit Login nicht blockiert wird
    // Admin sieht dies als _graphError Flag und kann debuggen
    const errMsg = graphErr instanceof Error ? graphErr.message : String(graphErr);
    return { status: 200, jsonBody: {
      id: '', email: principal.userDetails, displayName: principal.userDetails,
      aadUserId: principal.userId, role: 'AIOS.Viewer',
      active: true, invitedAt: '', invitedBy: 'Error-Fallback',
      lastLogin: new Date().toISOString(), _graphError: errMsg,
    }};
  }

  // Kein Eintrag, keine Rolle, Liste hat viele User → wirklich kein Zugriff
  return {
    status: 403,
    jsonBody: {
      error: 'Kein AIOS-Benutzereintrag gefunden.',
      email: principal.userDetails,
    },
  };
}

// ── POST /api/users ───────────────────────────────────────────
async function handlePost(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const body = (await req.json()) as Partial<AiosUser>;
  if (!body.email) {
    return { status: 400, jsonBody: { error: 'E-Mail ist Pflichtfeld' } };
  }

  const now = new Date().toISOString();
  const newUser: Omit<AiosUser, 'id' | '_spId'> = {
    email:       body.email.toLowerCase().trim(),
    displayName: body.displayName ?? body.email,
    aadUserId:   body.aadUserId ?? '',
    role:        body.role ?? 'AIOS.Viewer',
    active:      body.active !== false,
    invitedAt:   now,
    invitedBy:   principal.userDetails,
    lastLogin:   '',
  };

  if (MOCK) {
    const created = { ...newUser, id: `usr-${Date.now()}`, _spId: `usr-${Date.now()}` };
    return { status: 201, jsonBody: created };
  }

  // Doppelten Eintrag verhindern
  const existing = await findItem('USERS', `fields/Email eq '${newUser.email}'`);
  if (existing) {
    return { status: 409, jsonBody: { error: `Benutzer mit E-Mail ${newUser.email} existiert bereits` } };
  }

  const created = await createItem('USERS', aiosUserToSp(newUser));
  return { status: 201, jsonBody: spToAiosUser(created.id, created.fields as Record<string, unknown>) };
}

// ── PATCH /api/users/{id} ─────────────────────────────────────
async function handlePatch(req: HttpRequest, userId: string): Promise<HttpResponseInit> {
  const principal = requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const body = (await req.json()) as Partial<AiosUser>;

  if (MOCK) {
    return { status: 200, jsonBody: { id: userId, ...body } };
  }

  const patch: Record<string, unknown> = {};
  if (body.role    !== undefined) patch['Role']   = body.role;
  if (body.active  !== undefined) patch['Active'] = body.active;
  if (body.displayName !== undefined) patch['DisplayName'] = body.displayName;

  await updateItem('USERS', userId, patch);
  // Aktuellen Stand zurücklesen
  const refreshed = await getItem('USERS', userId);
  return { status: 200, jsonBody: spToAiosUser(refreshed.id, refreshed.fields as Record<string, unknown>) };
}

// ── DELETE /api/users/{id} ────────────────────────────────────
async function handleDelete(req: HttpRequest, userId: string): Promise<HttpResponseInit> {
  const principal = requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 204 };

  await deleteItem('USERS', userId);
  return { status: 204 };
}

// ── Router ────────────────────────────────────────────────────
async function usersHandler(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const pathParts = req.url.split('/api/users')[1]?.split('?')[0] ?? '';
    const segment   = pathParts.replace(/^\//, '');   // '' | 'me' | '{id}'
    const method    = req.method.toUpperCase();

    if (segment === 'me' && method === 'GET')  return handleGetMe(req);
    if (segment === ''   && method === 'GET')  return handleGetAll(req);
    if (segment === ''   && method === 'POST') return handlePost(req);
    if (segment && segment !== 'me' && method === 'PATCH')  return handlePatch(req, segment);
    if (segment && segment !== 'me' && method === 'DELETE') return handleDelete(req, segment);

    return { status: 405, jsonBody: { error: 'Method Not Allowed' } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return { status: 500, jsonBody: { error: msg } };
  }
}

app.http('users', {
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  authLevel: 'anonymous',
  route: 'users/{segment?}',
  handler: usersHandler,
});
