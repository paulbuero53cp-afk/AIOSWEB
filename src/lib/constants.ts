// ─────────────────────────────────────────────────────────────
//  AIOS — Konstanten (1:1 aus HTML v4 migriert)
// ─────────────────────────────────────────────────────────────

// ── Risk Assessment ───────────────────────────────────────────
export const RA_DIMS = [
  {
    key: 'wahrscheinlichkeit',
    label: 'Eintrittswahrscheinlichkeit',
    help: 'Wie wahrscheinlich ist ein Schadensfall durch dieses KI-System?',
    opts: [
      '1 — Unwahrscheinlich (theoretisch möglich)',
      '2 — Möglich (gelegentliche Fehler erwartet)',
      '3 — Wahrscheinlich (regelmäßige Fehler oder Missbrauch)',
    ],
  },
  {
    key: 'schwere',
    label: 'Schadensausmaß',
    help: 'Wie schwerwiegend wäre ein Schadensereignis für Betroffene oder das Unternehmen?',
    opts: [
      '1 — Gering (intern, korrigierbar)',
      '2 — Mittel (Kundenwirkung, Reputationsschaden)',
      '3 — Hoch (rechtliche Konsequenzen, Personenschaden)',
    ],
  },
  {
    key: 'datenmenge',
    label: 'Datenmenge & -umfang',
    help: 'Welche Menge personenbezogener oder sensibler Daten wird verarbeitet?',
    opts: [
      '1 — Keine oder anonymisierte Daten',
      '2 — Einzelne Personen / kleine Gruppen',
      '3 — Große Mengen / systematische Verarbeitung',
    ],
  },
  {
    key: 'sensitivitaet',
    label: 'Datensensitivität',
    help: 'Wie sensibel sind die verarbeiteten Daten (Art. 9 DSGVO, Berufsgeheimnisse)?',
    opts: [
      '1 — Nicht sensibel (z.B. allg. Geschäftsdaten)',
      '2 — Intern sensibel (Finanzdaten, Leistungsdaten)',
      '3 — Besonders sensibel (Gesundheit, Herkunft, Biometrie)',
    ],
  },
  {
    key: 'autonomie',
    label: 'Autonomiegrad',
    help: 'Wie stark greift das System ohne menschliche Prüfung in Entscheidungen ein?',
    opts: [
      '1 — Empfehlung (Mensch entscheidet immer)',
      '2 — Bedingt autonom (in definierten Grenzen)',
      '3 — Vollständig autonom (externe Wirkung möglich)',
    ],
  },
  {
    key: 'transparenz',
    label: 'Erklärbarkeit / Transparenz',
    help: 'Kann das System seine Empfehlungen nachvollziehbar begründen?',
    opts: [
      '1 — Vollständig erklärbar (Regelbasiert / Log)',
      '2 — Teilweise erklärbar (Featureimportance)',
      '3 — Black Box (Neuronales Netz ohne Erklärung)',
    ],
  },
  {
    key: 'reversibilitaet',
    label: 'Reversibilität',
    help: 'Können Entscheidungen oder Aktionen des Systems rückgängig gemacht werden?',
    opts: [
      '1 — Vollständig reversibel',
      '2 — Teilweise reversibel (mit Aufwand)',
      '3 — Irreversibel (z.B. Kündigung, Veröffentlichung)',
    ],
  },
] as const;

export const RA_EUAIACT = [
  { key: 'eu1', label: 'Kritische Infrastruktur (Energie, Wasser, Verkehr, Gesundheit)' },
  { key: 'eu2', label: 'Bildung: Zugang, Beurteilung, Prüfungskontrolle' },
  { key: 'eu3', label: 'Beschäftigung: Rekrutierung, Beförderung, Kündigung, Überwachung' },
  { key: 'eu4', label: 'Wesentliche Dienstleistungen: Kredit, Versicherung, Sozialhilfe' },
  { key: 'eu5', label: 'Strafverfolgung, Grenzkontrolle, Justiz' },
  { key: 'eu6', label: 'Demokratie: Wahlen, politische Werbung' },
  { key: 'eu7', label: 'Biometrische Identifikation / Kategorisierung' },
] as const;

