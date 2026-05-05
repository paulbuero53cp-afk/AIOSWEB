import { useUseCases } from '@/hooks/useUseCases';
import { useIncidents } from '@/hooks/useIncidents';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { RiskBadge, ApprovalBadge, LifecycleBadge } from '@/components/common/Badge';
import type { UseCase } from '@/types';

// ── Kleine KPI-Kachel ─────────────────────────────────────────
function GovKpi({
  label, value, color, onClick,
}: {
  label: string; value: number; color?: 'red' | 'yellow' | 'green'; onClick?: () => void;
}) {
  return (
    <div
      className={`kc${color ? ' ' + color : ''}`}
      style={onClick ? { cursor: 'pointer' } : undefined}
      onClick={onClick}
    >
      <div className="kc-label">{label}</div>
      <div className="kc-value">{value}</div>
    </div>
  );
}

// ── Sektions-Karte ────────────────────────────────────────────
function GovSection({
  title, icon, count, children, emptyText,
}: {
  title: string; icon: string; count: number;
  children: React.ReactNode; emptyText: string;
}) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="ch">
        <span className="ch-title">
          {icon} {title}
          {count > 0 && (
            <span
              className="badge br"
              style={{ marginLeft: 8, fontSize: 10 }}
            >
              {count}
            </span>
          )}
        </span>
      </div>
      {count === 0 ? (
        <div className="empty" style={{ padding: '16px 20px' }}>
          ✓ {emptyText}
        </div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}

// ── UC-Listeneintrag ──────────────────────────────────────────
function GovItem({
  uc, children,
}: {
  uc: UseCase; children?: React.ReactNode;
}) {
  return (
    <div className="li">
      <div className="li-hd">
        <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: 'var(--muted)' }}>
          {uc.id}
        </span>
        <RiskBadge tier={uc.rt} />
        <ApprovalBadge status={uc.app} />
        <LifecycleBadge lc={uc.lc} />
      </div>
      <div className="li-title">{uc.title}</div>
      <div className="li-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <span>{uc.cl} · Owner: {uc.own}</span>
        {children}
      </div>
    </div>
  );
}

// ── Governance Cockpit ────────────────────────────────────────
export default function Governance({ onNav }: { onNav: (s: string) => void }) {
  const { useCases, updateUC } = useUseCases();
  const { openCount }          = useIncidents();
  const { isApprover }         = useAuth();
  const { showToast }          = useToast();

  const active = useCases.filter(u => u.act);

  const pending   = active.filter(u => u.app === 'Pending');
  const highRisk  = active.filter(u => u.rt === 'High');
  const triggers  = active.filter(u => u.gt.some(Boolean));
  const missingKpi = active.filter(u => u.lc === 'Run' && u.kpi === 'no');

  async function approve(uc: UseCase) {
    try {
      await updateUC(uc.id, { app: 'Approved' });
      showToast(`✓ ${uc.title} freigegeben`, 'success');
    } catch {
      showToast('Fehler beim Freigeben', 'error');
    }
  }

  async function reject(uc: UseCase) {
    try {
      await updateUC(uc.id, { app: 'Rejected' });
      showToast(`${uc.title} abgelehnt`, 'info');
    } catch {
      showToast('Fehler beim Ablehnen', 'error');
    }
  }

  return (
    <div>
      {/* KPI-Leiste */}
      <div
        className="kpi-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: 24 }}
      >
        <GovKpi
          label="Freigabe ausstehend"
          value={pending.length}
          color={pending.length > 0 ? 'red' : 'green'}
        />
        <GovKpi
          label="High Risk"
          value={highRisk.length}
          color={highRisk.length > 0 ? 'red' : 'green'}
          onClick={() => onNav('riskassess')}
        />
        <GovKpi
          label="KPI fehlt (Run)"
          value={missingKpi.length}
          color={missingKpi.length > 0 ? 'yellow' : 'green'}
        />
        <GovKpi
          label="Offene Incidents"
          value={openCount}
          color={openCount > 0 ? 'red' : 'green'}
          onClick={() => onNav('incidents')}
        />
      </div>

      {/* 1 — Freigabe ausstehend */}
      <GovSection
        title="Freigabe ausstehend"
        icon="⏳"
        count={pending.length}
        emptyText="Keine ausstehenden Freigaben"
      >
        {pending.map(uc => (
          <GovItem key={uc.id} uc={uc}>
            {isApprover && (
              <span style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--green)', color: '#fff', border: 'none' }}
                  onClick={() => approve(uc)}
                >
                  ✓ Freigeben
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => reject(uc)}
                >
                  ✕ Ablehnen
                </button>
              </span>
            )}
          </GovItem>
        ))}
      </GovSection>

      {/* 2 — High Risk */}
      <GovSection
        title="High Risk Use Cases"
        icon="🔴"
        count={highRisk.length}
        emptyText="Keine High-Risk Use Cases"
      >
        {highRisk.map(uc => (
          <GovItem key={uc.id} uc={uc}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onNav('riskassess')}
            >
              Risk Assessment →
            </button>
          </GovItem>
        ))}
      </GovSection>

      {/* 3 — Governance-Trigger aktiv */}
      <GovSection
        title="Governance-Trigger aktiv"
        icon="⚡"
        count={triggers.length}
        emptyText="Keine aktiven Governance-Trigger"
      >
        {triggers.map(uc => (
          <GovItem key={uc.id} uc={uc}>
            <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {uc.gt.map((active, i) =>
                active ? (
                  <span key={i} className="badge by" style={{ fontSize: 10 }}>
                    GT0{i + 1}
                  </span>
                ) : null,
              )}
            </span>
          </GovItem>
        ))}
      </GovSection>

      {/* 4 — KPI-Definition fehlt */}
      <GovSection
        title="KPI-Tracking fehlt (Lifecycle: Run)"
        icon="📊"
        count={missingKpi.length}
        emptyText="Alle aktiven Use Cases haben KPI-Tracking definiert"
      >
        {missingKpi.map(uc => (
          <GovItem key={uc.id} uc={uc}>
            <button
              className="btn btn-outline btn-sm"
              onClick={async () => {
                try {
                  await updateUC(uc.id, { kpi: 'yes' });
                  showToast(`KPI für ${uc.id} aktiviert`, 'success');
                } catch {
                  showToast('Fehler', 'error');
                }
              }}
            >
              KPI aktivieren
            </button>
          </GovItem>
        ))}
      </GovSection>
    </div>
  );
}
