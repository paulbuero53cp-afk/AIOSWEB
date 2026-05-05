import { useState } from 'react';
import useSWR from 'swr';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider, useToast } from '@/context/ToastContext';
import Dashboard    from '@/components/screens/Dashboard';
import UseCases     from '@/components/screens/UseCases';
import NewUseCase   from '@/components/screens/NewUseCase';
import Governance        from '@/components/screens/Governance';
import IncidentLog       from '@/components/screens/IncidentLog';
import AgentHub          from '@/components/screens/AgentHub';
import RiskAssessment    from '@/components/screens/RiskAssessment';
import GateChecks        from '@/components/screens/GateChecks';
import BusinessCase      from '@/components/screens/BusinessCase';
import DsfaScreen        from '@/components/screens/Dsfa';
import ArtefaktHub       from '@/components/screens/ArtefaktHub';
import PortfolioBoard    from '@/components/screens/PortfolioBoard';
import AuditLogScreen    from '@/components/screens/AuditLog';
import InfoScreen        from '@/components/screens/Info';
import AiStrategyScreen  from '@/components/screens/AiStrategy';
import { swrFetcher } from '@/lib/api';
import type { Screen, Language, UseCase, Incident } from '@/types';
import '@/styles/global.css';

// ── Sidebar Navigation Structure ─────────────────────────────
type NavItem = { id: Screen; label: string; icon: string };
type NavSection = { title: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Übersicht',
    items: [
      { id: 'dashboard',   label: 'Dashboard',        icon: '📊' },
      { id: 'portfolio',   label: 'Portfolio Board',  icon: '📁' },
      { id: 'aistrategy',  label: 'KI bei STOCKMEIER',icon: '💡' },
    ],
  },
  {
    title: 'Use Cases',
    items: [
      { id: 'usecases',    label: 'Alle Use Cases',   icon: '🤖' },
      { id: 'agenthub',    label: 'AI Agent Hub',     icon: '⚡' },
      { id: 'new',         label: 'Neu erfassen',      icon: '➕' },
    ],
  },
  {
    title: 'Governance',
    items: [
      { id: 'governance',  label: 'Governance Cockpit', icon: '🛡' },
      { id: 'incidents',   label: 'Incident Log',       icon: '⚠️' },
    ],
  },
  {
    title: 'Dokumente',
    items: [
      { id: 'artefakthub', label: 'Dokumentations-Hub', icon: '📄' },
      { id: 'riskassess',  label: 'Risk Assessment',    icon: '⚠' },
      { id: 'gatechecks',  label: 'Gate-Checklisten',   icon: '✓' },
      { id: 'bizcases',    label: 'Business Cases',     icon: '📈' },
      { id: 'dsfa',        label: 'DSFA',               icon: '🔒' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { id: 'auditlog',    label: 'Audit Log',          icon: '📋' },
      { id: 'info',        label: 'Info & Config',      icon: 'ℹ️' },
    ],
  },
];

// Flat list for topbar title lookup
const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap(s => s.items);

