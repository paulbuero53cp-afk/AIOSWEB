import { useState } from 'react';
import useSWR from 'swr';
import { useUseCases } from '@/hooks/useUseCases';
import { useIncidents } from '@/hooks/useIncidents';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { swrFetcher } from '@/lib/api';
import {
  exportUseCasesCSV, exportIncidentsCSV, exportComplianceCSV,
  exportArtefakteJSON, exportAuditLogCSV, exportExcel,
} from '@/lib/exports';
import type { UseCase, AuditEntry } from '@/types';

// ── Artefakt-Status ───────────────────────────────────────────
type ArtType = 'ra' | 'gc' | 'bc' | 'dsfa';
const ART_LABELS: Record<ArtType, string> = {
  ra: 'Risk Assessment', gc: 'Gate-Checks', bc: 'Business Case', dsfa: 'DSFA',
};
const ART_ICONS: Record<ArtType, string> = {
  ra: '⚠', gc: '✓', bc: '📈', dsfa: '🔒',
};

function ArtBadge({ hasData, label, icon, onClick }: {
  hasData: boolean; label: string; icon: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px',
        borderRadius: 6, border: `1px solid ${hasData ? 'var(--green)' : 'var(--border)'}`,
        background: hasData ? 'var(--green-bg)' : 'var(--surface2)',
        color: hasData ? 'var(--green)' : 'var(--muted)',
        fontSize: 11, fontWeight: 600, cursor: 'pointer',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {hasData ? <span>✓</span> : <span style={{ opacity: .5 }}>—</span>}
    </button>
  );
}

// ── Compliance-Ampel ──────────────────────────────────────────
function ComplianceLight({ uc, hub }: {
  uc: UseCase; hub: Record<string, unknown> | undefined;
}) {
  if (!hub) return <span className="badge bgr" style={{ fontSize: 10 }}>—</span>;
  const ra   = Object.keys((hub as Record<string, Record<string, unknown>>).ra   ?? {}).length > 0;
  const gc   = Object.keys((hub as Record<string, Record<string, unknown>>).gc   ?? {}).length > 0;
  const dsfa = Object.keys((hub as Record<string, Record<string, unknown>>).dsfa ?? {}).length > 0;
  const needsDsfa = uc.gt?.some(Boolean) || uc.rt === 'High';

  const ok = ra && gc && (!needsDsfa || dsfa);
  const partial = ra || gc;
  return (
    <span className={`badge ${ok ? 'bg' : partial ? 'by' : 'br'}`} style={{ fontSize: 10 }}>
      {ok ? '✓ Vollständig' : partial ? '◐ Teilweise' : '✕ Offen'}
    </span>
  );
}

// ── Export-Dropdown ───────────────────────────────────────────
function ExportDropdown({ useCases, incidents, isAdmin }: {
  useCases: UseCase[];
  incidents: import('@/types').Incident[];
  isAdmin: boolean;
}) {
  const [open, setOpen]   = useState(false);
  const { showToast }     = useToast();
  const { data: artExport } = useSWR<Record<string, Record<string, unknown>>>(
    isAdmin ? '/api/artefakte/export' : null, swrFetcher,
  );
  const { data: auditData } = useSWR<AuditEntry[]>(
    isAdmin ? '/api/auditlog?limit=500' : null, swrFetcher,
  );

  const artDB = {
    ra:   (artExport?.ra   ?? {}) as Record<string, Record<string, unknown>>,
    gc:   (artExport?.gc   ?? {}) as Record<string, Record<string, unknown>>,
    bc:   (artExport?.bc   ?? {}) as Record<string, Record<string, unknown>>,
    dsfa: (artExport?.dsfa ?? {}) as Record<string, Record<string, unknown>>,
  };

  async function run(fn: () => void | Promise<void>, label: string) {
    try {
      await fn();
      showToast(`✓ ${label} exportiert`, 'success');
    } catch (err) {
      showToast(`Export fehlgeschlagen: ${String(err)}`, 'error');
    }
    setOpen(false);
  }

  return (
    <div className="csv-drop">
      <button className="btn btn-outline" onClick={() => setOpen(o => !o)}>
        ↓ Exportieren
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div className="csv-drop-menu open" style={{ zIndex: 100 }}>
            <button className="csv-drop-item" onClick={() => run(() => exportUseCasesCSV(useCases), 'Use Cases CSV')}>
              <span className="csv-di-icon">↓</span> Use Cases (CSV)
            </button>
            <button className="csv-drop-item" onClick={() => run(() => exportIncidentsCSV(incidents), 'Incidents CSV')}>
              <span className="csv-di-icon">↓</span> Incidents (CSV)
            </button>
            <button className="csv-drop-item" onClick={() => run(() => exportComplianceCSV({ useCases, artDB }), 'Compliance-Status CSV')}>
              <span className="csv-di-icon">↓</span> Compliance-Status (CSV)
            </button>
            <button className="csv-drop-item" onClick={() => run(() => exportExcel(useCases, incidents), 'Excel')}>
              <span className="csv-di-icon">↓</span> Alle Daten (Excel .xlsx)
            </button>
            {isAdmin && (
              <>
                <div className="csv-drop-divider" />
                <button className="csv-drop-item" onClick={() => run(() => exportArtefakteJSON(artDB), 'Artefakte JSON')}>
                  <span className="csv-di-icon">↓</span> Artefakte (JSON)
                </button>
                <button className="csv-drop-item" onClick={() => run(() => exportAuditLogCSV(auditData ?? []), 'Audit Log CSV')}>
                  <span className="csv-di-icon">↓</span> Audit Log (CSV)
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Hub-Zeile ─────────────────────────────────────────────────
function HubRow({ uc, hub, onNav }: {
  uc: UseCase;
  hub: Record<string, unknown> | undefined;
  onNav: (screen: string, ucId?: string) => void;
}) {
  const h = hub as Record<ArtType, Record<string, unknown>> | undefined;

  function navTo(screen: string) {
    // Navigiert zum Artefakt-Screen; UC-Auswahl wird über URL-State simuliert
    // Im nächsten Ausbau: URL-Parameter oder Context übergeben
    onNav(screen);
  }

  return (
    <tr className="clickable">
      <td>
        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: 'var(--muted)' }}>{uc.id}</div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--petrol)' }}>{uc.title}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{uc.cl} · {uc.lc}</div>
      </td>
      <td>
        <ComplianceLight uc={uc} hub={hub} />
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(ART_LABELS) as ArtType[]).map(type => (
            <ArtBadge
              key={type}
              icon={ART_ICONS[type]}
              label={ART_LABELS[type]}
              hasData={Object.keys(h?.[type] ?? {}).length > 0}
              onClick={() => navTo(
                type === 'ra' ? 'riskassess' :
                type === 'gc' ? 'gatechecks' :
                type === 'bc' ? 'bizcases' : 'dsfa'
              )}
            />
          ))}
        </div>
      </td>
      <td>
        <span className={`badge ${uc.rt === 'High' ? 'br' : uc.rt === 'Medium' ? 'by' : 'bg'}`}>
          {uc.rt}
        </span>
      </td>
      <td>
        <span className={`badge ${uc.app === 'Approved' ? 'bg' : uc.app === 'Pending' ? 'by' : uc.app === 'Rejected' ? 'br' : 'bgr'}`}>
          {uc.app}
        </span>
      </td>
    </tr>
  );
}

