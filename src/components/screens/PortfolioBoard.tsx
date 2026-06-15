import { useState } from 'react';
import { useUseCases } from '@/hooks/useUseCases';
import { useTx } from '@/context/LanguageContext';
import { RiskBadge, LifecycleBadge } from '@/components/common/Badge';
import type { UseCase, PortfolioDecision } from '@/types';

type View = 'kanban' | 'bubble';

const PD_COLS: { id: PortfolioDecision; label: string; color: string }[] = [
  { id: 'Start',   label: 'Start',   color: '#3b82f6' },
  { id: 'Scale',   label: 'Scale',   color: '#10b981' },
  { id: 'Hold',    label: 'Hold',    color: '#f59e0b' },
  { id: 'Stop',    label: 'Stop',    color: '#ef4444' },
  { id: 'Backlog', label: 'Backlog', color: '#8b5cf6' },
];

const RT_COLOR: Record<string, string> = {
  Low:    '#10b981',
  Medium: '#f59e0b',
  High:   '#ef4444',
};

// ── Kanban Card ───────────────────────────────────────────────
function KanbanCard({ uc }: { uc: UseCase }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 12px', marginBottom: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 12, fontFamily: 'DM Mono,monospace', color: 'var(--muted)' }}>{uc.id}</span>
        <RiskBadge tier={uc.rt} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, margin: '6px 0 4px', lineHeight: 1.3 }}>{uc.title}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <LifecycleBadge lc={uc.lc} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{uc.cl}</span>
      </div>
    </div>
  );
}

// ── Kanban View ───────────────────────────────────────────────
function KanbanView({ useCases }: { useCases: UseCase[] }) {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
      {PD_COLS.map(col => {
        const cards = useCases.filter(uc => uc.pd === col.id);
        return (
          <div key={col.id} style={{ minWidth: 220, flex: '0 0 220px' }}>
            <div style={{
              padding: '6px 12px', borderRadius: '6px 6px 0 0',
              background: col.color, color: '#fff',
              fontSize: 12, fontWeight: 700, letterSpacing: '.5px',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>{col.label}</span>
              <span style={{ opacity: .8 }}>{cards.length}</span>
            </div>
            <div style={{
              background: 'var(--bg-secondary, #f8f9fa)',
              border: '1px solid var(--border)', borderTop: 'none',
              borderRadius: '0 0 6px 6px', padding: '8px 8px 0',
              minHeight: 80,
            }}>
              {cards.length === 0
                ? <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>—</div>
                : cards.map(uc => <KanbanCard key={uc.id} uc={uc} />)
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Bubble Chart ──────────────────────────────────────────────
function BubbleChart({ useCases }: { useCases: UseCase[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const tx = useTx();
  const W = 560, H = 400, PAD = 48;

  function xPos(vs: number) { return PAD + ((vs - 1) / 4) * (W - PAD * 2); }
  function yPos(fs: number) { return H - PAD - ((fs - 1) / 4) * (H - PAD * 2); }
  function rSize(rs: number) { return 10 + rs * 6; }

  const ticks = [1, 2, 3, 4, 5];

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={W} height={H} style={{ fontFamily: 'inherit' }}>
        {/* Grid lines */}
        {ticks.map(t => (
          <g key={t}>
            <line x1={xPos(t)} y1={PAD} x2={xPos(t)} y2={H - PAD} stroke="var(--border)" strokeDasharray="3,3" />
            <line x1={PAD} y1={yPos(t)} x2={W - PAD} y2={yPos(t)} stroke="var(--border)" strokeDasharray="3,3" />
            <text x={xPos(t)} y={H - PAD + 14} textAnchor="middle" fontSize={11} fill="var(--muted)">{t}</text>
            <text x={PAD - 8} y={yPos(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{t}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--text)">Value Score →</text>
        <text x={12} y={H / 2} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--text)"
          transform={`rotate(-90, 12, ${H / 2})`}>Feasibility →</text>

        {/* Bubbles */}
        {useCases.map(uc => {
          const x = xPos(uc.vs), y = yPos(uc.fs), r = rSize(uc.rs);
          const color = RT_COLOR[uc.rt] ?? '#8b5cf6';
          const isHov = hovered === uc.id;
          return (
            <g key={uc.id}
              onMouseEnter={() => setHovered(uc.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'default' }}>
              <circle cx={x} cy={y} r={r}
                fill={color} fillOpacity={isHov ? .85 : .55}
                stroke={color} strokeWidth={isHov ? 2 : 1} />
              <text x={x} y={y + 3} textAnchor="middle" fontSize={9} fill="#fff" fontWeight={700}
                style={{ pointerEvents: 'none' }}>
                {uc.id.replace('UC-', '')}
              </text>
              {isHov && (
                <foreignObject x={x + r + 4} y={y - 36} width={160} height={72}>
                  <div style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '6px 8px', fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,.15)',
                  }}>
                    <strong style={{ display: 'block' }}>{uc.id}</strong>
                    <span style={{ color: 'var(--muted)' }}>{uc.title}</span>
                    <div style={{ marginTop: 4 }}>V:{uc.vs} F:{uc.fs} R:{uc.rs}</div>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legende */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {Object.entries(RT_COLOR).map(([tier, color]) => (
          <span key={tier} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {tier} Risk
          </span>
        ))}
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{tx('· Blasengröße = Risk Score')}</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function PortfolioBoard() {
  const [view, setView] = useState<View>('kanban');
  const { useCases, loading } = useUseCases();
  const tx = useTx();

  const total    = useCases.length;
  const active   = useCases.filter(uc => uc.lc !== 'Retire').length;
  const highRisk = useCases.filter(uc => uc.rt === 'High').length;
  const approved = useCases.filter(uc => uc.app === 'Approved').length;

  return (
    <div>
      <div className="sec-title">Portfolio Board</div>
      <div className="sec-sub">{tx('Überblick aller Use Cases nach Portfolio-Entscheidung')}</div>

      {/* KPI */}
      <div className="kpi-bar" style={{ marginBottom: 20 }}>
        {[
          { label: 'Gesamt', value: total },
          { label: 'Aktiv', value: active },
          { label: 'High Risk', value: highRisk },
          { label: 'Approved', value: approved },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-val">{k.value}</div>
            <div className="kpi-label">{tx(k.label)}</div>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn btn-sm${view === 'kanban' ? '' : ' btn-outline'}`}
          onClick={() => setView('kanban')}>
          ▦ Kanban
        </button>
        <button
          className={`btn btn-sm${view === 'bubble' ? '' : ' btn-outline'}`}
          onClick={() => setView('bubble')}>
          ◉ Bubble Chart
        </button>
      </div>

      {loading
        ? <div className="empty">{tx('Lade Daten…')}</div>
        : useCases.length === 0
          ? <div className="empty">{tx('Keine Use Cases vorhanden.')}</div>
          : view === 'kanban'
            ? <KanbanView useCases={useCases} />
            : <BubbleChart useCases={useCases} />
      }
    </div>
  );
}
