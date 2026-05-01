import { useState } from 'react';
import { useUseCases } from '@/hooks/useUseCases';
import { RiskBadge } from '@/components/common/Badge';
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

// ── Agent-Tile ────────────────────────────────────────────────
function AgentTile({ uc }: { uc: UseCase }) {
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
interface Filters { search: string; cl: string; rt: string; or: string; }

// ── AI Agent Hub ──────────────────────────────────────────────
export default function AgentHub() {
  const { useCases, loading } = useUseCases();
  const [filters, setFilters] = useState<Filters>({
    search: '', cl: '', rt: '', or: '',
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
    return true;
  });

  // Einzigartige Cluster
  const clusters = [...new Set(agents.map(u => u.cl))].sort();

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
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(uc => (
            <AgentTile key={uc.id} uc={uc} />
          ))}
        </div>
      )}
    </div>
  );
}