export const RA_MITIGATION = [
  { key: 'm1', label: 'Human-in-the-Loop für alle kritischen Entscheidungen' },
  { key: 'm2', label: 'Erklärungskomponente / Audit-Trail implementiert' },
  { key: 'm3', label: 'Bias-Testing vor Go-Live durchgeführt' },
  { key: 'm4', label: 'DSGVO-Prüfung / DSFA abgeschlossen' },
  { key: 'm5', label: 'Fallback-Mechanismus definiert und getestet' },
  { key: 'm6', label: 'Monitoring-Plan und Eskalationsweg festgelegt' },
  { key: 'm7', label: 'Mitarbeitende im Umgang mit dem System geschult' },
] as const;

// ── Gate-Checklisten ──────────────────────────────────────────
export const GATES = {
  A: {
    name: 'Gate A — Konzeptfreigabe',
    desc: 'Prüfung vor Beginn der Entwicklung / des Piloten',
    color: 'var(--green)',
    bg: 'var(--green-bg)',
    items: [
      { key: 'a1', label: 'Use Case ist klar und vollständig dokumentiert (Titel, Cluster, Beschreibung, Owner)' },
      { key: 'a2', label: 'Business Case liegt vor — Nutzen und Kosten sind grob quantifiziert' },
      { key: 'a3', label: 'Risk Assessment ist durchgeführt — Risk Tier ist festgelegt' },
      { key: 'a4', label: 'Datenlage ist geprüft — benötigte Daten sind verfügbar und DSGVO-konform nutzbar' },
      { key: 'a5', label: 'KI-Technologie ist mit Unternehmens-IT-Strategie kompatibel' },
      { key: 'a6', label: 'Business Owner ist benannt und hat schriftlich zugestimmt' },
      { key: 'a7', label: 'Governance-Trigger wurden geprüft — Governance-Tier ist korrekt zugewiesen' },
      { key: 'a8', label: 'Kein Verstoß gegen Red Lines (KI-Rahmenwerk Abschnitt 04)' },
      { key: 'a9', label: 'EU AI Act Screening durchgeführt — Einordnung dokumentiert' },
    ],
  },
  B: {
    name: 'Gate B — Pilotfreigabe',
    desc: 'Prüfung vor Go-Live im Pilotbetrieb (eingeschränkter Scope)',
    color: 'var(--yellow)',
    bg: 'var(--yellow-bg)',
    items: [
      { key: 'b1', label: 'Technische Umsetzung ist verifiziert — Proof of Concept erfolgreich' },
      { key: 'b2', label: 'Bias-Testing und Qualitätsprüfung der Modellergebnisse abgeschlossen' },
      { key: 'b3', label: 'Human-in-the-Loop ist implementiert (sofern Risk Tier Medium/High)' },
      { key: 'b4', label: 'Fallback-Mechanismus ist definiert und getestet' },
      { key: 'b5', label: 'Datenschutzkonforme Verarbeitung ist sichergestellt (DSFA falls erforderlich)' },
      { key: 'b6', label: 'Pilot-Scope ist klar begrenzt (Nutzergruppe, Zeitraum, Systeme)' },
      { key: 'b7', label: 'Monitoring-Konzept liegt vor — KPIs und Alerting sind definiert' },
      { key: 'b8', label: 'Betroffene Mitarbeitende wurden informiert und ggf. geschult' },
      { key: 'b9', label: 'IT-Security-Review abgeschlossen (Penetration Test falls erforderlich)' },
      { key: 'b10', label: 'Approval Status im AIMS ist auf "Approved" gesetzt' },
    ],
  },
  C: {
    name: 'Gate C — Produktionsfreigabe',
    desc: 'Prüfung vor vollständigem Roll-out in den operativen Betrieb',
    color: 'var(--accent)',
    bg: 'var(--accent-pale)',
    items: [
      { key: 'c1', label: 'Pilot-Evaluation abgeschlossen — KPIs wurden erreicht oder übertroffen' },
      { key: 'c2', label: 'Produktionsdaten-Pipeline ist stabil und überwacht' },
      { key: 'c3', label: 'Vollständige Betriebsdokumentation liegt vor (Betriebshandbuch)' },
      { key: 'c4', label: 'Incident-Response-Prozess ist bekannt und geübt' },
      { key: 'c5', label: 'SLAs / SLOs für das KI-System sind definiert und vereinbart' },
      { key: 'c6', label: 'Review-Datum im AIMS ist gesetzt (max. 12 Monate)' },
      { key: 'c7', label: 'Datenschutzbeauftragter hat Freigabe erteilt (bei DSFA-Pflicht)' },
      { key: 'c8', label: 'Lieferantenvertrag (falls Drittanbieter) enthält AI-Governance-Klauseln' },
      { key: 'c9', label: 'Executive Sponsor hat schriftliche Freigabe gegeben' },
      { key: 'c10', label: 'Erfolgsmessung (KPI-Tracking) ist operativ und wird aktiv genutzt' },
    ],
  },
} as const;

