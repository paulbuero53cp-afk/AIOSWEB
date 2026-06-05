import { useState } from 'react';
import useSWR from 'swr';
import { useUseCases } from '@/hooks/useUseCases';
import { RiskBadge, ReliabilityBadge } from '@/components/common/Badge';
import { swrFetcher } from '@/lib/api';
import type { UseCase } from '@/types';

// ── Cluster → Emoji-Mapping ───────────────────────────────────
const CLUSTER_EMOJI: Record<string, string> = {
  Vertrieb:   '💼',
  Marketing:  '📣',
  Produktion: '⚙️',
  Logistik:   '📦',
  Finance:    '💰',
  HR:         '👥',
  IT:         '💻',
  Einkauf:    '🛒',
  Qualität:   '✅',
  'F&E':      '🔬',
  Sonstiges:  '🤖',
};

function clusterEmoji(cl: string): string {
  return CLUSTER_EMOJI[cl] ?? '🤖';
}

// ── Kontrollen-Ampel ──────────────────────────────────────────
type DotStatus = 'green' | 'yellow' | 'red' | 'grey';

const DOT_COLOR: Record<DotStatus, string> = {
  green:  '#22c55e',
  yellow: '#f59e0b',
  red:    '#ef4444',
  grey:   '#9ca3af',
};

function AmpelDot({ status, label, title }: { status: DotStatus; label: string; title: string }) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, color: 'var(--muted)', cursor: 'default',
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: DOT_COLOR[status], flexShrink: 0,
        boxShadow: status !== 'grey' ? `0 0 4px ${DOT_COLOR[status]}60` : 'none',
      }} />
      {label}
    </span>
  );
}