// ── Dokumentations-Hub ────────────────────────────────────────
export default function ArtefaktHub({ onNav }: { onNav: (s: string) => void }) {
  const { useCases, loading } = useUseCases();
  const { incidents }         = useIncidents();
  const { isAdmin }           = useAuth();
  const [search, setSearch]   = useState('');

  // Alle Artefakte als Gesamt-Export (für Admin)
  const { data: artExport } = useSWR<Record<string, Record<string, unknown>>>(
    isAdmin ? '/api/artefakte/export' : null, swrFetcher,
  );

  // Pro UC: /api/artefakte/all/{ucId} — zu teuer für alle UCs gleichzeitig
  // Stattdessen: artExport aufdröseln
  function hubForUC(ucId: string): Record<ArtType, Record<string, unknown>> | undefined {
    if (!artExport) return undefined;
    return {
      ra:   ((artExport.ra   ?? {}) as Record<string, Record<string, unknown>>)[ucId] ?? {},
      gc:   ((artExport.gc   ?? {}) as Record<string, Record<string, unknown>>)[ucId] ?? {},
      bc:   ((artExport.bc   ?? {}) as Record<string, Record<string, unknown>>)[ucId] ?? {},
      dsfa: ((artExport.dsfa ?? {}) as Record<string, Record<string, unknown>>)[ucId] ?? {},
    };
  }

  // KPIs
  const total     = useCases.length;
  const withRA    = useCases.filter(u => Object.keys(hubForUC(u.id)?.ra   ?? {}).length > 0).length;
  const withDSFA  = useCases.filter(u => Object.keys(hubForUC(u.id)?.dsfa ?? {}).length > 0).length;
  const needsDSFA = useCases.filter(u => u.gt?.some(Boolean) || u.rt === 'High').length;

  const filtered = useCases.filter(u => {
    const s = search.toLowerCase();
    return !s || u.title.toLowerCase().includes(s) || u.id.toLowerCase().includes(s) || u.cl.toLowerCase().includes(s);
  });

  if (loading) return <div className="empty">Lade Dokumentations-Hub…</div>;

  return (
    <div>
      {/* KPI-Leiste */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="kc"><div className="kc-label">Use Cases gesamt</div><div className="kc-value">{total}</div></div>
        <div className={`kc ${withRA === total ? 'green' : 'yellow'}`}>
          <div className="kc-label">Mit Risk Assessment</div><div className="kc-value">{withRA}</div>
        </div>
        <div className={`kc ${needsDSFA > 0 && withDSFA < needsDSFA ? 'red' : 'green'}`}>
          <div className="kc-label">DSFA benötigt</div>
          <div className="kc-value">{needsDSFA}</div>
          <div className="kc-sub">{withDSFA} ausgefüllt</div>
        </div>
        <div className="kc">
          <div className="kc-label">Incidents gesamt</div>
          <div className="kc-value">{incidents.length}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="fb" style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Use Case suchen…"
          style={{ flex: 1 }}
        />
        <ExportDropdown useCases={useCases} incidents={incidents} isAdmin={isAdmin} />
      </div>

      {/* Tabelle */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Use Case</th>
              <th>Compliance</th>
              <th>Artefakte</th>
              <th>Risk Tier</th>
              <th>Approval</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="empty">Keine Ergebnisse.</td></tr>
            ) : (
              filtered.map(uc => (
                <HubRow
                  key={uc.id}
                  uc={uc}
                  hub={artExport ? hubForUC(uc.id) : undefined}
                  onNav={onNav}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isAdmin && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Export und vollständige Artefakt-Übersicht sind nur für Administratoren verfügbar.
        </div>
      )}
    </div>
  );
}
