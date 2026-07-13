// ─────────────────────────────────────────────────────────────
//  AIOS — UC Dashboard (One-Pager, druckbar als PDF)
//  Zeigt einen vollständigen Überblick über einen Use Case
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useUseCases } from '@/hooks/useUseCases';
import { useArtefaktHub } from '@/hooks/useArtefakt';
import { useLang, useTx } from '@/context/LanguageContext';
import type { UseCase } from '@/types';

// ── Hilfsfunktionen ───────────────────────────────────────────

const RL_LABEL: Record<string, string> = {
  R1: 'R1 — Persönlicher Assistent',
  R2: 'R2 — Team-Werkzeug',
  R3: 'R3 — Entscheidungsunterstützung',
  R4: 'R4 — Automatisierter Prozess',
  R5: 'R5 — Kritisches System',
};
const RL_COLOR: Record<string, string> = {
  R1: '#2eaa6e',
  R2: '#4d8080',
  R3: '#e8a020',
  R4: '#d97020',
  R5: '#d94040',
};
const RL_BG: Record<string, string> = {
  R1: '#e8f7f0',
  R2: '#e6f0f0',
  R3: '#fef6e4',
  R4: '#fef0e0',
  R5: '#fdeaea',
};

const HITL_LABEL: Record<string, string> = {
  HITL: 'HITL — Human in the Loop',
  HOTL: 'HOTL — Human on the Loop',
  none: 'Kein Oversight',
};
const AUTONOMY_LABEL: Record<string, string> = {
  supervised:  'Überwacht',
  'semi-auto': 'Teilautomatisiert',
  autonomous:  'Autonom',
};
const FM_LABEL: Record<string, string> = {
  accuracy:       'Accuracy',
  inconsistency:  'Inconsistency',
  drift:          'Drift',
  agentic:        'Agentic Risk',
  infrastructure: 'Infrastructure',
};
const FM_COLOR: Record<string, string> = {
  accuracy:       '#d94040',
  inconsistency:  '#e8a020',
  drift:          '#d97020',
  agentic:        '#9040c0',
  infrastructure: '#4d8080',
};

const MC_LABELS = [
  'Verantwortliche Person benannt',
  'Datenschutz-Check erfolgt',
  'Bias-Check definiert',
  'Erklärbarkeit sichergestellt',
  'Monitoring definiert',
  'Rollback-Prozess dokumentiert',
  'Nutzer informiert / geschult',
];

const GT_LABELS = [
  'Entscheidungen mit Rechtswirkung',
  'Sensible Personendaten',
  'Kritische Infrastruktur',
  'Öffentlichkeitswirksam',
];
const SB_LABELS = [
  'Gesundheit / Leben',
  'Finanzen / Kredit',
  'Beschäftigung / Personalentscheidungen',
  'Politisch / Religiös',
];