// ── DSFA Trigger (Art. 35 DSGVO) ─────────────────────────────
export const DSFA_TRIGGER = [
  { key: 'dt1', label: 'Systematische und umfangreiche Bewertung persönlicher Aspekte (Profiling)' },
  { key: 'dt2', label: 'Verarbeitung besonderer Datenkategorien (Art. 9 DSGVO) in großem Umfang' },
  { key: 'dt3', label: 'Systematische Überwachung öffentlich zugänglicher Bereiche' },
  { key: 'dt4', label: 'Neue Technologie mit hohem Risiko für Betroffene' },
  { key: 'dt5', label: 'Automatisierte Entscheidungsfindung mit erheblicher Wirkung auf Personen (Art. 22)' },
  { key: 'dt6', label: 'Verarbeitung von Daten schutzbedürftiger Personengruppen (Kinder, Patienten)' },
] as const;

export const DSFA_RISK_ITEMS = [
  { key: 'dr1', label: 'Unbefugter Zugriff auf personenbezogene Daten', dim: 'Vertraulichkeit' },
  { key: 'dr2', label: 'Unbeabsichtigte Veränderung von Personendaten', dim: 'Integrität' },
  { key: 'dr3', label: 'Datenverlust / Nichtverfügbarkeit', dim: 'Verfügbarkeit' },
  { key: 'dr4', label: 'Diskriminierung durch Modellergebnisse (Bias)', dim: 'Fairness' },
  { key: 'dr5', label: 'Mangelnde Transparenz / fehlende Erklärung für Betroffene', dim: 'Transparenz' },
  { key: 'dr6', label: 'Weitergabe an Dritte / internationale Übermittlung ohne Rechtsgrundlage', dim: 'Rechtmäßigkeit' },
] as const;

// ── Dropdown-Optionen ─────────────────────────────────────────
export const UC_CATEGORY_OPTIONS = [
  'Copilot Agents',
  'AI bei der Erstellung',
  'Predictive AI',
  'Externe Tools',
  'AI in Legacy Systemen',
  'Content Creation',
  'Sonstiges',
];

export const CLUSTERS = [
  'Vertrieb', 'Marketing', 'Produktion', 'Logistik', 'Finance',
  'HR', 'IT', 'Einkauf', 'Qualität', 'F&E', 'Sonstiges',
];

export const CAP_OPTIONS = [
  'Generative KI', 'Machine Learning', 'Deep Neural Network',
  'Natural Language Processing', 'Computer Vision', 'Regelwerk',
  'Robotic Process Automation', 'Sonstiges',
];

export const AUTO_OPTIONS = [
  'Empfehlung (Mensch entscheidet)',
  'Bedingt autonom (in Grenzen)',
  'Vollständig autonom',
];

export const LIFECYCLE_OPTIONS: string[] = ['Idea', 'Build', 'Run', 'Retire'];
export const PD_OPTIONS: string[] = ['Start', 'Scale', 'Stop', 'Hold', 'Backlog'];
export const RISK_TIER_OPTIONS: string[] = ['Low', 'Medium', 'High'];

