// ─────────────────────────────────────────────────────────────
//  AIOS — Type Definitions
//  Vollständiges Datenmodell aus HTML v4 reverse-engineered
// ─────────────────────────────────────────────────────────────

// ── Auth ──────────────────────────────────────────────────────
export type AiosRole = 'AIOS.Viewer' | 'AIOS.Editor' | 'AIOS.Approver' | 'AIOS.Admin';

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;         // E-Mail oder UPN
  userRoles: string[];
  claims?: { typ: string; val: string }[];
}

// ── UseCase ───────────────────────────────────────────────────
export type RiskTier = 'Low' | 'Medium' | 'High';
export type Lifecycle = 'Idea' | 'Build' | 'Run' | 'Retire';
export type PortfolioDecision = 'Start' | 'Scale' | 'Stop' | 'Hold' | 'Backlog';
export type ApprovalStatus =
  | 'Not required'
  | 'Pending'
  | 'Approved'
  | 'Rejected';
export type OperationalReadiness = 'Not ready' | 'Operational Ready';
export type KiTypeDimension = 'einsatz' | 'erstellung';

// ── Reliability ───────────────────────────────────────────────
/** R1 = Human always decides · R5 = Fully autonomous agentic */
export type ReliabilityTier = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
/** HITL = human in the loop · HOTL = human on the loop · none = no oversight */
export type HitlMode = 'HITL' | 'HOTL' | 'none';
/** Overall automation posture */
export type AutonomyLevel = 'supervised' | 'semi-auto' | 'autonomous';
/** The five reliability failure-mode categories */
export type FailureMode =
  | 'accuracy'
  | 'inconsistency'
  | 'drift'
  | 'agentic'
  | 'infrastructure';