function badge(
  val: string | undefined,
  colorMap: Record<string, string>,
  bgMap?: Record<string, string>,
  labelMap?: Record<string, string>,
) {
  if (!val) return null;
  const color = colorMap[val] ?? '#4a6b6b';
  const bg    = bgMap?.[val] ?? color + '22';
  const label = labelMap?.[val] ?? val;
  return (
    <span style={{
      display: 'inline-block',
      background: bg,
      color,
      border: `1px solid ${color}33`,
      borderRadius: 6,
      padding: '2px 10px',
      fontSize: 12,
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

// ── Kachel-Komponente ─────────────────────────────────────────
function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="ucd-kv" style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#4a6b6b', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#1a3030' }}>
        {value || <span style={{ color: '#bbb' }}>—</span>}
      </div>
    </div>
  );
}

// ── Score-Chip ────────────────────────────────────────────────
function ScoreChip({ label, value, max = 3 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 67 ? '#d94040' : pct >= 34 ? '#e8a020' : '#2eaa6e';
  return (
    <div className="ucd-chip" style={{
      background: '#f4f9f9',
      border: '1px solid #d4e5e5',
      borderRadius: 8,
      padding: '10px 14px',
      textAlign: 'center',
      minWidth: 80,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#4a6b6b', marginTop: 2 }}>{label}</div>
      <div style={{ height: 4, background: '#d4e5e5', borderRadius: 2, marginTop: 6 }}>
        <div style={{ height: 4, width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ── Bool-Grid ─────────────────────────────────────────────────
function BoolGrid({
  title, labels, values, color,
}: {
  title: string;
  labels: string[];
  values: boolean[];
  color?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#4a6b6b', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 12px' }}>
        {labels.map((lbl, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{
              width: 16, height: 16, borderRadius: 4,
              background: values[i] ? (color ?? '#2eaa6e') : '#d4e5e5',
              color: values[i] ? '#fff' : '#aaa',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, flexShrink: 0,
            }}>
              {values[i] ? '✓' : '·'}
            </span>
            <span style={{ color: values[i] ? '#1a3030' : '#9ab' }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Artefakt-Status ────────────────────────────────────────────
function ArtStatus({ label, exists, date }: { label: string; exists: boolean; date?: string }) {
  return (
    <div style={{
      flex: 1,
      background: exists ? '#e8f7f0' : '#f4f9f9',
      border: `1px solid ${exists ? '#2eaa6e44' : '#d4e5e5'}`,
      borderRadius: 8,
      padding: '10px 12px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 18 }}>{exists ? '✅' : '⬜'}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#1e3838', marginTop: 4 }}>{label}</div>
      {date && <div style={{ fontSize: 10, color: '#4a6b6b', marginTop: 2 }}>{date.slice(0, 10)}</div>}
    </div>
  );
}

// ── Dashboard Content ─────────────────────────────────────────
function DashboardContent({ uc, hub }: { uc: UseCase; hub: Record<string, unknown> | undefined }) {
  const { lang } = useLang();
  const tx = useTx();
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';

  const ra   = (hub as Record<string, {savedAt?: string}> | undefined)?.ra;
  const gc   = (hub as Record<string, {savedAt?: string}> | undefined)?.gc;
  const bc   = (hub as Record<string, {savedAt?: string}> | undefined)?.bc;
  const dsfa = (hub as Record<string, {savedAt?: string}> | undefined)?.dsfa;

  // Translated label maps
  const rlLabelsTx = Object.fromEntries(Object.entries(RL_LABEL).map(([k, v]) => [k, tx(v)]));
  const hitlLabelTx = (key: string) => tx(HITL_LABEL[key] ?? key);
  const autonomyLabelTx = (key: string) => tx(AUTONOMY_LABEL[key] ?? key);

  const lcColor: Record<string, string> = {
    Idea: '#e8a020', Build: '#4d8080', Run: '#2eaa6e', Retire: '#888',
  };
  const pdColor: Record<string, string> = {
    Start: '#2eaa6e', Scale: '#4d8080', Stop: '#d94040', Hold: '#e8a020', Backlog: '#888',
  };
  const rtColor: Record<string, string> = {
    Low: '#2eaa6e', Medium: '#e8a020', High: '#d94040',
  };

  return (
    <div className="ucd-page" style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="ucd-hdr" style={{
        background: 'var(--petrol)',
        color: '#fff',
        borderRadius: 10,
        padding: '20px 24px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, opacity: .6, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              {uc.id} · UC Dashboard
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{uc.title}</div>
            <div style={{ fontSize: 13, opacity: .75, marginTop: 6 }}>
              {[uc.cl, uc.sys].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {uc.lc && (
              <span style={{ background: lcColor[uc.lc] + '33', color: lcColor[uc.lc] || '#fff', border: `1px solid ${lcColor[uc.lc] ?? '#fff'}66`, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                {uc.lc}
              </span>
            )}
            {uc.pd && (
              <span style={{ background: pdColor[uc.pd] + '33', color: pdColor[uc.pd] || '#fff', border: `1px solid ${pdColor[uc.pd] ?? '#fff'}66`, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                {uc.pd}
              </span>
            )}
            {uc.rt && (
              <span style={{ background: rtColor[uc.rt] + '33', color: rtColor[uc.rt] || '#fff', border: `1px solid ${rtColor[uc.rt] ?? '#fff'}66`, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                Risk: {uc.rt}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 1: Stammdaten + Scores ────────────────────── */}
      <div className="ucd-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Stammdaten */}
        <div className="ucd-panel" style={{ background: '#fff', border: '1px solid #d4e5e5', borderRadius: 10, padding: '16px 18px' }}>
          <div className="ucd-sec" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3838', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #d4e5e5' }}>
            {tx('Stammdaten')}
          </div>
          <KV label="Business Owner"       value={uc.own} />
          <KV label="Cluster / Abteilung"  value={uc.cl} />
          <KV label="System / Werkzeug"    value={uc.sys} />
          <KV label="KI-Technologie"       value={uc.cap} />
          <KV label="Autonomiegrad"         value={uc.auto} />
          {uc.legacy && <KV label="Legacy-System" value={uc.legacy} />}
          <KV label="Governance-Tier"      value={`Tier ${uc.tier}`} />
          <KV label="Approval Status"      value={uc.app} />
          <KV label="Operational Readiness" value={uc.or} />
        </div>

        {/* Bewertung */}
        <div className="ucd-panel" style={{ background: '#fff', border: '1px solid #d4e5e5', borderRadius: 10, padding: '16px 18px' }}>
          <div className="ucd-sec" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3838', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #d4e5e5' }}>
            {tx('Bewertung')}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <ScoreChip label="Value"        value={uc.vs} />
            <ScoreChip label="Feasibility"  value={uc.fs} />
            <ScoreChip label="Risk"         value={uc.rs} />
          </div>
          <KV label="KPI definiert"              value={uc.kpi === 'yes' ? '✓ Ja' : '✗ Nein'} />
          <KV label="HITL"                       value={uc.hitl === 'yes' ? '✓ Ja' : '✗ Nein'} />
          <KV label="Reversible Entscheidungen"  value={uc.rev === 'yes' ? '✓ Ja' : '✗ Nein'} />
          {uc.desc && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#4a6b6b', lineHeight: 1.6, borderTop: '1px solid #d4e5e5', paddingTop: 10 }}>
              {uc.desc}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Reliability ───────────────────────────── */}
      {uc.rl && (
        <div className="ucd-panel" style={{
          background: '#fff',
          border: `2px solid ${RL_COLOR[uc.rl] ?? '#4d8080'}44`,
          borderLeft: `4px solid ${RL_COLOR[uc.rl] ?? '#4d8080'}`,
          borderRadius: 10,
          padding: '16px 18px',
          marginBottom: 12,
        }}>
          <div className="ucd-sec" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3838', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #d4e5e5' }}>
            Reliability Framework
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <KV label="Reliability Tier" value={
                badge(uc.rl, RL_COLOR, RL_BG, rlLabelsTx)
              } />
            </div>
            {uc.hitlMode && (
              <div>
                <KV label="HITL-Modus" value={
                  <span style={{ fontSize: 12 }}>{hitlLabelTx(uc.hitlMode)}</span>
                } />
              </div>
            )}
            {uc.autonomyLevel && (
              <div>
                <KV label="Automationsgrad" value={
                  <span style={{ fontSize: 12 }}>{autonomyLabelTx(uc.autonomyLevel)}</span>
                } />
              </div>
            )}
            {uc.monitoringSla && (
              <div>
                <KV label="Monitoring SLA" value={
                  <span style={{ fontSize: 12 }}>⏱ {uc.monitoringSla}</span>
                } />
              </div>
            )}
          </div>
          {uc.failureModes && uc.failureModes.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #d4e5e5' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#4a6b6b', marginBottom: 6 }}>
                {tx('Bekannte Failure Modes')}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {uc.failureModes.map(fm => (
                  <span key={fm} style={{
                    background: FM_COLOR[fm] + '18',
                    color: FM_COLOR[fm] ?? '#4d8080',
                    border: `1px solid ${FM_COLOR[fm] ?? '#4d8080'}33`,
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    {FM_LABEL[fm] ?? fm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Row 3: Checks + Trigger ──────────────────────── */}
      <div className="ucd-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Minimum Checks */}
        <div className="ucd-panel" style={{ background: '#fff', border: '1px solid #d4e5e5', borderRadius: 10, padding: '16px 18px' }}>
          <div className="ucd-sec" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3838', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #d4e5e5' }}>
            Minimum Standard Checks
          </div>
          <BoolGrid
            title=""
            labels={MC_LABELS.map(tx)}
            values={MC_LABELS.map((_, i) => uc.mc?.[i] === true)}
            color="#2eaa6e"
          />
          <div style={{ marginTop: 8, fontSize: 11, color: '#4a6b6b' }}>
            {(uc.mc ?? []).filter(Boolean).length} / {MC_LABELS.length} {tx('erfüllt')}
          </div>
        </div>

        {/* Governance Trigger + Sensible Bereiche */}
        <div className="ucd-panel" style={{ background: '#fff', border: '1px solid #d4e5e5', borderRadius: 10, padding: '16px 18px' }}>
          <div className="ucd-sec" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3838', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #d4e5e5' }}>
            {tx('Governance Trigger & Sensible Bereiche')}
          </div>
          <BoolGrid
            title={tx('Governance Trigger (GT)')}
            labels={GT_LABELS.map(tx)}
            values={GT_LABELS.map((_, i) => uc.gt?.[i] === true)}
            color="#d94040"
          />
          <div style={{ marginBottom: 10 }} />
          <BoolGrid
            title={tx('Sensible Bereiche (SB)')}
            labels={SB_LABELS.map(tx)}
            values={SB_LABELS.map((_, i) => uc.sb?.[i] === true)}
            color="#d97020"
          />
        </div>
      </div>

      {/* ── Row 4: Artefakt-Status ───────────────────────── */}
      <div className="ucd-panel" style={{ background: '#fff', border: '1px solid #d4e5e5', borderRadius: 10, padding: '16px 18px', marginBottom: 12 }}>
        <div className="ucd-sec" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3838', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #d4e5e5' }}>
          {tx('Dokumentations-Status')}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <ArtStatus label="Risk Assessment" exists={!!ra && Object.keys(ra).length > 0} date={(ra as {savedAt?: string})?.savedAt} />
          <ArtStatus label="Gate Checks"     exists={!!gc && Object.keys(gc).length > 0} date={(gc as {savedAt?: string})?.savedAt} />
          <ArtStatus label="Business Case"   exists={!!bc && Object.keys(bc).length > 0} date={(bc as {savedAt?: string})?.savedAt} />
          <ArtStatus label={tx('DSFA')}      exists={!!dsfa && Object.keys(dsfa).length > 0} date={(dsfa as {savedAt?: string})?.savedAt} />
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{ textAlign: 'right', fontSize: 10, color: '#9ab', marginTop: 4 }}>
        AIOS · {uc.id} · {tx('Stand:')} {new Date(uc.updatedAt || uc.createdAt || '').toLocaleDateString(locale)}
      </div>

    </div>
  );
}

// ── PrintablePage — lädt eigenen Hub, nur beim Drucken sichtbar ──
function PrintablePage({ uc, isLast }: { uc: UseCase; isLast: boolean }) {
  const { hub } = useArtefaktHub(uc.id);
  return (
    <div className="ucd-print-page" style={{ pageBreakAfter: isLast ? 'auto' : 'always' }}>
      <DashboardContent uc={uc} hub={hub as Record<string, unknown> | undefined} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
interface UcDashboardProps {
  initialUcId?: string;
}

export default function UcDashboard({ initialUcId }: UcDashboardProps) {
  const { useCases, loading } = useUseCases();
  const [ucId, setUcId]       = useState<string>(initialUcId ?? '');
  const [multiMode, setMulti] = useState(false);
  const [selectedIds, setSel] = useState<Set<string>>(new Set());
  const [search, setSearch]   = useState('');
  const { hub }               = useArtefaktHub(ucId || null);
  const tx                    = useTx();

  const uc = useCases.find(u => u.id === ucId);

  function toggleId(id: string) {
    setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const filteredUcs = search.trim()
    ? useCases.filter(u =>
        u.id.toLowerCase().includes(search.toLowerCase()) ||
        u.title.toLowerCase().includes(search.toLowerCase()) ||
        (u.cl ?? '').toLowerCase().includes(search.toLowerCase()))
    : useCases;

  const selectedUcs = useCases.filter(u => selectedIds.has(u.id));
  const count = selectedIds.size;

  return (
    <div>
      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="card ucd-toolbar" style={{ marginBottom: 16 }}>
        <div className="ch" style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className="ch-title">📊 UC Dashboard</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>

            {/* Einzel-Modus: Dropdown */}
            {!multiMode && (
              <select
                value={ucId}
                onChange={e => setUcId(e.target.value)}
                disabled={loading}
                style={{ fontSize: 13, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', minWidth: 240 }}
              >
                <option value="">{tx('— Use Case wählen —')}</option>
                {useCases.map((u: UseCase) => (
                  <option key={u.id} value={u.id}>{u.id} — {u.title}</option>
                ))}
              </select>
            )}

            {/* Einzel-Modus: Drucken */}
            {!multiMode && uc && (
              <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                🖨️ {tx('Als PDF drucken')}
              </button>
            )}

            {/* Multi-Modus: Drucken */}
            {multiMode && (
              <button
                className="btn btn-primary btn-sm"
                disabled={count === 0}
                onClick={() => window.print()}
              >
                🖨️ {count > 0 ? `${count} UC${count !== 1 ? 's' : ''} drucken` : tx('Auswahl drucken')}
              </button>
            )}

            {/* Toggle */}
            <button
              className={`btn btn-sm ${multiMode ? '' : 'btn-outline'}`}
              style={multiMode ? { background: 'var(--petrol)', color: '#fff', border: '1px solid var(--petrol)' } : {}}
              onClick={() => { setMulti(m => !m); setSel(new Set()); setSearch(''); }}
            >
              {multiMode ? '✓ Mehrfachauswahl aktiv' : '☐ Mehrere drucken'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Multi-Modus: Auswahlliste ────────────────────── */}
      {multiMode && (
        <div className="ucd-multi-panel card" style={{ marginBottom: 16, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Use Cases für den Druck auswählen
              {count > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--petrol)',
                  background: 'rgba(42,79,79,.09)', padding: '2px 8px', borderRadius: 10 }}>
                  {count} ausgewählt
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setSel(new Set(useCases.map(u => u.id)))}>Alle</button>
              <button className="btn btn-outline btn-sm" onClick={() => setSel(new Set())}>Keine</button>
            </div>
          </div>

          <input
            className="form-input"
            placeholder="Filtern nach ID, Titel, Abteilung…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 10, fontSize: 13 }}
          />

          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredUcs.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 4px' }}>Keine Use Cases gefunden.</div>
            )}
            {filteredUcs.map(u => {
              const sel = selectedIds.has(u.id);
              return (
                <label key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                  background: sel ? 'rgba(42,79,79,.07)' : 'transparent',
                  border: `1px solid ${sel ? 'rgba(42,79,79,.2)' : 'transparent'}`,
                  transition: 'background .1s, border .1s',
                }}>
                  <input type="checkbox" checked={sel} onChange={() => toggleId(u.id)} style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)', width: 130, flexShrink: 0 }}>{u.id}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{u.title}</span>
                  {u.cl && <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{u.cl}</span>}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Einzel-Modus: Empty / Not found / Dashboard ── */}
      {!multiMode && !ucId && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>UC Dashboard</div>
          <div style={{ fontSize: 13 }}>{tx('Wähle einen Use Case aus der Dropdown-Liste, um den One-Pager anzuzeigen.')}</div>
        </div>
      )}
      {!multiMode && ucId && !uc && !loading && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 24, color: 'var(--muted)' }}>
          {tx('Use Case nicht gefunden.')}
        </div>
      )}
      {!multiMode && uc && <DashboardContent uc={uc} hub={hub as Record<string, unknown> | undefined} />}

      {/* ── Multi-Modus: Hinweis wenn leer ────────────────── */}
      {multiMode && count === 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Wähle einen oder mehrere Use Cases aus der Liste oben aus.
        </div>
      )}

      {/* ── Print-Pages: screen=hidden, print=sichtbar ───── */}
      <div className="ucd-print-pages">
        {selectedUcs.map((u, i) => (
          <PrintablePage key={u.id} uc={u} isLast={i === selectedUcs.length - 1} />
        ))}
      </div>
    </div>
  );
}
