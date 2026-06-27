// ─────────────────────────────────────────────────────────────
//  AIOS — /api/provision  (Admin only)
//
//  Legt fehlende SP-Spalten für alle AIOS-Listen an.
//  Idempotent: bestehende Spalten werden übersprungen.
//  Listen selbst müssen bereits existieren — nur Spalten werden erstellt.
//
//  Abgedeckte Listen:
//    AIOS_Usecases · AIOS_AiTools · AIOS_Incidents
//    AIOS_Artefakte · AIOS_AuditLog · AIOS_Users · AIOS_Config
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireRole, isAuthError } from '../lib/auth';
import { getGraphClient } from '../lib/graphClient';
import { serverError } from '../lib/http';

type ColType = 'text' | 'note' | 'boolean' | 'number';

interface ColumnSpec {
  list: string;     // SP-Listenname (display name)
  name: string;     // SP-Spaltenname (StaticName)
  type: ColType;
  label?: string;   // Lesbare Beschreibung fürs Report
}

// ── Listennamen (ENV-Override analog zu sharepoint.ts) ────────
function listName(key: string, defaultName: string): string {
  return process.env[`LIST_${key}`] ?? defaultName;
}

const L = {
  UC:       listName('USECASES',  'AIOS_Usecases'),
  TOOLS:    listName('AITOOLS',   'AIOS_AiTools'),
  INC:      listName('INCIDENTS', 'AIOS_Incidents'),
  ART:      listName('ARTEFAKTE', 'AIOS_Artefakte'),
  AUDIT:    listName('AUDITLOG',  'AIOS_AuditLog'),
  USERS:    listName('USERS',     'AIOS_Users'),
  CONFIG:   listName('CONFIG',    'AIOS_Config'),
};

