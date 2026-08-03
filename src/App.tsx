import { useState } from 'react';
import useSWR from 'swr';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider, useToast } from '@/context/ToastContext';
import { AppConfigProvider, useAppConfig } from '@/context/AppConfigContext';
import { LanguageProvider, useLang } from '@/context/LanguageContext';
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
import AiToolsScreen      from '@/components/screens/AiTools';
import ReportsScreen      from '@/components/screens/Reports';
import InfoScreen        from '@/components/screens/Info';
import AiStrategyScreen  from '@/components/screens/AiStrategy';
import UcDashboard       from '@/components/screens/UcDashboard';
import UsersScreen       from '@/components/screens/Users';
import IsoGovernance     from '@/components/screens/IsoGovernance';
import { swrFetcher } from '@/lib/api';
import { APP_VERSION } from '@/lib/version';
import type { Screen, UseCase, Incident, AppConfig } from '@/types';
import '@/styles/global.css';

// ── Sidebar Navigation Structure ─────────────────────────────
type NavItem = { id: Screen; labelKey: string; icon: string };
type NavSection = { titleKey: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'sec.overview',
    items: [
      { id: 'dashboard',   labelKey: 'nav.dashboard',   icon: '📊' },
      { id: 'reports',     labelKey: 'nav.reports',     icon: '📑' },
      { id: 'portfolio',   labelKey: 'nav.portfolio',   icon: '📁' },
      { id: 'aistrategy',  labelKey: 'nav.aistrategy',  icon: '💡' },
    ],
  },
  {
    titleKey: 'sec.usecases',
    items: [
      { id: 'usecases',    labelKey: 'nav.usecases',    icon: '🤖' },
      { id: 'ucdashboard', labelKey: 'nav.ucdashboard', icon: '📊' },
      { id: 'agenthub',    labelKey: 'nav.agenthub',    icon: '⚡' },
      { id: 'new',         labelKey: 'nav.new',         icon: '➕' },
    ],
  },
  {
    titleKey: 'sec.governance',
    items: [
      { id: 'governance',  labelKey: 'nav.governance',  icon: '🛡' },
      { id: 'aitools',     labelKey: 'nav.aitools',     icon: '✅' },
      { id: 'incidents',   labelKey: 'nav.incidents',   icon: '⚠️' },
      { id: 'isogov',      labelKey: 'nav.isogov',      icon: '📐' },
    ],
  },
  {
    titleKey: 'sec.documents',
    items: [
      { id: 'artefakthub', labelKey: 'nav.artefakthub', icon: '📄' },
      { id: 'riskassess',  labelKey: 'nav.riskassess',  icon: '⚠' },
      { id: 'gatechecks',  labelKey: 'nav.gatechecks',  icon: '✓' },
      { id: 'bizcases',    labelKey: 'nav.bizcases',    icon: '📈' },
      { id: 'dsfa',        labelKey: 'nav.dsfa',        icon: '🔒' },
    ],
  },
  {
    titleKey: 'sec.admin',
    items: [
      { id: 'users',       labelKey: 'nav.users',       icon: '👥' },
      { id: 'auditlog',    labelKey: 'nav.auditlog',    icon: '📋' },
      { id: 'info',        labelKey: 'nav.info',        icon: 'ℹ️' },
    ],
  },
];

// Flat list for topbar title lookup
const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap(s => s.items);