function ControlAmpel({ uc, gcExists }: { uc: UseCase; gcExists: boolean }) {
  // Only render for R3/R4/R5
  const rl = uc.rl ?? '';
  if (!['R3', 'R4', 'R5'].includes(rl)) return null;

  // 1. Oversight: HITL/HOTL = green, none = red, unset = grey
  const oversightStatus: DotStatus =
    uc.hitlMode === 'HITL' ? 'green'
    : uc.hitlMode === 'HOTL' ? 'yellow'
    : uc.hitlMode === 'none' ? 'red'
    : 'grey';
  const oversightTitle =
    uc.hitlMode === 'HITL' ? 'Human in the Loop aktiv'
    : uc.hitlMode === 'HOTL' ? 'Human on the Loop (überwacht)'
    : uc.hitlMode === 'none' ? '⚠ Kein Mensch im Loop definiert'
    : 'Oversight-Modus nicht gesetzt';

  // 2. Monitoring SLA: set = green, unset = red
  const slaStatus: DotStatus = uc.monitoringSla ? 'green' : 'red';
  const slaTitle = uc.monitoringSla
    ? `Monitoring SLA: ${uc.monitoringSla}`
    : '⚠ Kein Monitoring SLA definiert';

  // 3. Gate Check (Kill-Switch / Tracing documented): GC artefakt exists = green
  const gcStatus: DotStatus = gcExists ? 'green' : 'yellow';
  const gcTitle = gcExists
    ? 'Gate-Checklisten ausgefüllt'
    : 'Gate-Checklisten noch nicht ausgefüllt';

  // 4. Bounded Autonomy: supervised = green, semi-auto = yellow, autonomous = red
  const baStatus: DotStatus =
    uc.autonomyLevel === 'supervised' ? 'green'
    : uc.autonomyLevel === 'semi-auto' ? 'yellow'
    : uc.autonomyLevel === 'autonomous' ? 'red'
    : 'grey';
  const baTitle =
    uc.autonomyLevel === 'supervised' ? 'Supervised — Bounded Autonomy definiert'
    : uc.autonomyLevel === 'semi-auto' ? 'Semi-Auto — eingeschränkte Autonomie'
    : uc.autonomyLevel === 'autonomous' ? '⚠ Vollständig autonom — Agentic Controls prüfen'
    : 'Autonomiegrad nicht gesetzt';

  const worstStatus =
    [oversightStatus, slaStatus, gcStatus, baStatus].includes('red') ? 'red'
    : [oversightStatus, slaStatus, gcStatus, baStatus].includes('yellow') ? 'yellow'
    : 'green';

  return (
    <div style={{
      marginTop: 8,
      padding: '8px 10px',
      background: worstStatus === 'red' ? '#ef444408'
        : worstStatus === 'yellow' ? '#f59e0b08'
        : '#22c55e08',
      borderRadius: 6,
      border: `1px solid ${
        worstStatus === 'red' ? '#ef444430'
        : worstStatus === 'yellow' ? '#f59e0b30'
        : '#22c55e30'
      }`,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--muted)',
        marginBottom: 5, letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>
        🚦 Kontrollen-Ampel
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <AmpelDot status={oversightStatus} label="Oversight"   title={oversightTitle} />
        <AmpelDot status={slaStatus}       label="SLA"         title={slaTitle} />
        <AmpelDot status={gcStatus}        label="Gate-Check"  title={gcTitle} />
        <AmpelDot status={baStatus}        label="Autonomy"    title={baTitle} />
      </div>
    </div>
  );
}

// ── Agent-Tile ────────────────────────────────────────────────
function AgentTile({ uc, gcExists }: { uc: UseCase; gcExists: boolean }) {
  const emoji = clusterEmoji(uc.cl);

  function openLink(e: React.MouseEvent) {
    e.stopPropagation();
    if (uc.link) window.open(uc.link, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="agent-tile">
      {/* Visual */}
      <div className="agent-tile-visual">
        <span>{emoji}</span>
        <span className="tile-cluster">{uc.cl}</span>
      </div>

      {/* Body */}
      <div className="agent-tile-body">
        <div className="agent-tile-title">{uc.title}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          <RiskBadge tier={uc.rt} />
          <ReliabilityBadge tier={uc.rl} />
          {uc.kiType?.includes('einsatz') && (
            <span className="badge bp" style={{ fontSize: 10 }}>KI im Einsatz</span>
          )}
        </div>
        <div className="agent-tile-desc">
          {uc.desc || `${uc.cap} · ${uc.auto}`}
        </div>
        {uc.legacy && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Legacy: {uc.legacy}
          </div>
        )}

        {/* Kontrollen-Ampel — nur für R3+ */}
        <ControlAmpel uc={uc} gcExists={gcExists} />
      </div>

      {/* Footer */}
      <div className="agent-tile-footer">
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Mono,monospace' }}>
          {uc.id}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <span className={`badge ${uc.or === 'Operational Ready' ? 'bg' : 'by'}`} style={{ fontSize: 10 }}>
            {uc.or === 'Operational Ready' ? '● Live' : '◐ Teilbetrieb'}
          </span>
          {uc.link && (
            <button className="agent-tile-link" onClick={openLink}>
              Öffnen ↗
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Filter-Bar ────────────────────────────────────────────────
interface Filters { search: string; cl: string; rt: string; or: string; rl: string; }

// ── AI Agent Hub ──────────────────────────────────────────────
export default function AgentHub() {
  const { useCases, loading } = useUseCases();
  const { data: artStatus } = useSWR<Record<string, string[]>>(
    '/api/artefakte/status', swrFetcher
  );
  const [filters, setFilters] = useState<Filters>({
    search: '', cl: '', rt: '', or: '', rl: '',
  });

  function setFilter(key: keyof Filters, val: string) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  // Nur Run-UCs zeigen
  const agents = useCases.filter(uc => uc.act && uc.lc === 'Run');

  // Filter anwenden
  const filtered = agents.filter(uc => {
    const s = filters.search.toLowerCase();
    if (s && !uc.title.toLowerCase().includes(s) && !uc.id.toLowerCase().includes(s)) return false;
    if (filters.cl && uc.cl !== filters.cl) return false;
    if (filters.rt && uc.rt !== filters.rt) return false;
    if (filters.or === 'ready' && uc.or !== 'Operational Ready') return false;
    if (filters.rl && uc.rl !== filters.rl) return false;
    return true;
  });

  // Einzigartige Cluster
  const clusters = [...new Set(agents.map(u => u.cl))].sort();

  // Reliability-KPIs
  const highAutonomyCount = agents.filter(u => u.rl === 'R4' || u.rl === 'R5').length;
  const controlsWarning   = agents.filter(u => {
    if (!u.rl || !['R3', 'R4', 'R5'].includes(u.rl)) return false;
    const gcOk = artStatus?.[u.id]?.includes('gc') ?? false;
    const slaOk = !!u.monitoringSla;
    const oversightOk = u.hitlMode !== 'none';
    return !gcOk || !slaOk || !oversightOk;
  }).length;

  if (loading) return <div className="empty">Lade AI Agent Hub…</div>;

  return (
    <div>
      {/* KPI-Zeile */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="kc" style={{ flex: '0 0 auto', minWidth: 120 }}>
          <div className="kc-label">Agenten gesamt</div>
          <div className="kc-value">{agents.length}</div>
        </div>
        <div className="kc green" style={{ flex: '0 0 auto', minWidth: 140 }}>
          <div className="kc-label">Operational Ready</div>
          <div className="kc-value">
            {agents.filter(u => u.or === 'Operational Ready').length}
          </div>
        </div>
        <div className="kc red" style={{ flex: '0 0 auto', minWidth: 120 }}>
          <div className="kc-label">High Risk</div>
          <div className="kc-value">
            {agents.filter(u => u.rt === 'High').length}
          </div>
        </div>
        <div className="kc" style={{ flex: '0 0 auto', minWidth: 120 }}>
          <div className="kc-label">R4/R5 Agenten</div>
          <div className="kc-value">{highAutonomyCount}</div>
        </div>
        {controlsWarning > 0 && (
          <div className="kc red" style={{ flex: '0 0 auto', minWidth: 150 }}>
            <div className="kc-label">🚦 Controls fehlen</div>
            <div className="kc-value">{controlsWarning}</div>
          </div>
        )}
        <div className="kc" style={{ flex: '0 0 auto', minWidth: 120 }}>
          <div className="kc-label">Mit Link</div>
          <div className="kc-value">
            {agents.filter(u => !!u.link).length}
          </div>
        </div>
      </div>

      {/* Filter-Bar */}
      <div className="fb" style={{ marginBottom: 20 }}>
        <input
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
          placeholder="Agent suchen…"
          style={{ flex: 1, minWidth: 160 }}
        />
        <select
          value={filters.cl}
          onChange={e => setFilter('cl', e.target.value)}
          style={{ width: 140 }}
        >
          <option value="">Alle Cluster</option>
          {clusters.map(c => <option key={c}>{c}</option>)}
        </select>
        <select
          value={filters.rt}
          onChange={e => setFilter('rt', e.target.value)}
          style={{ width: 130 }}
        >
          <option value="">Alle Risk Tier</option>
          {['High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
        </select>
        <select
          value={filters.rl}
          onChange={e => setFilter('rl', e.target.value)}
          style={{ width: 130 }}
        >
          <option value="">Alle R-Tier</option>
          {['R1', 'R2', 'R3', 'R4', 'R5'].map(o => <option key={o}>{o}</option>)}
        </select>
        <select
          value={filters.or}
          onChange={e => setFilter('or', e.target.value)}
          style={{ width: 170 }}
        >
          <option value="">Alle Bereitschaft</option>
          <option value="ready">Operational Ready</option>
        </select>
      </div>

      {/* Ergebnis-Info */}
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        {filtered.length} von {agents.length} Agenten
      </div>

      {/* Tile Grid */}
      {filtered.length === 0 ? (
        <div className="empty">
          {agents.length === 0
            ? 'Keine Use Cases mit Lifecycle "Run" vorhanden.'
            : 'Kein Agent passt zu den Filterkriterien.'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(uc => (
            <AgentTile
              key={uc.id}
              uc={uc}
              gcExists={artStatus?.[uc.id]?.includes('gc') ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