// ── Vollständige Spalten-Spezifikation ────────────────────────
// Reihenfolge: zuerst Identifikatoren, dann Stammdaten, dann Steuerung/Status
// GT/SB/MC-Spalten: SP kodiert intern als _x0047_T01 etc. — hier mit SP-StaticName
const ALL_COLUMNS: ColumnSpec[] = [

  // ── AIOS_Usecases ──────────────────────────────────────────
  { list: L.UC, name: 'UCId',          type: 'text',    label: 'Use-Case-ID (UC-YYYY-MM-NNN)' },
  { list: L.UC, name: 'Cluster',       type: 'text',    label: 'Abteilung / Cluster' },
  { list: L.UC, name: 'System',        type: 'text',    label: 'KI-System / Werkzeug (Freitext)' },
  { list: L.UC, name: 'Legacy',        type: 'text',    label: 'Betroffenes Legacy-System' },
  { list: L.UC, name: 'ToolRef',       type: 'text',    label: 'Verknüpftes AI-Tool (TOOL-ID)' },
  { list: L.UC, name: 'Owner',         type: 'text',    label: 'Business Owner' },
  { list: L.UC, name: 'Capability',    type: 'text',    label: 'KI-Fähigkeit / Technologie' },
  { list: L.UC, name: 'UCCategory',    type: 'text',    label: 'Use-Case-Kategorie' },
  { list: L.UC, name: 'KiType',        type: 'text',    label: 'KI-Dimension (Einsatz/Erstellung)' },
  { list: L.UC, name: 'Autonomy',      type: 'text',    label: 'Automatisierungsgrad' },
  { list: L.UC, name: 'Lifecycle',     type: 'text',    label: 'Lifecycle-Phase' },
  { list: L.UC, name: 'Portfolio',     type: 'text',    label: 'Portfolio-Bereich' },
  { list: L.UC, name: 'RiskTier',      type: 'text',    label: 'Risiko-Tier (Low/Medium/High)' },
  { list: L.UC, name: 'GovTier',       type: 'text',    label: 'Governance-Tier (1-4)' },
  { list: L.UC, name: 'Reversible',    type: 'text',    label: 'Entscheidung reversibel (yes/no)' },
  { list: L.UC, name: 'ValueScore',    type: 'number',  label: 'Nutzenpotenzial (1-3)' },
  { list: L.UC, name: 'FeasScore',     type: 'number',  label: 'Umsetzbarkeit (1-3)' },
  { list: L.UC, name: 'RiskScore',     type: 'number',  label: 'Risiko-Score (1-3)' },
  { list: L.UC, name: 'KpiStatus',     type: 'text',    label: 'KPI-Status (yes/no)' },
  { list: L.UC, name: 'Approval',      type: 'text',    label: 'Freigabe-Status' },
  { list: L.UC, name: 'OpReady',       type: 'text',    label: 'Betriebsbereitschaft' },
  { list: L.UC, name: 'HiTL',          type: 'text',    label: 'Human in the Loop (yes/no)' },
  { list: L.UC, name: 'Active',        type: 'boolean', label: 'Aktiv (Soft-Delete-Flag)' },
  { list: L.UC, name: 'Description',   type: 'note',    label: 'Beschreibung / Ziel' },
  { list: L.UC, name: 'Link',          type: 'text',    label: 'Weiterführender Link' },
  { list: L.UC, name: 'CreatedBy_x',   type: 'text',    label: 'Erstellt von (UPN)' },
  { list: L.UC, name: 'UpdatedBy_x',   type: 'text',    label: 'Geändert von (UPN)' },
  // Governance-Trigger (GT) — SP kodiert erste Buchstaben
  { list: L.UC, name: '_x0047_T01',    type: 'boolean', label: 'GT01 – KI in Systeme/Workflows integriert' },
  { list: L.UC, name: '_x0047_T02',    type: 'boolean', label: 'GT02 – KI-Ergebnisse geteilt/wiederverwendet' },
  { list: L.UC, name: '_x0047_T03',    type: 'boolean', label: 'GT03 – KI beeinflusst Entscheidungen' },
  { list: L.UC, name: '_x0047_T04',    type: 'boolean', label: 'GT04 – KI skaliert/operationalisiert' },
  // Sensitive Bereiche (SB)
  { list: L.UC, name: '_x0053_B01',    type: 'boolean', label: 'SB01 – Pricing/Konditionsentscheidungen' },
  { list: L.UC, name: '_x0053_B02',    type: 'boolean', label: 'SB02 – Kundenkommunikation' },
  { list: L.UC, name: '_x0053_B03',    type: 'boolean', label: 'SB03 – HR-Entscheidungen' },
  { list: L.UC, name: '_x0053_B04',    type: 'boolean', label: 'SB04 – Finanzielle Verpflichtungen' },
  // Maßnahmen-Checkboxen (MC)
  { list: L.UC, name: '_x004d_C01',    type: 'boolean', label: 'MC01 – Datenschutz/DSGVO geprüft' },
  { list: L.UC, name: '_x004d_C02',    type: 'boolean', label: 'MC02 – Datenschutz-Folgenabschätzung' },
  { list: L.UC, name: '_x004d_C03',    type: 'boolean', label: 'MC03 – Technische/Org. Maßnahmen' },
  { list: L.UC, name: '_x004d_C04',    type: 'boolean', label: 'MC04 – Mitbestimmung berücksichtigt' },
  { list: L.UC, name: '_x004d_C05',    type: 'boolean', label: 'MC05 – Schulung/Befähigung erfolgt' },
  { list: L.UC, name: '_x004d_C06',    type: 'boolean', label: 'MC06 – Monitoring/Review definiert' },
  { list: L.UC, name: '_x004d_C07',    type: 'boolean', label: 'MC07 – Dokumentation vollständig' },
  // Reliability Framework
  { list: L.UC, name: 'ReliabilityTier', type: 'text', label: 'Reliability-Tier (R1-R5)' },
  { list: L.UC, name: 'HitlMode',      type: 'text',    label: 'HITL-Modus (HITL/HOTL/none)' },
  { list: L.UC, name: 'AutonomyLevel', type: 'text',    label: 'Autonomie-Level' },
  { list: L.UC, name: 'FailureModes',  type: 'note',    label: 'Failure Modes (JSON-Array)' },
  { list: L.UC, name: 'MonitoringSla', type: 'text',    label: 'Monitoring-SLA' },

  // ── AIOS_AiTools ───────────────────────────────────────────
  { list: L.TOOLS, name: 'ToolId',          type: 'text',    label: 'Tool-ID (TOOL-YYYY-NNN)' },
  { list: L.TOOLS, name: 'Vendor',          type: 'text',    label: 'Anbieter' },
  { list: L.TOOLS, name: 'Category',        type: 'text',    label: 'Kategorie' },
  { list: L.TOOLS, name: 'Status',          type: 'text',    label: 'Freigabe-Status' },
  { list: L.TOOLS, name: 'Justification',   type: 'note',    label: 'Kommentar / Begründung' },
  { list: L.TOOLS, name: 'Approver',        type: 'text',    label: 'Approver (Freitext)' },
  { list: L.TOOLS, name: 'Scope',           type: 'note',    label: 'Freigabe-Scope' },
  { list: L.TOOLS, name: 'DataLocation',    type: 'text',    label: 'Datenstandort' },
  { list: L.TOOLS, name: 'DpaInPlace',      type: 'boolean', label: 'AVV/DPA vorhanden' },
  { list: L.TOOLS, name: 'Url',             type: 'text',    label: 'Produkt-URL' },
  { list: L.TOOLS, name: 'DecidedBy',       type: 'text',    label: 'Entschieden von (UPN, auto)' },
  { list: L.TOOLS, name: 'DecisionDate',    type: 'text',    label: 'Entscheidungsdatum (ISO)' },
  { list: L.TOOLS, name: 'ReviewDate',      type: 'text',    label: 'Review-Datum (ISO)' },
  { list: L.TOOLS, name: 'LinkedUseCases',  type: 'text',    label: 'Verknüpfte UCs (kommagetrennt)' },
  { list: L.TOOLS, name: 'Active',          type: 'boolean', label: 'Aktiv (Soft-Delete-Flag)' },
  { list: L.TOOLS, name: 'CreatedBy_x',     type: 'text',    label: 'Erstellt von (UPN)' },
  { list: L.TOOLS, name: 'UpdatedBy_x',     type: 'text',    label: 'Geändert von (UPN)' },

  // ── AIOS_Incidents ─────────────────────────────────────────
  { list: L.INC, name: 'IncId',       type: 'text',    label: 'Incident-ID' },
  { list: L.INC, name: 'UCRef',       type: 'text',    label: 'Zugehöriger Use Case (UC-ID)' },
  { list: L.INC, name: 'IncType',     type: 'text',    label: 'Incident-Typ' },
  { list: L.INC, name: 'Severity',    type: 'text',    label: 'Schweregrad' },
  { list: L.INC, name: 'Status',      type: 'text',    label: 'Status (Open/Resolved)' },
  { list: L.INC, name: 'Description', type: 'note',    label: 'Beschreibung' },
  { list: L.INC, name: 'Actions',     type: 'note',    label: 'Maßnahmen' },
  { list: L.INC, name: 'IncDate',     type: 'text',    label: 'Incident-Datum (ISO)' },
  { list: L.INC, name: 'FailureMode', type: 'text',    label: 'Failure-Mode-Kategorie' },
  { list: L.INC, name: 'CreatedBy_x', type: 'text',    label: 'Erstellt von (UPN)' },
  { list: L.INC, name: 'UpdatedBy_x', type: 'text',    label: 'Geändert von (UPN)' },

  // ── AIOS_Artefakte ─────────────────────────────────────────
  { list: L.ART, name: 'UCId',        type: 'text',    label: 'Zugehöriger Use Case (UC-ID)' },
  { list: L.ART, name: 'ArtType',     type: 'text',    label: 'Artefakt-Typ (ra/gc/bc/dsfa)' },
  { list: L.ART, name: 'Payload',     type: 'note',    label: 'Artefakt-Inhalt (JSON)' },
  { list: L.ART, name: 'SavedAt',     type: 'text',    label: 'Zuletzt gespeichert (ISO)' },
  { list: L.ART, name: 'SavedBy',     type: 'text',    label: 'Gespeichert von (UPN)' },

  // ── AIOS_AuditLog ──────────────────────────────────────────
  { list: L.AUDIT, name: 'EntryId',   type: 'text',    label: 'Audit-Entry-ID' },
  { list: L.AUDIT, name: 'Actor',     type: 'text',    label: 'Ausführender Nutzer (UPN)' },
  { list: L.AUDIT, name: 'Action',    type: 'text',    label: 'Aktion (create/edit/approve/…)' },
  { list: L.AUDIT, name: 'Entity',    type: 'text',    label: 'Entitäts-Typ (UseCase/AiTool/…)' },
  { list: L.AUDIT, name: 'EntityId',  type: 'text',    label: 'Entitäts-ID' },
  { list: L.AUDIT, name: 'Diff',      type: 'note',    label: 'Änderungs-Diff (JSON)' },
  { list: L.AUDIT, name: 'Comment',   type: 'note',    label: 'Kommentar' },

  // ── AIOS_Users ─────────────────────────────────────────────
  { list: L.USERS, name: 'Email',       type: 'text',    label: 'E-Mail-Adresse (UPN)' },
  { list: L.USERS, name: 'DisplayName', type: 'text',    label: 'Anzeigename' },
  { list: L.USERS, name: 'AadUserId',   type: 'text',    label: 'AAD Object-ID' },
  { list: L.USERS, name: 'Role',        type: 'text',    label: 'AIOS-Rolle' },
  { list: L.USERS, name: 'Active',      type: 'boolean', label: 'Aktiv' },
  { list: L.USERS, name: 'InvitedBy',   type: 'text',    label: 'Eingeladen von (UPN)' },
  { list: L.USERS, name: 'InvitedAt',   type: 'text',    label: 'Einladungsdatum (ISO)' },
  { list: L.USERS, name: 'LastLogin',   type: 'text',    label: 'Letzter Login (ISO)' },

  // ── AIOS_Config ────────────────────────────────────────────
  { list: L.CONFIG, name: 'ConfigValue', type: 'note',   label: 'Konfigurationswert (JSON)' },
];