// ── Reliability Gate-Checklisten (ab R-Tier R3) ───────────────
export const GATES_RELIABILITY = {
  base: {
    name: 'Reliability Controls (R3+)',
    desc: 'Pflichtkontrollen für überwachte bis hochautomatisierte KI-Systeme',
    color: '#f59e0b',          // amber — passend zu R3/R4
    bg:    '#f59e0b15',
    items: [
      { key: 'rl1', label: 'Kill-Switch / Emergency-Stop dokumentiert, implementiert und getestet' },
      { key: 'rl2', label: 'Execution Tracing aktiviert — alle Aktionen werden vollständig protokolliert' },
      { key: 'rl3', label: 'Bounded Autonomy definiert — Scope, Limits und Grenzwerte sind dokumentiert' },
      { key: 'rl4', label: 'Rollback-Prozess beschrieben, getestet und für alle Betreiber bekannt' },
      { key: 'rl5', label: 'Monitoring SLA vereinbart, technisch konfiguriert und im Betrieb validiert' },
    ],
  },
  agentic: {
    name: 'Agentic Controls (R5)',
    desc: 'Zusätzliche Pflichtkontrollen für vollautonome Agentic-Systeme (R5)',
    color: '#ef4444',          // rot — R5
    bg:    '#ef444412',
    items: [
      { key: 'rl6', label: 'Agentic Boundary Map erstellt — erlaubte Aktionen und Systemgrenzen dokumentiert' },
      { key: 'rl7', label: 'Human Escalation Path definiert — automatische Eskalation konfiguriert und getestet' },
      { key: 'rl8', label: 'Multi-Agent Orchestration dokumentiert (Abhängigkeiten, Datenaustausch, Fehlerbehandlung)' },
    ],
  },
} as const;

// ── Business Case Defaults ────────────────────────────────────
export const BC_DEFAULT_LOHNKOSTEN = 65; // €/h

// ── Risk Score Berechnung ─────────────────────────────────────
export function calcRiskScore(data: Record<string, string | boolean>): {
  raw: number; pct: number; tier: 'Low' | 'Medium' | 'High'
} {
  const dims = ['wahrscheinlichkeit', 'schwere', 'datenmenge', 'sensitivitaet', 'autonomie', 'transparenz', 'reversibilitaet'];
  const vals = dims.map(k => parseInt(String(data[k] || '1')) || 1);
  const sum = vals.reduce((a, b) => a + b, 0);
  const maxSum = dims.length * 3; // 21
  const pct = Math.round((sum / maxSum) * 100);
  const tier = pct >= 70 ? 'High' : pct >= 40 ? 'Medium' : 'Low';  // 1:1 HTML-Baseline
  return { raw: sum, pct, tier };
}

// ── AI-Tools-Register ─────────────────────────────────────────
// Workflow: Angefragt → In Prüfung → Erlaubt / Nicht erlaubt
export const AITOOL_STATUS_OPTIONS = [
  'Angefragt', 'In Prüfung', 'Erlaubt', 'Eingeschränkt erlaubt', 'Nicht erlaubt', 'Zurückgezogen',
] as const;

// States die nur Approver/Admin setzen dürfen
export const AITOOL_DECISION_STATES = [
  'Erlaubt', 'Eingeschränkt erlaubt', 'Nicht erlaubt', 'Zurückgezogen',
] as const;

export const AITOOL_CATEGORY_OPTIONS = [
  'LLM-Chat', 'Code-Assistent', 'Bildgenerierung', 'Audio/Transkription',
  'Übersetzung', 'Suche/RAG', 'Automatisierung', 'Sonstiges',
];

export const AITOOL_DATALOCATION_OPTIONS = ['EU', 'USA', 'Global/Unklar'];

// Status → Badge-CSS-Klasse (siehe global.css: .bg/.by/.bb/.br/.bgr)
export const AITOOL_STATUS_CSS: Record<string, string> = {
  'Angefragt':             'bb',
  'In Prüfung':            'bb',
  'Erlaubt':               'bg',
  'Eingeschränkt erlaubt': 'by',
  'Nicht erlaubt':         'br',
  'Zurückgezogen':         'bgr',
  'Abgelehnt':             'br',  // backwards-compat
};
