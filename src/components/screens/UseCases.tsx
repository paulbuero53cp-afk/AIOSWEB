import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useUseCases } from '@/hooks/useUseCases';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { swrFetcher } from '@/lib/api';
import {
  RiskBadge, LifecycleBadge, KiTypeBadges, ReliabilityBadge,
} from '@/components/common/Badge';
import EditModal from './EditModal';
import type { UseCase } from '@/types';

const PAGE_SIZE = 25;

// ── Filter-State ──────────────────────────────────────────────
interface Filters {
  search: string;
  rt: string;
  lc: string;
  app: string;
  kpi: string;
}

// ── Inline-Select ─────────────────────────────────────────────
function InlineSelect({
  value, options, onChange, disabled,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="inline-sel"
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}
    >
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

// ── UC-Tabelle ────────────────────────────────────────────────
export default function UseCases({ onNav }: { onNav: (s: string, ucId?: string) => void }) {
  const { useCases, loading, updateUC } = useUseCases();
  const { showToast } = useToast();
  const { isEditor, isApprover } = useAuth();

  // Artefakt-Status: { [ucId]: ['ra', 'gc', ...] }
  const { data: artStatus } = useSWR<Record<string, string[]>>(
    '/api/artefakte/status', swrFetcher,
  );

  const [filters, setFilters] = useState<Filters>({
    search: '', rt: '', lc: '', app: '', kpi: '',
  });
  const [sortField, setSortField] = useState<keyof UseCase>('id');
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('asc');
  const [page,      setPage]      = useState(0);
  const [editUC,    setEditUC]    = useState<UseCase | null>(null);

  // ── Filtern ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const s = filters.search.toLowerCase();
    return useCases.filter(uc => {
      if (s && !uc.title.toLowerCase().includes(s) &&
          !uc.id.toLowerCase().includes(s) &&
          !uc.cl.toLowerCase().includes(s)) return false;
      if (filters.rt  && uc.rt  !== filters.rt)  return false;
      if (filters.lc  && uc.lc  !== filters.lc)  return false;
      if (filters.app && uc.app !== filters.app)  return false;
      if (filters.kpi && uc.kpi !== filters.kpi)  return false;
      return true;
    });
  }, [useCases, filters]);

  // ── Sortieren ─────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = String(a[sortField] ?? '');
      const bv = String(b[sortField] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortField, sortDir]);

  // ── Paginieren ────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(field: keyof UseCase) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(0);
  }

  function setFilter(key: keyof Filters, value: string) {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(0);
  }

  // ── Inline-Edit ───────────────────────────────────────────────
  async function handleInlineEdit(uc: UseCase, patch: Partial<UseCase>) {
    try {
      await updateUC(uc.id, patch);
      showToast(`${uc.id} aktualisiert`, 'success');
    } catch (err) {
      showToast(`Fehler: ${String(err)}`, 'error');
    }
  }

  function SortIcon({ field }: { field: keyof UseCase }) {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon" style={{ color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  if (loading) return <div className="empty">Lade Use Cases…</div>;

  return (
    <div>
      {/* Toolbar */}
      <div className="fb">
        <input
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
          placeholder="Suche nach ID, Titel, Cluster…"
          style={{ flex: 1, minWidth: 180 }}
        />
        <select value={filters.rt} onChange={e => setFilter('rt', e.target.value)} style={{ width: 130 }}>
          <option value="">Alle Risk Tier</option>
          {['High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
        </select>
        <select value={filters.lc} onChange={e => setFilter('lc', e.target.value)} style={{ width: 120 }}>
          <option value="">Alle Lifecycle</option>
          {['Idea', 'Build', 'Run', 'Retire'].map(o => <option key={o}>{o}</option>)}
        </select>
        <select value={filters.app} onChange={e => setFilter('app', e.target.value)} style={{ width: 160 }}>
          <option value="">Alle Approval</option>
          {['Not required', 'Pending', 'Approved', 'Rejected'].map(o => <option key={o}>{o}</option>)}
        </select>
        <select value={filters.kpi} onChange={e => setFilter('kpi', e.target.value)} style={{ width: 110 }}>
          <option value="">KPI: Alle</option>
          <option value="yes">KPI: Ja</option>
          <option value="no">KPI: Nein</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => onNav('new')}>
          ➕ Neu
        </button>
      </div>

      {/* Ergebnis-Info */}
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
        {filtered.length} von {useCases.length} Use Cases · Seite {page + 1}/{totalPages}
      </div>

      {/* Tabelle */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('id')}>
                ID <SortIcon field="id" />
              </th>
              <th className="sortable" onClick={() => toggleSort('title')}>
                Titel <SortIcon field="title" />
              </th>
              <th>Cluster</th>
              <th className="sortable" onClick={() => toggleSort('rt')}>
                Risk Tier <SortIcon field="rt" />
              </th>
              <th className="sortable" onClick={() => toggleSort('rl')}>
                R-Tier <SortIcon field="rl" />
              </th>
              <th className="sortable" onClick={() => toggleSort('lc')}>
                Lifecycle <SortIcon field="lc" />
              </th>
              <th>Portfolio</th>
              <th>Approval</th>
              <th>KI-Typ</th>
              <th>KPI</th>
              <th style={{ width: 130 }}>Artefakte</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty">Keine Use Cases gefunden.</td>
              </tr>
            ) : (
              paged.map(uc => (
                <tr
                  key={uc.id}
                  className="clickable"
                  onClick={() => setEditUC(uc)}
                >
                  <td>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--muted)' }}>
                      {uc.id}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--petrol)', fontSize: 13 }}>
                      {uc.title}
                    </div>
                    {uc.legacy && (
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Legacy: {uc.legacy}</div>
                    )}
                  </td>
                  <td>{uc.cl}</td>
                  <td><RiskBadge tier={uc.rt} /></td>
                  <td><ReliabilityBadge tier={uc.rl} /></td>
                  <td><LifecycleBadge lc={uc.lc} /></td>
                  <td>
                    <InlineSelect
                      value={uc.pd}
                      options={['Start', 'Scale', 'Stop', 'Hold', 'Backlog']}
                      disabled={!isEditor}
                      onChange={v => handleInlineEdit(uc, { pd: v as UseCase['pd'] })}
                    />
                  </td>
                  <td>
                    <InlineSelect
                      value={uc.app}
                      options={['Not required', 'Pending', 'Approved', 'Rejected']}
                      disabled={!isApprover}
                      onChange={v => handleInlineEdit(uc, { app: v as UseCase['app'] })}
                    />
                  </td>
                  <td><KiTypeBadges kiType={uc.kiType} /></td>
                  <td>
                    <span className={`badge ${uc.kpi === 'yes' ? 'bg' : 'bgr'}`}>
                      {uc.kpi === 'yes' ? 'Ja' : 'Nein'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {[
                        { label: 'RA',  artKey: 'ra',   screen: 'riskassess', title: 'Risk Assessment' },
                        { label: 'GC',  artKey: 'gc',   screen: 'gatechecks', title: 'Gate Checks' },
                        { label: 'BC',  artKey: 'bc',   screen: 'bizcases',   title: 'Business Case' },
                        { label: 'DSFA',artKey: 'dsfa', screen: 'dsfa',       title: 'DSFA' },
                      ].map(({ label, artKey, screen, title }) => {
                        const done = artStatus?.[uc.id]?.includes(artKey) ?? false;
                        return (
                          <button
                            key={screen}
                            className={`btn btn-sm${done ? ' btn-primary' : ' btn-outline'}`}
                            style={{ fontSize: 10, padding: '2px 6px', opacity: done ? 1 : 0.65 }}
                            title={`${title}${done ? ' ✓' : ' — noch nicht ausgefüllt'}`}
                            onClick={() => onNav(screen, uc.id)}
                          >
                            {label}{done ? ' ✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <button
            className="btn btn-outline btn-sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >← Zurück</button>
          <span style={{ lineHeight: '32px', fontSize: 13, color: 'var(--muted)' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            className="btn btn-outline btn-sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >Weiter →</button>
        </div>
      )}

      {/* Edit Modal */}
      <EditModal
        uc={editUC}
        onClose={() => setEditUC(null)}
        artStatus={artStatus}
        onNavToArt={(screen, ucId) => { setEditUC(null); onNav(screen, ucId); }}
      />
    </div>
  );
}
