import { useState } from 'react';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useAuth } from '@/context/AuthContext';
import { useLang, useTx } from '@/context/LanguageContext';
import type { AuditEntry } from '@/types';

const ENTITY_OPTS = ['', 'UseCase', 'Incident', 'Artefakt'];

const ACTION_COLOR: Record<string, string> = {
  create:       'bg',
  approve:      'bg',
  reject:       'br',
  delete:       'br',
  edit:         'by',
  'inline-edit':'by',
  'save-artefakt': 'bp',
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLOR[action] ?? 'bp';
  return <span className={`badge ${cls}`} style={{ fontSize: 11 }}>{action}</span>;
}

function DiffCell({ diff }: { diff: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const tx = useTx();
  const keys = Object.keys(diff);
  if (keys.length === 0) return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>;

  return (
    <div>
      <button className="btn btn-sm btn-outline" style={{ fontSize: 11, padding: '1px 8px' }}
        onClick={() => setOpen(o => !o)}>
        {keys.length} {tx(keys.length !== 1 ? 'Felder' : 'Feld')} {open ? '▲' : '▼'}
      </button>
      {open && (
        <pre style={{
          marginTop: 6, fontSize: 11, background: 'var(--bg-secondary, #f8f9fa)',
          border: '1px solid var(--border)', borderRadius: 4,
          padding: '6px 8px', maxWidth: 320, overflowX: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {JSON.stringify(diff, null, 2)}
        </pre>
      )}
    </div>
  );
}

function formatTs(ts: string, locale: string) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(locale, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ts; }
}

export default function AuditLog() {
  const { isAdmin } = useAuth();
  const { lang } = useLang();
  const tx = useTx();
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const [entityFilter, setEntityFilter] = useState('');
  const [limit, setLimit] = useState(100);
  const { entries, loading, error, refresh } = useAuditLog(limit);

  if (!isAdmin) {
    return (
      <div>
        <div className="sec-title">Audit Log</div>
        <div className="empty">{tx('🔒 Nur Administratoren können das Audit Log einsehen.')}</div>
      </div>
    );
  }

  const visible = entityFilter
    ? entries.filter((e: AuditEntry) => e.entity === entityFilter)
    : entries;

  return (
    <div>
      <div className="sec-title">Audit Log</div>
      <div className="sec-sub">{tx('Lückenlose Protokollierung aller Änderungen')}</div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="filter-select" value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}>
          {ENTITY_OPTS.map(o => (
            <option key={o} value={o}>{o || tx('Alle Entitäten')}</option>
          ))}
        </select>

        <select className="filter-select" value={limit}
          onChange={e => setLimit(Number(e.target.value))}>
          {[50, 100, 250, 500].map(n => (
            <option key={n} value={n}>Max {n} {tx('Einträge')}</option>
          ))}
        </select>

        <button className="btn btn-sm btn-outline" onClick={() => refresh()}>↺ {tx('Aktualisieren')}</button>

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
          {visible.length} {tx('Einträge')}
        </span>
      </div>

      {loading && <div className="empty">{tx('Lade Audit Log…')}</div>}
      {error   && <div className="empty" style={{ color: 'var(--danger)' }}>{tx('Fehler')}: {error.message}</div>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="uc-table">
            <thead>
              <tr>
                <th>{tx('Zeitpunkt')}</th>
                <th>{tx('Nutzer')}</th>
                <th>{tx('Aktion')}</th>
                <th>{tx('Entität')}</th>
                <th>ID</th>
                <th>{tx('Kommentar')}</th>
                <th>{tx('Änderungen')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>{tx('Keine Einträge')}</td></tr>
              )}
              {visible.map((e: AuditEntry) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{formatTs(e.ts, locale)}</td>
                  <td style={{ fontSize: 12 }}>{e.actor}</td>
                  <td><ActionBadge action={e.action} /></td>
                  <td style={{ fontSize: 12 }}>{e.entity}</td>
                  <td style={{ fontFamily: 'DM Mono,monospace', fontSize: 12 }}>{e.entityId}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{e.comment || '—'}</td>
                  <td><DiffCell diff={e.diff ?? {}} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