// ── Graph-Helpers ─────────────────────────────────────────────
async function getSiteId(): Promise<string> {
  const cached = process.env['SHAREPOINT_SITE_ID'];
  if (cached) return cached;
  const siteUrl = process.env['SHAREPOINT_SITE_URL'];
  if (!siteUrl) throw new Error('SHAREPOINT_SITE_URL nicht konfiguriert');
  const url = new URL(siteUrl);
  const result = await getGraphClient()
    .api(`/sites/${url.hostname}:${url.pathname}`)
    .select('id')
    .get() as { id: string };
  return result.id;
}

async function getColumnNames(siteId: string, listDisplayName: string): Promise<Set<string> | null> {
  try {
    const result = await getGraphClient()
      .api(`/sites/${siteId}/lists/${listDisplayName}/columns`)
      .select('name')
      .get() as { value: { name: string }[] };
    return new Set((result.value ?? []).map(c => c.name));
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404) return null; // Liste existiert nicht
    throw err;
  }
}

async function createColumn(siteId: string, listDisplayName: string, col: ColumnSpec): Promise<void> {
  const body: Record<string, unknown> = {
    name: col.name,
    description: col.label ?? '',
  };
  if (col.type === 'text')    body['text']    = { allowMultipleLines: false, maxLength: 255 };
  if (col.type === 'note')    body['text']    = { allowMultipleLines: true,  maxLength: 0 };
  if (col.type === 'boolean') body['boolean'] = {};
  if (col.type === 'number')  body['number']  = {};

  await getGraphClient()
    .api(`/sites/${siteId}/lists/${listDisplayName}/columns`)
    .post(body);
}

