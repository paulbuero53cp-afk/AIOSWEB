// ─────────────────────────────────────────────────────────────
//  AIOS — Auth Helpers
//  SWA injiziert x-ms-client-principal als Base64-JSON Header
//  Defense in Depth: Rollencheck im Frontend UND in der Function
// ─────────────────────────────────────────────────────────────

import { HttpRequest, HttpResponseInit } from '@azure/functions';

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
    // Lokal (swa-cli) sendet ggf. keinen Header — Entwicklungsmodus
    if (process.env.FUNCTIONS_WORKER_RUNTIME && process.env.NODE_ENV !== 'production') {
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
  // Akzeptiere AIOS-Rollen (Standard SKU) ODER schlicht 'authenticated' (Free SKU)
  const hasAios = hasAnyRole(principal, ['AIOS.Viewer', 'AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin',
                                          'AIOS_Viewer', 'AIOS_Editor', 'AIOS_Approver', 'AIOS_Admin']);
  const isAuthenticated = principal.userRoles?.includes('authenticated') ?? false;
  if (!hasAios && !isAuthenticated) {
    return { status: 403, jsonBody: { error: 'Keine AIOS-Rolle zugewiesen' } };
  }
  return principal;
}

export function requireRole(
  req: HttpRequest,
  roles: AiosRole[],
): ClientPrincipal | HttpResponseInit {
  const result = requireAuth(req);
  if ('status' in result) return result;   // Auth-Fehler durchreichen
  const principal = result as ClientPrincipal;
  if (!hasAnyRole(principal, roles)) {
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
