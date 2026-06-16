// ─────────────────────────────────────────────────────────────
//  AIOS — Benutzerverwaltung (Admin-only)
//  Zeigt alle AIOS_Users, erlaubt Rolle ändern, sperren, löschen,
//  sowie neue Benutzer per E-Mail einladen.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { swrFetcher, apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLang, useT, useTx } from '@/context/LanguageContext';
import type { AiosUser, AiosRoleValue } from '@/types';

const ROLES: AiosRoleValue[] = ['AIOS.Viewer', 'AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin'];

const ROLE_LABEL: Record<AiosRoleValue, string> = {
  'AIOS.Viewer':   'Viewer',
  'AIOS.Editor':   'Editor',
  'AIOS.Approver': 'Approver',
  'AIOS.Admin':    'Admin',
};

const ROLE_COLOR: Record<AiosRoleValue, string> = {
  'AIOS.Viewer':   '#6c757d',
  'AIOS.Editor':   '#0d6efd',
  'AIOS.Approver': '#6610f2',
  'AIOS.Admin':    '#198754',
};

// ── Invite Form ───────────────────────────────────────────────
function InviteForm({ onDone }: { onDone: () => void }) {
  const { showToast } = useToast();
  const t = useT();
  const tx = useTx();
  const [email, setEmail]   = useState('');
  const [name, setName]     = useState('');
  const [role, setRole]     = useState<AiosRoleValue>('AIOS.Viewer');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), displayName: name.trim() || email.trim(), role }),
      });
      showToast(t('usr.created', { email }), 'success');
      mutate('/api/users');
      onDone();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('usr.createErr'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', padding: '16px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>{tx('E-Mail *')}</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="max.mustermann@firma.de"
          style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, width: 240 }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>{tx('Name')}</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Max Mustermann"
          style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, width: 200 }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>{tx('Rolle')}</label>
        <select
          value={role}
          onChange={e => setRole(e.target.value as AiosRoleValue)}
          style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
        >
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </div>
      <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
        {saving ? '…' : tx('+ Benutzer anlegen')}
      </button>
      <button
        className="btn btn-outline btn-sm"
        type="button"
        onClick={onDone}
        style={{ marginLeft: 4 }}
      >
        {tx('Abbrechen')}
      </button>
    </form>
  );
}