// ── Handler ───────────────────────────────────────────────────
interface ProvisionResult {
  list: string; column: string; label: string;
  status: 'added' | 'exists' | 'list_missing' | 'error';
  detail?: string;
}

async function handleProvision(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = await requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const siteId = await getSiteId();

  // Spalten nach Liste gruppieren → pro Liste nur eine columns-Abfrage
  const listNames = [...new Set(ALL_COLUMNS.map(c => c.list))];
  const columnsByList = new Map<string, Set<string> | null>();
  for (const name of listNames) {
    columnsByList.set(name, await getColumnNames(siteId, name));
  }

  const report: ProvisionResult[] = [];

  for (const col of ALL_COLUMNS) {
    const existing = columnsByList.get(col.list);
    if (existing === null) {
      report.push({ list: col.list, column: col.name, label: col.label ?? '', status: 'list_missing' });
      continue;
    }
    if (existing?.has(col.name)) {
      report.push({ list: col.list, column: col.name, label: col.label ?? '', status: 'exists' });
      continue;
    }
    try {
      await createColumn(siteId, col.list, col);
      report.push({ list: col.list, column: col.name, label: col.label ?? '', status: 'added' });
    } catch (err) {
      report.push({ list: col.list, column: col.name, label: col.label ?? '', status: 'error', detail: String(err) });
    }
  }

  const added   = report.filter(r => r.status === 'added').length;
  const exists  = report.filter(r => r.status === 'exists').length;
  const missing = report.filter(r => r.status === 'list_missing').length;
  const errors  = report.filter(r => r.status === 'error').length;

  return {
    status: errors > 0 ? 207 : 200,
    jsonBody: { added, exists, listsMissing: missing, errors, total: report.length, report },
  };
}

app.http('provision', {
  methods: ['POST'],
  route: 'provision',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    ctx.log('POST /api/provision');
    try {
      return await handleProvision(req);
    } catch (err) {
      return serverError(ctx, err);
    }
  },
});
