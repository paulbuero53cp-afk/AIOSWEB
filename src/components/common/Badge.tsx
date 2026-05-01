import type { RiskTier, ApprovalStatus, Lifecycle, PortfolioDecision } from '@/types';

// ── Risk Tier ─────────────────────────────────────────────────
const RISK_CSS: Record<RiskTier, string> = {
  High:   'br',
  Medium: 'by',
  Low:    'bg',
};

export function RiskBadge({ tier }: { tier: string }) {
  const css = RISK_CSS[tier as RiskTier] ?? 'bgr';
  return <span className={`badge ${css}`}>{tier}</span>;
}

// ── Approval Status ───────────────────────────────────────────
const APPROVAL_CSS: Record<ApprovalStatus, string> = {
  Approved:      'bg',
  Pending:       'by',
  Rejected:      'br',
  'Not required': 'bgr',
};

export function ApprovalBadge({ status }: { status: string }) {
  const css = APPROVAL_CSS[status as ApprovalStatus] ?? 'bgr';
  return <span className={`badge ${css}`}>{status}</span>;
}

// ── Lifecycle ─────────────────────────────────────────────────
const LC_CSS: Record<Lifecycle, string> = {
  Idea:   'bb',
  Build:  'by',
  Run:    'bg',
  Retire: 'bgr',
};

export function LifecycleBadge({ lc }: { lc: string }) {
  const css = LC_CSS[lc as Lifecycle] ?? 'bgr';
  return <span className={`badge ${css}`}>{lc}</span>;
}

// ── Portfolio Decision ────────────────────────────────────────
const PD_CSS: Record<PortfolioDecision, string> = {
  Start:   'bg',
  Scale:   'bb',
  Stop:    'br',
  Hold:    'by',
  Backlog: 'bgr',
};

export function PdBadge({ pd }: { pd: string }) {
  const css = PD_CSS[pd as PortfolioDecision] ?? 'bgr';
  return <span className={`badge ${css}`}>{pd}</span>;
}

// ── KI-Typ ────────────────────────────────────────────────────
export function KiTypeBadges({ kiType }: { kiType?: string[] }) {
  if (!kiType?.length) return null;
  return (
    <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {kiType.includes('einsatz')    && <span className="badge bp">Einsatz</span>}
      {kiType.includes('erstellung') && <span className="badge bb">Erstellung</span>}
    </span>
  );
}

// ── KPI ───────────────────────────────────────────────────────
export function KpiBadge({ kpi }: { kpi: string }) {
  return <span className={`badge ${kpi === 'yes' ? 'bg' : 'bgr'}`}>{kpi === 'yes' ? 'Ja' : 'Nein'}</span>;
}