export interface UseCase {
  id: string;                          // UC-001
  title: string;                       // Pflichtfeld
  cl: string;                          // Cluster / Abteilung
  sys: string;                         // KI-System / Werkzeug
  legacy: string;                      // NEU: Betroffenes Legacy-System
  own: string;                         // Business Owner
  cap: string;                         // KI-Technologie (Generative KI / ML / ...)
  useCaseCategory: string;             // Kategorie: Copilot Agents, Predictive AI, …
  kiType: KiTypeDimension[];           // NEU: ['einsatz', 'erstellung']
  auto: string;                        // Autonomiegrad
  lc: Lifecycle;
  pd: PortfolioDecision;
  rt: RiskTier;
  tier: string;                        // Governance-Tier '1'|'2'|'3'
  rev: 'yes' | 'no';                   // Entscheidungen reversibel
  vs: number;                          // Value Score 1-3
  fs: number;                          // Feasibility Score 1-3
  rs: number;                          // Risk Score 1-3
  kpi: 'yes' | 'no';
  app: ApprovalStatus;
  or: OperationalReadiness;
  hitl: 'yes' | 'no';                 // Human in the Loop (Legacy: yes/no)
  toolRef?: string;                   // Verknüpfter AI-Tool (TOOL-ID aus AIOS_AiTools)
  // ── Reliability (P0 — neu) ────────────────────────────────
  rl?: ReliabilityTier;              // Reliability Tier R1–R5
  hitlMode?: HitlMode;               // HITL / HOTL / none (präziser als hitl)
  autonomyLevel?: AutonomyLevel;     // supervised / semi-auto / autonomous
  failureModes?: FailureMode[];      // bekannte Failure-Mode-Risiken
  monitoringSla?: string;            // z.B. "täglich", "wöchentlich", "Echtzeit"
  // ─────────────────────────────────────────────────────────
  gt: [boolean, boolean, boolean, boolean]; // Governance-Trigger GT01-GT04
  sb: [boolean, boolean, boolean, boolean]; // Sensible Bereiche SB01-SB04
  mc: boolean[];                       // Minimum Standard Checks (7)
  act: boolean;                        // Aktiv (false = soft-deleted)
  desc: string;
  link: string;
  createdAt: string;                   // ISO-Date
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// ── Incident ──────────────────────────────────────────────────
export type IncidentType = 'Incident' | 'Deviation' | 'Near Miss';
export type IncidentSeverity = 'Low' | 'Medium' | 'High';
export type IncidentStatus = 'Open' | 'In Progress' | 'Resolved';

export interface Incident {
  id: string;                          // INC-001
  ucid: string;                        // Referenz auf UseCase.id
  type: IncidentType;
  sev: IncidentSeverity;
  st: IncidentStatus;
  desc: string;
  act: string;                         // Ergriffene Maßnahmen
  date: string;
  failureMode?: FailureMode;           // Reliability Failure-Mode-Kategorie (P1)
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// ── Risk Assessment ───────────────────────────────────────────
export interface RiskAssessment {
  ucId: string;
  // 7 Dimensionen — Wert 1-3
  wahrscheinlichkeit: string;
  schwere: string;
  datenmenge: string;
  sensitivitaet: string;
  autonomie: string;
  transparenz: string;
  reversibilitaet: string;
  // EU AI Act Hochrisiko-Check (Anhang III)
  eu1: boolean; eu2: boolean; eu3: boolean; eu4: boolean;
  eu5: boolean; eu6: boolean; eu7: boolean;
  // Mitigationsmaßnahmen
  m1: boolean; m2: boolean; m3: boolean; m4: boolean;
  m5: boolean; m6: boolean; m7: boolean;
  savedAt?: string;
  savedBy?: string;
}

export interface RiskScore {
  raw: number;
  pct: number;
  tier: RiskTier;
}

// ── Gate Checks ───────────────────────────────────────────────
export interface GateChecks {
  ucId: string;
  // Gate A (9 Punkte)
  a1: boolean; a2: boolean; a3: boolean; a4: boolean; a5: boolean;
  a6: boolean; a7: boolean; a8: boolean; a9: boolean;
  // Gate B (10 Punkte)
  b1: boolean; b2: boolean; b3: boolean; b4: boolean; b5: boolean;
  b6: boolean; b7: boolean; b8: boolean; b9: boolean; b10: boolean;
  // Gate C (10 Punkte)
  c1: boolean; c2: boolean; c3: boolean; c4: boolean; c5: boolean;
  c6: boolean; c7: boolean; c8: boolean; c9: boolean; c10: boolean;
  // Reliability Controls — nur für R-Tier R3/R4/R5 (optional)
  rl1?: boolean; rl2?: boolean; rl3?: boolean; rl4?: boolean; rl5?: boolean;
  // Agentic Controls — nur für R5 (optional)
  rl6?: boolean; rl7?: boolean; rl8?: boolean;
  savedAt?: string;
  savedBy?: string;
}

// ── Business Case ─────────────────────────────────────────────
export interface BusinessCase {
  ucId: string;
  lohnkosten: number;          // €/h, default 65
  // Nutzen
  i_zeitersparnis: number;     // h/Monat
  i_fehlerquote: number;       // % weniger Fehler
  i_umsatz: number;            // €/Jahr
  i_kundenzuf: number;         // NPS-Punkte
  i_sonstige: number;          // €/Jahr
  // Kosten
  c_entwicklung: number;       // einmalig €
  c_lizenz: number;            // €/Jahr
  c_betrieb: number;           // €/Jahr
  c_schulung: number;          // einmalig €
  c_sonstige: number;          // €/Jahr laufend
  narrative: string;
  savedAt?: string;
  savedBy?: string;
}

export interface BcCalculation {
  monetZeit: number;
  gesamtNutzen: number;
  einmal: number;
  jaehrlich: number;
  roi3: number;
  breakeven: number;
}

// ── DSFA ──────────────────────────────────────────────────────
export type DsfaStatus =
  | 'Ausstehend'
  | 'In Bearbeitung'
  | 'Abgeschlossen'
  | 'Nicht erforderlich';

export interface DsfaData {
  ucId: string;
  // Teil I — Hintergrundinformationen
  bg_projektinhaber: string;
  bg_datum: string;
  bg_projekt: string;
  bg_daten: string;
  // Verarbeitungsarten (15 Booleans) bg_verarb_*
  [key: `bg_verarb_${string}`]: boolean;
  bg_datenquelle: string;
  bg_oeffentlich: string;
  bg_zugriff: string;
  bg_rechtsgrundlage: string;
  // Teil II — Risikoermittlung
  bg_sens_rasse: boolean; bg_sens_politik: boolean;
  bg_sens_religion: boolean; bg_sens_gewerkschaft: boolean;
  bg_sens_genetik: boolean; bg_sens_biometrie: boolean;
  bg_sens_gesundheit: boolean; bg_sens_sexleben: boolean;
  bg_sens_strafrecht: boolean; bg_sens_finanzen: boolean;
  bg_sens_keine: boolean;
  bg_auto_entscheid: string;     // 'ja'|'nein'|'unsicher'
  bg_ueberwachung: string;
  bg_verhalten_ctrl: string;
  bg_umfang_gross: string;
  bg_datensatz_abgl: string;
  bg_profiling: string;
  bg_sg_mitarbeiter: boolean; bg_sg_asyl: boolean;
  bg_sg_patienten: boolean; bg_sg_behinderung: boolean;
  bg_sg_senioren: boolean; bg_sg_kinder: boolean;
  bg_sg_keine: boolean;
  bg_neue_technologie: string;
  bg_drittland: string;
  bg_drittland_laender: string;
  bg_behoerde_pflicht: string;
  bg_hohes_risiko: string;
  // Teil III — Ausnahmen
  bg_aehnl_dsfa: string;
  bg_behoerde_gepr: string;
  bg_whitelist: string;
  bg_aehnl_dsfa_ref: string;
  bg_whitelist_info: string;
  // DSFA-Trigger (Art. 35 DSGVO)
  dt1: boolean; dt2: boolean; dt3: boolean;
  dt4: boolean; dt5: boolean; dt6: boolean;
  // Schritt 2: Beschreibung
  ds_zweck: string;
  ds_rechtsgrundlage: string;
  ds_datenarten: string;
  ds_betroffene: string;
  ds_empfaenger: string;
  ds_loeschfrist: string;
  // Schritt 3: Risikobewertung dr1-dr6 (w=Wahrscheinlichkeit, s=Schwere)
  dr1_w: string; dr1_s: string;
  dr2_w: string; dr2_s: string;
  dr3_w: string; dr3_s: string;
  dr4_w: string; dr4_s: string;
  dr5_w: string; dr5_s: string;
  dr6_w: string; dr6_s: string;
  // Schritt 4: Maßnahmen
  ds_toms: string;
  ds_dsbdate: string;
  ds_status: DsfaStatus;
  savedAt?: string;
  savedBy?: string;
}

// ── Audit Log ─────────────────────────────────────────────────
export type AuditAction =
  | 'create' | 'edit' | 'approve' | 'reject'
  | 'delete' | 'save-artefakt' | 'inline-edit';

export interface AuditEntry {
  id: string;
  ts: string;                          // ISO-Date
  actor: string;
  action: AuditAction;
  entity: 'UseCase' | 'Incident' | 'Artefakt';
  entityId: string;
  diff: Record<string, { von: unknown; auf: unknown }>;
  comment: string;
}

// ── Artefakt-DB (aggregiert) ──────────────────────────────────
export interface ArtefaktDB {
  ra:   Record<string, Partial<RiskAssessment>>;
  gc:   Record<string, Partial<GateChecks>>;
  bc:   Record<string, Partial<BusinessCase>>;
  dsfa: Record<string, Partial<DsfaData>>;
}

// ── Compliance Status Export ──────────────────────────────────
export interface ComplianceRow {
  uc_id: string;
  uc_title: string;
  cluster: string;
  lifecycle: string;
  risk_tier: string;
  approval_status: string;
  ra_vorhanden: string;
  ra_risk_score_max: string;
  gc_vorhanden: string;
  gc_checks_bestanden: string;
  bc_vorhanden: string;
  dsfa_vorhanden: string;
  dsfa_status: string;
  dsfa_trigger_aktiv: string;
  dsfa_trigger_anzahl: string;
  dsfa_dsb_datum: string;
  dsfa_bg_projektinhaber: string;
  dsfa_bg_datum: string;
  dsfa_bg_drittland: string;
  kit_einsatz: string;
  kit_erstellung: string;
  legacy_system: string;
  mc_abgeschlossen: string;
  mc_gesamt: string;
}

// ── API Response Types ────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── UI State ──────────────────────────────────────────────────
// ── User Management ───────────────────────────────────────────
export type AiosRoleValue = 'AIOS.Viewer' | 'AIOS.Editor' | 'AIOS.Approver' | 'AIOS.Admin';

export interface AiosUser {
  id: string;                   // SP-Listenitem-ID (String)
  email: string;                // AAD UPN / E-Mail
  displayName: string;          // Anzeigename
  aadUserId: string;            // userId aus /.auth/me
  role: AiosRoleValue;          // aktuelle Rolle
  active: boolean;              // Zugriff aktiv
  invitedAt: string;            // ISO-Date
  invitedBy: string;            // E-Mail des Einladenden
  lastLogin: string;            // ISO-Date, wird bei /api/users/me aktualisiert
}

export type Screen =
  | 'dashboard' | 'portfolio' | 'aistrategy' | 'usecases' | 'new'
  | 'governance' | 'incidents' | 'agenthub' | 'artefakthub'
  | 'riskassess' | 'gatechecks' | 'bizcases' | 'dsfa' | 'auditlog' | 'info'
  | 'ucdashboard' | 'users' | 'aitools' | 'reports' | 'isogov';

// ── AI Tool (Register erlaubter KI-Tools) ─────────────────────
export type AiToolStatus =
  | 'Angefragt' | 'In Prüfung' | 'Erlaubt' | 'Eingeschränkt erlaubt'
  | 'Nicht erlaubt' | 'Zurückgezogen'
  | 'Abgelehnt'; // backwards-compat

export interface AiTool {
  id: string;
  name: string;
  vendor: string;
  category: string;
  status: AiToolStatus;
  justification: string;
  scope: string;
  dataLocation: string;
  dpa: boolean;
  url: string;
  decidedBy: string;
  decisionDate: string;
  reviewDate: string;
  linkedUseCases: string;
  approver?: string;       // Freitext: wer hat entschieden / soll entscheiden
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  _spId?: string;
}

// ── ISO 42001 Governance ───────────────────────────────────────
export type IsoAnswerStatus = 'Offen' | 'In Bearbeitung' | 'Beantwortet' | 'Risiko';
export type IsoPriority = 'Hoch' | 'Mittel' | 'Niedrig';

export interface IsoQuestion {
  id: string;            // Q-001
  domain: string;        // §4 Context of the organization
  section: string;       // Section 4.1 - External Context
  question: string;
  source: string;
  priority: string;
  _spId?: string;
}

export interface IsoAnswer {
  questionId: string;    // referenziert IsoQuestion.id
  status: IsoAnswerStatus;
  maturity: number;      // 0-5
  answer: string;
  evidence: string;
  actions: string;
  owner: string;
  due: string;
  usecases: string[];    // verknüpfte UseCase.id
  updatedAt?: string;
  updatedBy?: string;
  _spId?: string;
}

export type Language = 'de' | 'en';

export interface AppConfig {
  name: string;
  short: string;
  tag: string;
  iso: string;
  chatbot: {
    enabled: boolean;
    label: string;
    url: string;
    hint: string;
  };
}
