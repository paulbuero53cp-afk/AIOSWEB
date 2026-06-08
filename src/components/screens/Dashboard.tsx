import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { useUseCases, useIncidents } from '@/hooks/useUseCases';
import { useAuth } from '@/context/AuthContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { RiskBadge, ApprovalBadge, LifecycleBadge } from '@/components/common/Badge';
import type { AuditEntry, UseCase } from '@/types';

// ── KPI-Kachel ────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color,
}: {
  label: string; value: number | string; sub?: string; color?: 'red' | 'yellow' | 'green';
}) {
  return (
    <div className={`kc${color ? ' ' + color : ''}`}>
      <div className="kc-label">{label}</div>
      <div className="kc-value">{value}</div>
      {sub && <div className="kc-sub">{sub}</div>}
    </div>
  );
}

// ── Portfolio-Snapshot ────────────────────────────────────────
const PD_LABELS: Record<string, string> = {
  Start: '▶ Start', Scale: '⬆ Scale', Stop: '⏹ Stop', Hold: '⏸ Hold', Backlog: '… Backlog',
};
const PD_COLORS: Record<string, string> = {
  Start: 'var(--green)', Scale: 'var(--accent)', Stop: 'var(--red)', Hold: 'var(--yellow)', Backlog: '#8a9fa0',
};