function Sidebar({
  active,
  onNav,
  lang,
  onLangToggle,
  govBadge,
  incBadge,
}: {
  active: Screen;
  onNav: (s: Screen) => void;
  lang: Language;
  onLangToggle: () => void;
  govBadge: number;
  incBadge: number;
}) {
  return (
    <div className="sidebar">
      <div className="slogo">
        <div className="slogo-top">STOCKMEIER</div>
        <div className="slogo-bot">AI Management System</div>
      </div>
      <nav className="snav">
        {NAV_SECTIONS.map(section => (
          <div key={section.title}>
            <div className="nsec">{section.title}</div>
            {section.items.map(item => (
              <div
                key={item.id}
                className={`ni${active === item.id ? ' active' : ''}`}
                onClick={() => onNav(item.id)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.id === 'governance' && govBadge > 0 && (
                  <span className="nbadge">{govBadge}</span>
                )}
                {item.id === 'incidents' && incBadge > 0 && (
                  <span className="nbadge">!</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div className="sfooter">
        <div style={{ marginBottom: 6 }}>ISO 42001 aligned</div>
        <button
          onClick={onLangToggle}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: 11 }}
        >
          {lang === 'de' ? '🌐 EN' : '🌐 DE'}
        </button>
      </div>
    </div>
  );
}

// ── AppShell ──────────────────────────────────────────────────
function AppShell() {
  const { loading, principal, isAuthenticated } = useAuth();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [lang, setLang] = useState<Language>('de');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Live-Badges
  const { data: ucData }  = useSWR<UseCase[]>('/api/usecases', swrFetcher);
  const { data: incData } = useSWR<Incident[]>('/api/incidents', swrFetcher);
  const govBadge = (ucData ?? [])
    .filter(u => u.act && (u.app === 'Pending' || u.rt === 'High')).length;
  const incBadge = (incData ?? []).filter(i => i.st === 'Open').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--petrol)', fontFamily: 'DM Sans,sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>AIOS wird geladen…</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // SWA Built-in Auth redirectet automatisch via 401-Override in staticwebapp.config.json
    // Dieser State sollte nie auftreten — Fallback
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <a href="/.auth/login/aad" className="btn btn-primary">Mit Microsoft anmelden</a>
      </div>
    );
  }

  const screenTitle = NAV_ITEMS.find(n => n.id === screen)?.label ?? screen;

  return (
    <div className="app">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay mob-open"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={sidebarOpen ? 'sidebar mob-open' : 'sidebar'}>
        <Sidebar
          active={screen}
          onNav={(s) => { setScreen(s); setSidebarOpen(false); }}
          lang={lang}
          onLangToggle={() => setLang(l => l === 'de' ? 'en' : 'de')}
          govBadge={govBadge}
          incBadge={incBadge}
        />
      </div>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          {/* Hamburger (mobile) */}
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Menü"
          >
            <span /><span /><span />
          </button>

          <div className="topbar-title">{screenTitle}</div>

          <div className="topbar-actions">
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              👤 {principal?.userDetails ?? '—'}
            </span>
            <a href="/.auth/logout" className="btn btn-outline btn-sm">
              Abmelden
            </a>
          </div>
        </div>

        <div className="content">
          {screen === 'dashboard'  && <Dashboard   onNav={(s) => setScreen(s as Screen)} />}
          {screen === 'usecases'   && <UseCases    onNav={(s) => setScreen(s as Screen)} />}
          {screen === 'new'        && <NewUseCase  onNav={(s) => setScreen(s as Screen)} />}
          {screen === 'governance' && <Governance  onNav={(s) => setScreen(s as Screen)} />}
          {screen === 'incidents'  && <IncidentLog />}
          {screen === 'agenthub'   && <AgentHub />}
          {screen === 'portfolio'  && <PortfolioBoard />}
          {screen === 'artefakthub'&& <ArtefaktHub onNav={(s) => setScreen(s as Screen)} />}
          {screen === 'riskassess' && <RiskAssessment />}
          {screen === 'gatechecks' && <GateChecks />}
          {screen === 'bizcases'   && <BusinessCase />}
          {screen === 'dsfa'       && <DsfaScreen />}
          {screen === 'auditlog'   && <AuditLogScreen />}
          {screen === 'info'       && <InfoScreen />}
          {screen === 'aistrategy' && <AiStrategyScreen onNav={(s) => setScreen(s as Screen)} />}
        </div>
      </div>

      {/* Toast */}
      <ToastRenderer />
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────
function ToastRenderer() {
  const { toast } = useToast();
  const icon = toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ';
  return (
    <div className={`toast${toast.visible ? ' show' : ''}${toast.type === 'success' ? ' toast-success' : toast.type === 'error' ? ' toast-error' : ''}`}>
      {icon} {toast.message}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AuthProvider>
  );
}