function Sidebar({
  active,
  onNav,
  govBadge,
  incBadge,
  config,
}: {
  active: Screen;
  onNav: (s: Screen) => void;
  govBadge: number;
  incBadge: number;
  config: AppConfig;
}) {
  const { lang, toggle, t } = useLang();
  return (
    <div className="sidebar">
      <div className="slogo">
        <div className="slogo-top">{config.name}</div>
        <div className="slogo-bot">{config.tag}</div>
        <div style={{ fontSize: 10, color: 'var(--sidebar-label)', marginTop: 4, opacity: 0.6 }}>
          v{APP_VERSION}
        </div>
      </div>
      <nav className="snav">
        {NAV_SECTIONS.map(section => (
          <div key={section.titleKey}>
            <div className="nsec">{t(section.titleKey)}</div>
            {section.items.map(item => (
              <div
                key={item.id}
                className={`ni${active === item.id ? ' active' : ''}`}
                onClick={() => onNav(item.id)}
              >
                <span>{item.icon}</span>
                <span>{item.id === 'aistrategy' ? t('nav.aistrategyAt', { name: config.name }) : t(item.labelKey)}</span>
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
      {config.chatbot.enabled && config.chatbot.url && (
        <a
          href={config.chatbot.url}
          target="_blank"
          rel="noopener noreferrer"
          title={config.chatbot.hint || config.chatbot.label}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 20px', color: 'rgba(255,255,255,.75)',
            fontSize: 13.5, textDecoration: 'none',
            borderLeft: '3px solid transparent',
            transition: 'all .15s',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.05)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.75)'; (e.currentTarget as HTMLElement).style.background = ''; }}
        >
          🤖 {config.chatbot.label || t('chatbot.fallbackLabel')}
        </a>
      )}
      <div className="sfooter">
        <div style={{ marginBottom: 6 }}>{config.iso}</div>
        <button
          onClick={toggle}
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
  const { loading, principal, isAuthenticated, aiosUser } = useAuth();
  const config = useAppConfig();
  const { t } = useLang();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [selectedUcId, setSelectedUcId] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Live-Badges — nur für autorisierte Nutzer laden (sonst 403-Rauschen)
  const { data: ucData }  = useSWR<UseCase[]>(aiosUser ? '/api/usecases' : null, swrFetcher);
  const { data: incData } = useSWR<Incident[]>(aiosUser ? '/api/incidents' : null, swrFetcher);
  const govBadge = (ucData ?? [])
    .filter(u => u.act && (u.app === 'Pending' || u.rt === 'High')).length;
  const incBadge = (incData ?? []).filter(i => i.st === 'Open').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--petrol)', fontFamily: 'var(--font)' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/favicon.svg" alt="AIOS" style={{ width: 56, height: 56, marginBottom: 14, borderRadius: 10 }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>{t('shell.loading')}</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // SWA Built-in Auth redirectet automatisch via 401-Override in staticwebapp.config.json
    // Dieser State sollte nie auftreten — Fallback
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <a href="/.auth/login/aad" className="btn btn-primary">{t('shell.signInMs')}</a>
      </div>
    );
  }

  // Eingeloggt, aber NICHT in AIOS_Users (oder gesperrt) → kein Zugriff.
  // Backend liefert für diese Nutzer ohnehin nur 403 — hier die Fehlermeldung.
  if (!aiosUser) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontFamily: 'var(--font)', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <img src="/favicon.svg" alt="AIOS" style={{ width: 56, height: 56, marginBottom: 16, borderRadius: 10 }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--petrol)', marginBottom: 10 }}>
            {t('access.title')}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 8 }}>
            {t('access.notEnabled')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
            {t('access.loggedInAs')} <strong>{principal?.userDetails ?? '—'}</strong>.<br />
            {t('access.contactAdmin')}
          </div>
          <a href="/.auth/logout" className="btn btn-outline btn-sm">
            {t('access.logoutSwitch')}
          </a>
        </div>
      </div>
    );
  }

  const screenNav = NAV_ITEMS.find(n => n.id === screen);
  const screenTitle = screenNav ? t(screenNav.labelKey) : screen;

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
          onNav={(s) => { setScreen(s); setSelectedUcId(undefined); setSidebarOpen(false); }}
          govBadge={govBadge}
          incBadge={incBadge}
          config={config}
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
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { setScreen('info'); setSidebarOpen(false); }}
              title="Info & Config"
            >
              {t('top.config')}
            </button>
            <a href="/.auth/logout" className="btn btn-outline btn-sm">
              {t('top.logout')}
            </a>
          </div>
        </div>

        <div className="content">
          {screen === 'dashboard'  && <Dashboard   onNav={(s) => setScreen(s as Screen)} />}
          {screen === 'usecases'   && <UseCases    onNav={(s, ucId) => { setSelectedUcId(ucId); setScreen(s as Screen); }} />}
          {screen === 'new'        && <NewUseCase  onNav={(s) => setScreen(s as Screen)} />}
          {screen === 'governance' && <Governance  onNav={(s) => setScreen(s as Screen)} />}
          {screen === 'incidents'  && <IncidentLog />}
          {screen === 'agenthub'   && <AgentHub />}
          {screen === 'portfolio'  && <PortfolioBoard />}
          {screen === 'artefakthub'&& <ArtefaktHub onNav={(s) => setScreen(s as Screen)} />}
          {screen === 'riskassess' && <RiskAssessment    key={selectedUcId ?? ''} initialUcId={selectedUcId} />}
          {screen === 'gatechecks' && <GateChecks        key={selectedUcId ?? ''} initialUcId={selectedUcId} />}
          {screen === 'bizcases'   && <BusinessCase      key={selectedUcId ?? ''} initialUcId={selectedUcId} />}
          {screen === 'dsfa'       && <DsfaScreen        key={selectedUcId ?? ''} initialUcId={selectedUcId} />}
          {screen === 'ucdashboard'&& <UcDashboard       key={selectedUcId ?? ''} initialUcId={selectedUcId} />}
          {screen === 'users'      && <UsersScreen />}
          {screen === 'auditlog'   && <AuditLogScreen />}
          {screen === 'aitools'    && <AiToolsScreen onNav={(s, ucId) => { setSelectedUcId(ucId); setScreen(s as Screen); }} />}
          {screen === 'reports'    && <ReportsScreen onNav={(s, ucId) => { setSelectedUcId(ucId); setScreen(s as Screen); }} />}
          {screen === 'isogov'     && <IsoGovernance />}
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
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <AppConfigProvider>
            <AppShell />
          </AppConfigProvider>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