function PortfolioSnapshot({ useCases }: { useCases: UseCase[] }) {
  const counts = useCases.reduce<Record<string, number>>((acc, uc) => {
    acc[uc.pd] = (acc[uc.pd] ?? 0) + 1;
    return acc;
  }, {});
  const total = useCases.length;

  return (
    <div className="card">
      <div className="ch"><span className="ch-title">Portfolio Decision</span></div>
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['Start', 'Scale', 'Stop', 'Hold', 'Backlog'].map(pd => {
          const count = counts[pd] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={pd}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: PD_COLORS[pd] }}>{PD_LABELS[pd]}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{count}</span>
              </div>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                <div style={{ width: `${pct}%`, height: 5, borderRadius: 3, background: PD_COLORS[pd], transition: 'width .4s' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Risk-Verteilung ───────────────────────────────────────────
function RiskSnapshot({ useCases }: { useCases: UseCase[] }) {
  const high   = useCases.filter(u => u.rt === 'High').length;
  const medium = useCases.filter(u => u.rt === 'Medium').length;
  const low    = useCases.filter(u => u.rt === 'Low').length;
  const total  = useCases.length;

  return (
    <div className="card">
      <div className="ch"><span className="ch-title">Risk-Verteilung</span></div>
      <div style={{ padding: '14px 20px' }}>
        {[
          { label: 'High',   count: high,   color: 'var(--red)' },
          { label: 'Medium', count: medium, color: 'var(--yellow)' },
          { label: 'Low',    count: low,    color: 'var(--green)' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{count}</span>
            </div>
            <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
              <div style={{ width: total > 0 ? `${Math.round((count / total) * 100)}%` : '0%', height: 5, borderRadius: 3, background: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Aktivitätsstrom ───────────────────────────────────────────
function ActivityStream() {
  const { isAdmin } = useAuth();
  const { data } = useSWR<AuditEntry[]>(
    isAdmin ? '/api/auditlog?limit=10' : null,
    swrFetcher,
  );

  if (!isAdmin) {
    return (
      <div className="card">
        <div className="ch"><span className="ch-title">Aktivitätsprotokoll</span></div>
        <div className="empty">Nur für Administratoren sichtbar.</div>
      </div>
    );
  }

  const ACTION_ICONS: Record<string, string> = {
    create: '➕', edit: '✏️', approve: '✅', reject: '❌',
    delete: '🗑', 'save-artefakt': '💾', 'inline-edit': '✏',
  };

  return (
    <div className="card">
      <div className="ch"><span className="ch-title">Letzte Aktivitäten</span></div>
      {!data ? (
        <div className="empty">Lade…</div>
      ) : data.length === 0 ? (
        <div className="empty">Noch keine Einträge.</div>
      ) : (
        <div>
          {data.slice(0, 10).map(entry => (
            <div key={entry.id} className="li">
              <div className="li-hd">
                <span>{ACTION_ICONS[entry.action] ?? '•'}</span>
                <strong style={{ fontSize: 13, color: 'var(--petrol)' }}>{entry.entityId}</strong>
                <span className="badge bgr" style={{ fontSize: 10 }}>{entry.action}</span>
              </div>
              <div className="li-meta">
                {entry.actor} · {new Date(entry.ts).toLocaleString('de-DE')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Kritische Use Cases ───────────────────────────────────────
function CriticalItems({
  useCases,
  onNav,
}: {
  useCases: UseCase[];
  onNav: (screen: string) => void;
}) {
  const critical = useCases
    .filter(u => u.rt === 'High' || u.app === 'Pending')
    .slice(0, 5);

  return (
    <div className="card">
      <div className="ch">
        <span className="ch-title">⚠ Kritisch / Ausstehend</span>
        <button className="btn btn-outline btn-sm" onClick={() => onNav('governance')}>
          Alle →
        </button>
      </div>
      {critical.length === 0 ? (
        <div className="empty">Keine kritischen Use Cases.</div>
      ) : (
        <div>
          {critical.map(uc => (
            <div key={uc.id} className="li" style={{ cursor: 'pointer' }} onClick={() => onNav('usecases')}>
              <div className="li-hd">
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{uc.id}</span>
                <RiskBadge tier={uc.rt} />
                <ApprovalBadge status={uc.app} />
              </div>
              <div className="li-title">{uc.title}</div>
              <div className="li-meta">{uc.cl} · <LifecycleBadge lc={uc.lc} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────
export default function Dashboard({ onNav }: { onNav: (screen: string) => void }) {
  const { useCases, loading } = useUseCases();
  const { incidents } = useIncidents();
  const config = useAppConfig();

  const total    = useCases.length;
  const active   = useCases.filter(u => u.lc === 'Run').length;
  const highRisk = useCases.filter(u => u.rt === 'High').length;
  const pending  = useCases.filter(u => u.app === 'Pending').length;
  const openInc  = incidents.filter(i => i.st === 'Open').length;

  if (loading) return <div className="empty">Lade Dashboard…</div>;

  return (
    <>
      {/* KPI Grid */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: 24 }}>
        <KpiCard label="Use Cases (gesamt)" value={total} sub="aktiv" />
        <KpiCard label="In Betrieb (Run)"   value={active} color="green" />
        <KpiCard
          label="High Risk"
          value={highRisk}
          color={highRisk > 0 ? 'red' : 'green'}
          sub={highRisk > 0 ? 'Prüfung erforderlich' : 'Alles OK'}
        />
        <KpiCard
          label="Freigabe ausstehend"
          value={pending}
          color={pending > 0 ? 'yellow' : 'green'}
        />
        <KpiCard
          label="Offene Incidents"
          value={openInc}
          color={openInc > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Chatbot-Banner */}
      {config.chatbot.enabled && config.chatbot.url && (
        <div style={{
          marginBottom: 18, padding: '12px 18px',
          background: 'var(--accent-pale)', border: '1px solid #b8d8d8',
          borderRadius: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16,
        }}>
          <span style={{ fontSize: 13, color: 'var(--petrol)' }}>
            🤖 <strong>{config.chatbot.label || 'KI-Assistent'}</strong>
            {config.chatbot.hint && <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{config.chatbot.hint}</span>}
          </span>
          <a
            href={config.chatbot.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap', textDecoration: 'none' }}
          >
            {config.chatbot.label || 'Öffnen'} →
          </a>
        </div>
      )}

      {/* Hauptgrid */}
      <div className="dash-grid">
        {/* Links: Kritische Items + Aktivität */}
        <div>
          <CriticalItems useCases={useCases} onNav={onNav} />
          <ActivityStream />
        </div>

        {/* Rechts: Portfolio + Risk Snapshots */}
        <div>
          <PortfolioSnapshot useCases={useCases} />
          <RiskSnapshot      useCases={useCases} />

          {/* Schnellzugriff */}
          <div className="card">
            <div className="ch"><span className="ch-title">Schnellzugriff</span></div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '➕ Neuer Use Case',      screen: 'new' },
                { label: '🛡 Governance Cockpit',  screen: 'governance' },
                { label: '📄 Dokumentations-Hub',  screen: 'artefakthub' },
                { label: '⚠️ Incident melden',     screen: 'incidents' },
              ].map(({ label, screen }) => (
                <button
                  key={screen}
                  className="btn btn-outline"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => onNav(screen)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
