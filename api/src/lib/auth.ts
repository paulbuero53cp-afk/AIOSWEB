// ─────────────────────────────────────────────────────────────
//  AIOS — Auth Helpers
//  SWA injiziert x-ms-client-principal als Base64-JSON Header
//  Defense in Depth: Rollencheck im Frontend UND in der Function
// ─────────────────────────────────────────────────────────────

import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { listItems } from './storage';
import { spToAiosUser } from './mappers';

const MOCK = process.env['USE_MOCK_DATA'] === 'true';

export type AiosRole = 'AIOS.Viewer' | 'AIOS.Editor' | 'AIOS.Approver' | 'AIOS.Admin'
                    | 'AIOS_Viewer' | 'AIOS_Editor' | 'AIOS_Approver' | 'AIOS_Admin';

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;   // UPN / E-Mail
  userRoles: string[];
}

export function getClientPrincipal(req: HttpRequest): ClientPrincipal | null {
  const header = req.headers.get('x-ms-client-principal');
  if (!header) {
    // Lokaler Dev-Modus: NUR bei explizitem Opt-in (AIOS_DEV_AUTH=true).
    // Früher an (NODE_ENV !== 'production') gekoppelt — unsicher, da Azure
    // NODE_ENV nicht zwingend auf 'production' setzt → Admin-Backdoor (F2).
    if (process.env['AIOS_DEV_AUTH'] === 'true') {
      return {
        identityProvider: 'aad',
        userId: 'dev-user',
        userDetails: 'dev@local',
        userRoles: ['AIOS.Admin', 'authenticated'],
      };
    }
    return null;
  }
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    return JSON.parse(decoded) as ClientPrincipal;
  } catch {
    return null;
  }
}

export function hasRole(principal: ClientPrincipal | null, role: AiosRole): boolean {
  return principal?.userRoles?.includes(role) ?? false;
}

export function hasAnyRole(principal: ClientPrincipal | null, roles: AiosRole[]): boolean {
  return roles.some(r => hasRole(principal, r));
}

export function requireAuth(req: HttpRequest): ClientPrincipal | HttpResponseInit {
  const principal = getClientPrincipal(req);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Nicht authentifiziert' } };
  }
  // CSRF-Schutz (F16): schreibende Requests müssen den Custom-Header
  // X-Requested-With tragen. Cross-Site-Requests können ohne CORS-Freigabe
  // keinen Custom-Header setzen → ein fremder Origin kann keine Writes auslösen.
  const method = req.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    if (!req.headers.get('x-requested-with')) {
      return { status: 403, jsonBody: { error: 'CSRF-Schutz: X-Requested-With-Header fehlt' } };
    }
  }
  // Akzeptiere AIOS-Rollen (Standard SKU) ODER schlicht 'authenticated' (Free SKU)
  const hasAios = hasAnyRole(principal, ['AIOS.Viewer', 'AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin',
                                          'AIOS_Viewer', 'AIOS_Editor', 'AIOS_Approver', 'AIOS_Admin']);
  const isAuthenticated = principal.userRoles?.includes('authenticated') ?? false;
  if (!hasAios && !isAuthenticated) {
    return { status: 403, jsonBody: { error: 'Keine AIOS-Rolle zugewiesen' } };
  }
  return principal;
}

// ── Effektive Rolle auflösen ──────────────────────────────────
// Die SP-Liste AIOS_Users ist die Autorität für Rollen — NICHT die
// SWA-userRoles. Ohne Role-Management/rolesSource liefert SWA nur
// 'authenticated', nie AIOS.Admin/Editor. Diese Auflösung macht die
// App tenant-portabel: Rollen werden allein über AIOS_Users gepflegt.
export async function resolveEffectiveRole(
  principal: ClientPrincipal,
): Promise<string | null> {
  try {
    const allItems = await listItems('USERS');
    const emailLower = principal.userDetails.toLowerCase();
    const spItem = allItems.find(item => {
      const f = item.fields as Record<string, unknown>;
      return (
        (f['AadUserId'] && String(f['AadUserId']) === principal.userId) ||
        (f['Email'] && String(f['Email']).toLowerCase() === emailLower)
      );
    });
    if (spItem) {
      const u = spToAiosUser(spItem.id, spItem.fields as Record<string, unknown>);
      return u.active ? u.role : null;
    }
  } catch {
    /* Graph-Fehler → SWA-Fallback unten */
  }
  // Fallback: echte SWA-AIOS-Rolle (falls Standard SKU mit Role-Management)
  const swaRole = (principal.userRoles ?? []).find(r => r.startsWith('AIOS.') || r.startsWith('AIOS_'));
  return swaRole ? swaRole.replace(/_/g, '.') : null;
}

export async function requireRole(
  req: HttpRequest,
  roles: AiosRole[],
): Promise<ClientPrincipal | HttpResponseInit> {
  const result = requireAuth(req);
  if ('status' in result) return result;   // Auth-Fehler durchreichen
  const principal = result as ClientPrincipal;

  // Lokaler Mock/Dev: keine SP-Liste verfügbar → SWA-userRoles direkt prüfen
  // (AIOS_DEV_AUTH liefert AIOS.Admin).
  if (MOCK) {
    if (!hasAnyRole(principal, roles)) {
      return { status: 403, jsonBody: { error: `Erforderliche Rolle: ${roles.join(' oder ')}` } };
    }
    return principal;
  }

  const role = await resolveEffectiveRole(principal);
  if (!role || !roles.some(r => r === role)) {
    return {
      status: 403,
      jsonBody: { error: `Erforderliche Rolle: ${roles.join(' oder ')}` },
    };
  }
  return principal;
}

// Hilfsfunktion: Ist es eine Auth-Fehler-Response?
export function isAuthError(v: ClientPrincipal | HttpResponseInit): v is HttpResponseInit {
  return 'status' in v;
}