// ── Row ───────────────────────────────────────────────────────
function UserRow({
  user,
  currentUserId,
}: {
  user: AiosUser;
  currentUserId: string;
}) {
  const { showToast } = useToast();
  const { lang } = useLang();
  const t = useT();
  const tx = useTx();
  const [roleVal, setRoleVal]   = useState<AiosRoleValue>(user.role as AiosRoleValue);
  const [saving, setSaving]     = useState(false);
  const isSelf = user.aadUserId === currentUserId;

  async function changeRole(newRole: AiosRoleValue) {
    setRoleVal(newRole);
    setSaving(true);
    try {
      await apiFetch(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      showToast(t('usr.roleSet', { email: user.email, role: ROLE_LABEL[newRole] }), 'success');
      mutate('/api/users');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('common.errorPrefix'), 'error');
      setRoleVal(user.role as AiosRoleValue);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    setSaving(true);
    try {
      await apiFetch(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !user.active }),
      });
      showToast(user.active ? t('usr.locked', { email: user.email }) : t('usr.unlocked', { email: user.email }), 'success');
      mutate('/api/users');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('common.errorPrefix'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!confirm(t('usr.confirmDelete', { email: user.email }))) return;
    setSaving(true);
    try {
      await apiFetch(`/users/${user.id}`, { method: 'DELETE' });
      showToast(t('usr.deleted', { email: user.email }), 'success');
      mutate('/api/users');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('common.errorPrefix'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const lastLogin = user.lastLogin
    ? new Date(user.lastLogin).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  return (
    <tr style={{ opacity: user.active ? 1 : 0.5 }}>
      <td>
        <div style={{ fontWeight: 500, fontSize: 13.5 }}>{user.displayName || user.email}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{user.email}</div>
      </td>
      <td>
        <select
          value={roleVal}
          onChange={e => changeRole(e.target.value as AiosRoleValue)}
          disabled={saving || isSelf}
          title={isSelf ? tx('Eigene Rolle kann nicht geändert werden') : undefined}
          style={{
            padding: '3px 8px',
            border: `1.5px solid ${ROLE_COLOR[roleVal]}`,
            borderRadius: 5,
            color: ROLE_COLOR[roleVal],
            fontWeight: 600,
            fontSize: 12,
            background: 'transparent',
            cursor: isSelf ? 'not-allowed' : 'pointer',
          }}
        >
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </td>
      <td>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 10,
            fontSize: 11.5,
            fontWeight: 600,
            background: user.active ? 'var(--success-pale, #d1fae5)' : 'var(--danger-pale, #fee2e2)',
            color: user.active ? '#059669' : '#dc2626',
          }}
        >
          {user.active ? tx('Aktiv') : tx('Gesperrt')}
        </span>
      </td>
      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{lastLogin}</td>
      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
        {user.invitedBy || '—'}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`btn btn-sm ${user.active ? 'btn-outline' : 'btn-primary'}`}
            onClick={toggleActive}
            disabled={saving || isSelf}
            title={isSelf ? tx('Eigenen Account nicht sperren') : (user.active ? tx('Sperren') : tx('Entsperren'))}
            style={{ fontSize: 11 }}
          >
            {user.active ? tx('🔒 Sperren') : tx('🔓 Entsperren')}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={deleteUser}
            disabled={saving || isSelf}
            title={isSelf ? tx('Eigenen Account nicht löschen') : tx('Benutzer löschen')}
            style={{ fontSize: 11, color: '#dc2626', borderColor: '#dc2626' }}
          >
            🗑
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function UsersScreen() {
  const { isAdmin, aiosUser } = useAuth();
  const tx = useTx();
  const { data: users, isLoading, error } = useSWR<AiosUser[]>('/api/users', swrFetcher);
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch]         = useState('');

  if (!isAdmin) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
        {tx('🔒 Diese Seite ist nur für Administratoren zugänglich.')}
      </div>
    );
  }

  const filtered = (users ?? []).filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  const total   = (users ?? []).length;
  const active  = (users ?? []).filter(u => u.active).length;
  const byRole  = ROLES.map(r => ({ role: r, count: (users ?? []).filter(u => u.role === r).length }));

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{tx('Benutzerverwaltung')}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          {tx('Rollen und Zugriff für AIOS-Benutzer verwalten')}
        </p>
      </div>

      {/* KPI-Zeile */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="kpi-card" style={{ minWidth: 120 }}>
          <div className="kpi-val">{total}</div>
          <div className="kpi-lbl">{tx('Benutzer gesamt')}</div>
        </div>
        <div className="kpi-card" style={{ minWidth: 120 }}>
          <div className="kpi-val" style={{ color: '#059669' }}>{active}</div>
          <div className="kpi-lbl">{tx('Aktiv')}</div>
        </div>
        {byRole.map(({ role, count }) => (
          <div className="kpi-card" key={role} style={{ minWidth: 100 }}>
            <div className="kpi-val" style={{ color: ROLE_COLOR[role], fontSize: 20 }}>{count}</div>
            <div className="kpi-lbl">{ROLE_LABEL[role]}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder={tx('Suche nach Name oder E-Mail…')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, width: 260 }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowInvite(v => !v)}
        >
          {showInvite ? tx('✕ Abbrechen') : tx('+ Benutzer einladen')}
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && <InviteForm onDone={() => setShowInvite(false)} />}

      {/* Bootstrap-Hinweis */}
      {!isLoading && total === 0 && (
        <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          ⚠️ <strong>{tx('Keine Benutzer gefunden.')}</strong> {tx('Lege zunächst dich selbst als Admin an, damit die SP-Listenverwaltung aktiv wird. Trage die E-Mail-Adresse ein, mit der du dich bei Azure AD anmeldest.')}
        </div>
      )}

      {/* Tabelle */}
      {isLoading && <div style={{ padding: 24, color: 'var(--muted)' }}>{tx('Lädt…')}</div>}
      {error   && <div style={{ padding: 24, color: 'var(--danger, #dc2626)' }}>{tx('Fehler')}: {String(error)}</div>}

      {!isLoading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>{tx('Benutzer')}</th>
                <th>{tx('Rolle')}</th>
                <th>Status</th>
                <th>{tx('Letzter Login')}</th>
                <th>{tx('Eingeladen von')}</th>
                <th>{tx('Aktionen')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                  {tx('Keine Benutzer gefunden')}
                </td></tr>
              )}
              {filtered.map(u => (
                <UserRow key={u.id} user={u} currentUserId={aiosUser?.aadUserId ?? ''} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info-Box */}
      <div style={{ marginTop: 24, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
        <strong>{tx('Hinweis:')}</strong> {tx('Benutzer mit SWA-Rollen (Azure Portal → Role Management) behalten ihren Zugriff als Fallback, solange kein Eintrag in der AIOS_Users-Liste vorhanden ist. Nach Anlage eines Eintrags hier wird dieser bevorzugt.')}
      </div>
    </div>
  );
}
