import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { AiosRole, ClientPrincipal } from '@/types';

// ─────────────────────────────────────────────────────────────
//  AuthContext — liest /.auth/me (SWA Built-in Auth)
//  Kein MSAL.js nötig — SWA verwaltet Token & Refresh
// ─────────────────────────────────────────────────────────────

interface AuthState {
  principal: ClientPrincipal | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: AiosRole) => boolean;
  hasAnyRole: (roles: AiosRole[]) => boolean;
  // Convenience
  isViewer: boolean;
  isEditor: boolean;
  isApprover: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState<ClientPrincipal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/.auth/me')
      .then(r => r.json())
      .then((data: { clientPrincipal: ClientPrincipal | null }) => {
        setPrincipal(data.clientPrincipal);
      })
      .catch(() => {
        // Im lokalen Dev (swa-cli) ist /.auth/me immer erreichbar
        // Bei echtem Fehler → nicht eingeloggt
        setPrincipal(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const hasRole = (role: AiosRole): boolean =>
    principal?.userRoles?.includes(role) ?? false;

  const hasAnyRole = (roles: AiosRole[]): boolean =>
    roles.some(r => hasRole(r));

  const value: AuthState = {
    principal,
    loading,
    isAuthenticated: principal !== null,
    hasRole,
    hasAnyRole,
    isViewer: hasAnyRole(['AIOS.Viewer', 'AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']),
    isEditor: hasAnyRole(['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']),
    isApprover: hasAnyRole(['AIOS.Approver', 'AIOS.Admin']),
    isAdmin: hasRole('AIOS.Admin'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
