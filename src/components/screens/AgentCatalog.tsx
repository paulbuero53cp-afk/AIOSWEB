// ─────────────────────────────────────────────────────────────
//  Agent Hub — Öffentlicher Katalog produktiver KI-Agenten
//  Erreichbar unter /agenthub ohne Auth (SWA-Route: anonymous)
//  Nur UCs mit lc=Run, app=Approved, or=Operational Ready
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useLang } from '@/context/LanguageContext';
import '@/styles/global.css';

interface PublicAgent {
  id: string;
  title: string;
  cl: string;
  sys: string;
  own: string;
  cap: string;
  desc: string;
  link: string;
  useCaseCategory: string;
}

// ── Cluster-Farben ────────────────────────────────────────────
const CLUSTER_HUE: Record<string, string> = {
  HR:                   '#4d8080',
  Finance:              '#2a6e4d',
  IT:                   '#2a4f7f',
  Vertrieb:             '#7a4a1a',
  Sales:                '#7a4a1a',
  Marketing:            '#6a3080',
  Einkauf:              '#3a6a3a',
  Purchasing:           '#3a6a3a',
  Produktion:           '#8a2a2a',
  Production:           '#8a2a2a',
  Logistik:             '#8a6a1a',
  Logistics:            '#8a6a1a',
  'Recht / Compliance': '#555',
  'Legal / Compliance': '#555',
  'Customer Service':   '#2a5a80',
  'F&E':                '#3a5060',
  'R&D':                '#3a5060',
};

function clusterColor(cl: string) {
  return CLUSTER_HUE[cl] ?? '#2a4f4f';
}

// ── Agent Card ────────────────────────────────────────────────
function AgentCard({ agent }: { agent: PublicAgent }) {
  const color = clusterColor(agent.cl);
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow .15s, transform .15s',
      boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    }}
      onMouseOver={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.12)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,.06)';
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      {/* Farbiger Akzentstreifen oben */}
      <div style={{ height: 4, background: color }} />

      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Meta-Zeile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {agent.cl && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '.07em',
              textTransform: 'uppercase', color, background: color + '14',
              border: `1px solid ${color}30`, borderRadius: 4, padding: '2px 7px',
            }}>{agent.cl}</span>
          )}
          {agent.sys && (
            <span style={{
              fontSize: 11, color: 'var(--muted)',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '2px 7px',
            }}>{agent.sys}</span>
          )}
        </div>

        {/* Titel */}
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
          {agent.title}
        </div>

        {/* Owner + Kategorie */}
        <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {agent.own && <span>👤 {agent.own}</span>}
          {agent.cap && <span>⚙️ {agent.cap}</span>}
        </div>

        {/* Beschreibung */}
        {agent.desc && (
          <div style={{
            fontSize: 13, color: 'var(--text)', lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
            flex: 1,
          }}>
            {agent.desc}
          </div>
        )}
      </div>

      {/* Footer */}
      {agent.link && (
        <div style={{ padding: '10px 18px 14px', borderTop: '1px solid var(--border)' }}>
          <a
            href={agent.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, color,
              textDecoration: 'none', padding: '5px 10px',
              border: `1px solid ${color}40`, borderRadius: 6,
              background: color + '0a',
              transition: 'background .15s',
            }}
            onMouseOver={e => ((e.currentTarget as HTMLElement).style.background = color + '18')}
            onMouseOut={e => ((e.currentTarget as HTMLElement).style.background = color + '0a')}
          >
            ↗ Zur Anwendung
          </a>
        </div>
      )}
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────
export default function AgentCatalog() {
  const { lang, toggle } = useLang();

  const [agents, setAgents]   = useState<PublicAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [cluster, setCluster] = useState('');

  const tx = (de: string, en: string) => lang === 'de' ? de : en;

  useEffect(() => {
    fetch('/api/catalog')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: PublicAgent[]) => { setAgents(data); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  }, []);

  // Cluster-Liste aus Daten ableiten
  const clusters = [...new Set(agents.map(a => a.cl).filter(Boolean))].sort();

  // Filtern
  const filtered = agents.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      a.title.toLowerCase().includes(q) ||
      a.desc.toLowerCase().includes(q) ||
      a.own.toLowerCase().includes(q) ||
      a.sys.toLowerCase().includes(q);
    const matchCluster = !cluster || a.cl === cluster;
    return matchSearch && matchCluster;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ background: '#2a4f4f', padding: '0 0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img src="/favicon.svg" alt="AIOS" style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 3 }}>
                  AIOS
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                  {tx('Agent Hub', 'Agent Hub')}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>
                  {tx('Genehmigte KI-Anwendungen im produktiven Einsatz', 'Approved AI applications in productive use')}
                </div>
              </div>
            </div>
            <button onClick={toggle} style={{
              background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
              borderRadius: 6, padding: '5px 12px', fontSize: 12, color: 'rgba(255,255,255,.85)',
              cursor: 'pointer', flexShrink: 0, marginTop: 4,
            }}>
              {lang === 'de' ? '🌐 English' : '🌐 Deutsch'}
            </button>
          </div>

          {/* Stats-Zeile */}
          {!loading && !error && (
            <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.1)' }}>
              <div style={{ color: '#fff' }}>
                <span style={{ fontSize: 24, fontWeight: 700 }}>{agents.length}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginLeft: 6 }}>
                  {tx('Agenten im Einsatz', 'agents in use')}
                </span>
              </div>
              {clusters.length > 0 && (
                <div style={{ color: '#fff' }}>
                  <span style={{ fontSize: 24, fontWeight: 700 }}>{clusters.length}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginLeft: 6 }}>
                    {tx('Bereiche', 'departments')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Suche & Filter ──────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 0' }}>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tx('Suchen nach Name, Beschreibung, Owner, System…', 'Search by name, description, owner, system…')}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '11px 16px', fontSize: 14,
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--surface)', color: 'var(--text)',
            outline: 'none', marginBottom: 16,
          }}
        />

        {/* Cluster-Chips */}
        {clusters.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {(['', ...clusters] as string[]).map(cl => {
              const active = cluster === cl;
              const color  = cl ? clusterColor(cl) : '#2a4f4f';
              return (
                <button
                  key={cl || '__all'}
                  onClick={() => setCluster(cl)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all .15s',
                    background: active ? color : 'var(--surface)',
                    color: active ? '#fff' : 'var(--muted)',
                    border: `1.5px solid ${active ? color : 'var(--border)'}`,
                  }}
                >
                  {cl || tx('Alle Bereiche', 'All departments')}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Ergebniszeile ── */}
        {!loading && !error && search && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            {filtered.length} {tx('Ergebnis(se) für', 'result(s) for')} „{search}"
          </div>
        )}

        {/* ── Ladezustand ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
            <img src="/favicon.svg" alt="" style={{ width: 40, height: 40, borderRadius: 6, marginBottom: 12, opacity: 0.5 }} />
            <div>{tx('Lädt…', 'Loading…')}</div>
          </div>
        )}

        {/* ── Fehler ── */}
        {error && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--red)', fontSize: 14 }}>
            {tx('Fehler beim Laden:', 'Error loading:')} {error}
          </div>
        )}

        {/* ── Kein Ergebnis ── */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14 }}>
              {search || cluster
                ? tx('Keine Agenten gefunden. Filter anpassen?', 'No agents found. Try adjusting the filter.')
                : tx('Noch keine produktiven Agenten verfügbar.', 'No productive agents available yet.')}
            </div>
          </div>
        )}

        {/* ── Karten-Grid ── */}
        {!loading && !error && filtered.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
            paddingBottom: 48,
          }}>
            {filtered.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
