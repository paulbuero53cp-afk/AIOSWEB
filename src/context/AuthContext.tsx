import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { AiosRole, AiosUser, ClientPrincipal } from '@/types';

// ─────────────────────────────────────────────────────────────
//  AuthContext — SWA Built-in Auth (Identität) +
//               AIOS_Users SP-Liste (Rolle, primär)
//
//  Role Resolution:
//    1. /api/users/me → Rolle aus AIOS_Users SP-Liste
//    2. Nicht gefunden → SWA userRoles als Fallback
//    3. Beides leer → isAuthenticated=false (→ Zugriff verweigert)
// ─────────────────────────────────────────────────────────────

interface AuthState {
  principal: ClientPrincipal | null;
  aiosUser: AiosUser | null;       // Benutzer-Profil inkl. SP-Rolle
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: AiosRole) => boolean;
  hasAnyRole: (roles: AiosRole[]) => boolean;
  // Convenience
  isViewer: boolean;
  isEditor: boolean;
  isApprover: boolean;
  isAdmin: boolean;
  // Reload nach Rollenwechsel
  reloadUser: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState<ClientPrincipal | null>(null);
  const [aiosUser, setAiosUser]   = useState<AiosUser | null>(null);
  const [loading, setLoading]     = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Schritt 1: Identität aus SWA /.auth/me
    fetch('/.auth/me')
      .then(r => r.json())
      .then(async (data: { clientPrincipal: ClientPrincipal | null }) => {
        if (cancelled) return;
        const cp = data.clientPrincipal;
        setPrincipal(cp);

        if (!cp) {
          setAiosUser(null);
          setLoading(false);
          return;
        }

        // Schritt 2: Rolle aus AIOS_Users SP-Liste (via API)
        try {
          const res = await fetch('/api/users/me');
          if (cancelled) return;
          if (res.ok) {
            const user = (await res.json()) as AiosUser;
            setAiosUser(user);
          } else if (res.status === 403) {
            // Explizit gesperrter Account (active=false)
            const body = await res.json().catch(() => ({}) as Record<string, string>);
            if (String(body.error ?? '').includes('gesperrt')) {
              setAiosUser(null); // bleibt null → "Kein Zugriff"-Screen
            } else {
              // "Nicht gefunden" — Viewer-Fallback damit Login funktioniert
              setAiosUser(_buildFallbackUser(cp, 'AIOS.Viewer'));
            }
          } else {
            // API-Fehler (5xx etc.) → SWA-Rolle oder Viewer-Fallback
            const swaRole = cp.userRoles?.find(r => r.startsWith('AIOS.'));
            setAiosUser(_buildFallbackUser(cp, swaRole ?? 'AIOS.Viewer'));
          }
        } catch {
          // Netzwerkfehler → Viewer-Fallback
          const swaRole = cp.userRoles?.find(r => r.startsWith('AIOS.'));
          setAiosUser(_buildFallbackUser(cp, swaRole ?? 'AIOS.Viewer'));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrincipal(null);
          setAiosUser(null);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [reloadKey]);

  const resolvedRole = aiosUser?.role ?? '';

  const hasRole = (role: AiosRole): boolean => resolvedRole === role;

  const hasAnyRole = (roles: AiosRole[]): boolean =>
    roles.some(r => resolvedRole === r);

  const value: AuthState = {
    principal,
    aiosUser,
    loading,
    // isAuthenticated = bei Azure AD eingeloggt (principal != null)
    // isAuthorized    = hat AIOS-Eintrag/Rolle (aiosUser != null)
    isAuthenticated: principal !== null,
    hasRole,
    hasAnyRole,
    isViewer:   hasAnyRole(['AIOS.Viewer', 'AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']),
    isEditor:   hasAnyRole(['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']),
    isApprover: hasAnyRole(['AIOS.Approver', 'AIOS.Admin']),
    isAdmin:    hasRole('AIOS.Admin'),
    reloadUser: () => setReloadKey(k => k + 1),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function _buildFallbackUser(cp: ClientPrincipal, role: string): AiosUser {
  return {
    id: '',
    email:       cp.userDetails,
    displayName: cp.userDetails,
    aadUserId:   cp.userId,
    role:        role as AiosUser['role'],
    active:      true,
    invitedAt:   '',
    invitedBy:   'SWA-Fallback',
    lastLogin:   new Date().toISOString(),
  };
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
