// ─────────────────────────────────────────────────────────────
//  AIOS — SharePoint Provisioning via Graph API (Node.js)
//  Liest Credentials aus api/local.settings.json
//
//  Aufruf: node scripts/provision-sharepoint.mjs
// ─────────────────────────────────────────────────────────────
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const settings = JSON.parse(
  readFileSync(join(__dir, '../api/local.settings.json'), 'utf8')
).Values;

const TENANT_ID  = settings.AZURE_TENANT_ID;
const CLIENT_ID  = settings.AZURE_CLIENT_ID;
const SECRET     = settings.AZURE_CLIENT_SECRET;
const SITE_URL   = settings.SHAREPOINT_SITE_URL;

// ── Token holen ───────────────────────────────────────────────
async function getToken() {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     CLIENT_ID,
    client_secret: SECRET,
    scope:         'https://graph.microsoft.com/.default',
  });
  const res = await fetch(url, { method: 'POST', body });
  const json = await res.json();
  if (!json.access_token) {
    console.error('Token-Fehler:', JSON.stringify(json, null, 2));
    process.exit(1);
  }
  return json.access_token;
}

// ── Site-ID aus URL auflösen ──────────────────────────────────
async function getSiteId(token) {
  const u   = new URL(SITE_URL);

  // Variante 1: hostname:/pathname
  const api1 = `https://graph.microsoft.com/v1.0/sites/${u.hostname}:${u.pathname}`;
  console.log(`  Graph-Aufruf: ${api1}`);
  const res1 = await fetch(api1, { headers: { Authorization: `Bearer ${token}` } });
  const json1 = await res1.json();
  if (json1.id) {
    console.log(`  ✓ Site gefunden: ${json1.id}`);
    return json1.id;
  }
  console.log(`  Variante 1 Fehler: ${json1.error?.code} — ${json1.error?.message}`);

  // Variante 2: root site + relative path
  const api2 = `https://graph.microsoft.com/v1.0/sites/${u.hostname}/sites?$filter=name eq 'AIOS'&$select=id,name`;
  console.log(`  Graph-Aufruf: ${api2}`);
  const res2 = await fetch(api2, { headers: { Authorization: `Bearer ${token}` } });
  const json2 = await res2.json();
  console.log('  Variante 2 Antwort:', JSON.stringify(json2, null, 2));
  if (json2.value?.[0]?.id) {
    console.log(`  ✓ Site gefunden: ${json2.value[0].id}`);
    return json2.value[0].id;
  }

  // Variante 3: alle Sites auflisten
  const api3 = `https://graph.microsoft.com/v1.0/sites?search=AIOS`;
  const res3 = await fetch(api3, { headers: { Authorization: `Bearer ${token}` } });
  const json3 = await res3.json();
  console.log('  Variante 3 Antwort:', JSON.stringify(json3, null, 2));
  if (json3.value?.[0]?.id) {
    const site = json3.value.find(s => s.webUrl?.includes('/sites/AIOS')) ?? json3.value[0];
    console.log(`  ✓ Site gefunden: ${site.id}`);
    return site.id;
  }

  console.error('\n✗ Site konnte nicht gefunden werden.');
  console.error('  Bitte prüfe: Azure Portal → AIOS-API → API-Berechtigungen');
  console.error('  Status "Sites.ReadWrite.All" muss grünes ✓ haben.');
  process.exit(1);
}

// ── Liste per Titel suchen ────────────────────────────────────
async function findListByTitle(token, siteId, name) {
  const base = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`;
  // Alle Listen holen und lokal filtern (Filter auf 'name' ist unzuverlässig bei Sonderzeichen)
  const res = await fetch(`${base}?$select=id,name,displayName&$top=200`,
    { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  const list = (json.value ?? []).find(
    l => l.name === name || l.displayName === name
  );
  return list?.id ?? null;
}

// ── Liste anlegen (idempotent) ────────────────────────────────
async function ensureList(token, siteId, name, description) {
  const base = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`;

  // Existiert bereits?
  const existingId = await findListByTitle(token, siteId, name);
  if (existingId) {
    console.log(`  → Liste '${name}' bereits vorhanden`);
    return existingId;
  }

  // Neu anlegen
  const res = await fetch(base, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: name, description, list: { template: 'genericList' } }),
  });
  const json = await res.json();

  // Falls parallel bereits angelegt (race) → ID nachladen
  if (json.error?.code === 'nameAlreadyExists') {
    const id = await findListByTitle(token, siteId, name);
    if (id) { console.log(`  → Liste '${name}' bereits vorhanden`); return id; }
  }

  if (!json.id) {
    console.error(`  ✗ Fehler bei '${name}':`, JSON.stringify(json, null, 2));
    return null;
  }
  console.log(`  ✓ Liste '${name}' erstellt`);
  return json.id;
}

// ── SP-Feldname dekodieren (_x0047_T01 → GT01) ───────────────
function decodeSpName(name) {
  return name.replace(/^_x([0-9a-fA-F]{4})_/, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

// ── Vorhandene Spalten einmal pro Liste laden ─────────────────
const _colCache = new Map(); // listId → Set<name>
async function getExistingColumns(token, siteId, listId) {
  if (_colCache.has(listId)) return _colCache.get(listId);
  const base = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/columns`;
  const res = await fetch(`${base}?$select=name&$top=500`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  const names = new Set((json.value ?? []).map(c => c.name));
  // Auch dekodierte Namen eintragen (z.B. _x0047_T01 → GT01)
  for (const n of [...names]) {
    const decoded = decodeSpName(n);
    if (decoded !== n) names.add(decoded);
  }
  _colCache.set(listId, names);
  return names;
}

// ── Spalte anlegen (idempotent) ───────────────────────────────
async function ensureColumn(token, siteId, listId, col) {
  const existing = await getExistingColumns(token, siteId, listId);
  if (existing.has(col.name)) return; // Bereits da

  const base = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/columns`;
  const res = await fetch(base, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(col),
  });
  const json = await res.json();
  if (json.error) {
    console.warn(`    ⚠ Spalte '${col.name}': ${json.error.message}`);
  } else {
    existing.add(col.name); // Cache aktualisieren
    console.log(`    + ${col.name} (${col.text ? 'text' : col.number ? 'number' : col.boolean !== undefined ? 'boolean' : col.choice ? 'choice' : 'note'})`);
  }
}

// ── Spalten-Definitionen ──────────────────────────────────────
function txt(name, displayName)    { return { name, displayName: displayName ?? name, text: {} }; }
function note(name, displayName)   { return { name, displayName: displayName ?? name, text: { allowMultipleLines: true, linesForEditing: 6 } }; }
function num(name, displayName)    { return { name, displayName: displayName ?? name, number: {} }; }
function bool(name, displayName)   { return { name, displayName: displayName ?? name, boolean: {} }; }
function choice(name, displayName, choices) {
  return { name, displayName: displayName ?? name, choice: { choices, displayAs: 'dropDownMenu' } };
}

// ═══════════════════════════════════════════════════════════════
//  Listen-Definitionen
// ═══════════════════════════════════════════════════════════════
const LISTS = [

  // 1 — Use Cases
  {
    name: 'AIOS_UseCases',
    desc: 'KI Use Cases',
    cols: [
      txt('UCId',         'UC-ID'),
      txt('Cluster',      'Cluster / Abteilung'),
      txt('System',       'System / Werkzeug'),
      txt('Legacy',       'Betroffenes Legacy-System'),
      txt('Owner',        'Business Owner'),
      txt('Capability',   'KI-Technologie'),
      txt('Autonomy',     'Autonomiegrad'),
      choice('Lifecycle', 'Lifecycle',          ['Idea','Build','Run','Retire']),
      choice('Portfolio', 'Portfolio Decision',  ['Start','Scale','Stop','Hold','Backlog']),
      choice('RiskTier',  'Risk Tier',           ['Low','Medium','High']),
      choice('GovTier',   'Governance-Tier',     ['1','2','3']),
      choice('Approval',  'Approval Status',     ['Not required','Pending','Approved','Rejected']),
      choice('OpReady',   'Operational Readiness',['Not ready','Operational Ready']),
      choice('KpiStatus', 'KPI Status',          ['yes','no']),
      choice('HiTL',      'Human in the Loop',   ['yes','no']),
      choice('Reversible','Entscheidungen reversibel',['yes','no']),
      num('ValueScore',   'Value Score (1-3)'),
      num('FeasScore',    'Feasibility Score (1-3)'),
      num('RiskScore',    'Risk Score (1-3)'),
      bool('Active',      'Aktiv'),
      note('Description', 'Beschreibung'),
      txt('Link',         'URL (Agent/Tool)'),
      txt('CreatedBy_x',  'Erstellt von (Actor)'),
      txt('UpdatedBy_x',  'Geändert von (Actor)'),
      txt('KiType',       'KI-Typ Dimension'),
      // Governance Trigger
      bool('GT01','Trigger GT01'), bool('GT02','Trigger GT02'),
      bool('GT03','Trigger GT03'), bool('GT04','Trigger GT04'),
      // Sensible Bereiche
      bool('SB01','Sensibel SB01'), bool('SB02','Sensibel SB02'),
      bool('SB03','Sensibel SB03'), bool('SB04','Sensibel SB04'),
      // Minimum Checks
      bool('MC01','MC01'), bool('MC02','MC02'), bool('MC03','MC03'),
      bool('MC04','MC04'), bool('MC05','MC05'), bool('MC06','MC06'), bool('MC07','MC07'),
      // Reliability Framework
      choice('ReliabilityTier', 'Reliability Tier (R1-R5)', ['R1','R2','R3','R4','R5']),
      choice('HitlMode',        'HITL-Modus',               ['HITL','HOTL','none']),
      choice('AutonomyLevel',   'Automationsgrad',          ['supervised','semi-auto','autonomous']),
      note('FailureModes',      'Failure Mode Risiken (JSON)'),
      choice('MonitoringSla',   'Monitoring SLA',           ['Echtzeit','täglich','wöchentlich','monatlich','quartalsweise']),
    ],
  },

  // 2 — Incidents
  {
    name: 'AIOS_Incidents',
    desc: 'KI Incident Log',
    cols: [
      txt('IncId',        'INC-ID'),
      txt('UCRef',        'Use Case ID'),
      choice('IncType',   'Typ',           ['Incident','Deviation','Near Miss']),
      choice('Severity',  'Schweregrad',   ['Low','Medium','High']),
      choice('Status',    'Status',        ['Open','In Progress','Resolved']),
      note('Description', 'Beschreibung'),
      note('Actions',     'Ergriffene Maßnahmen'),
      txt('IncDate',      'Datum des Vorfalls'),
      txt('CreatedBy_x',  'Erstellt von (Actor)'),
      choice('FailureMode', 'Reliability Failure Mode', ['accuracy','inconsistency','drift','agentic','infrastructure']),
    ],
  },

  // 3 — Artefakte (JSON-Blob)
  {
    name: 'AIOS_Artefakte',
    desc: 'Risk Assessment / Gate Checks / Business Case / DSFA als JSON',
    cols: [
      txt('UCId',       'Use Case ID'),
      choice('ArtType', 'Artefakt-Typ', ['ra','gc','bc','dsfa']),
      note('Payload',   'Daten (JSON)'),
      txt('SavedAt',    'Gespeichert am'),
      txt('SavedBy',    'Gespeichert von'),
    ],
  },

  // 4 — AuditLog
  {
    name: 'AIOS_AuditLog',
    desc: 'Unveränderliches Audit-Protokoll',
    cols: [
      txt('EntryId',    'Eintrag-ID'),
      txt('Actor',      'Actor (UPN)'),
      choice('Action',  'Aktion',  ['create','edit','approve','reject','delete','save-artefakt','inline-edit']),
      choice('Entity',  'Entität', ['UseCase','Incident','Artefakt','AiTool','User','Config']),
      txt('EntityId',   'Entität-ID'),
      note('Diff',      'Änderungen (JSON)'),
      txt('Comment',    'Kommentar'),
    ],
  },

  // 5 — Config
  {
    name: 'AIOS_Config',
    desc: 'Tenant-Konfiguration',
    cols: [
      txt('ConfigKey',   'Schlüssel'),
      note('ConfigValue','Wert (JSON)'),
    ],
  },

  // 6 — AI Tools (Allowlist / Register erlaubter KI-Tools)
  {
    name: 'AIOS_AiTools',
    desc: 'Register erlaubter KI-Tools inkl. Begründung; Historie via AIOS_AuditLog',
    cols: [
      txt('ToolId',        'Tool-ID'),
      txt('Vendor',        'Anbieter / Hersteller'),
      choice('Category',   'Kategorie', ['LLM-Chat','Code-Assistent','Bildgenerierung','Audio/Transkription','Übersetzung','Suche/RAG','Automatisierung','Sonstiges']),
      choice('Status',     'Status',    ['Erlaubt','Eingeschränkt erlaubt','In Prüfung','Abgelehnt','Zurückgezogen']),
      note('Justification','Begründung'),
      note('Scope',        'Freigabe-Scope'),
      choice('DataLocation','Datenstandort', ['EU','USA','Global/Unklar']),
      bool('DpaInPlace',   'AVV/DPA vorhanden'),
      txt('Url',           'Produkt-URL'),
      txt('DecidedBy',     'Entschieden von'),
      txt('DecisionDate',  'Entscheidungsdatum'),
      txt('ReviewDate',    'Review-Datum'),
      note('LinkedUseCases','Verknüpfte Use Cases (IDs)'),
      bool('Active',       'Aktiv'),
      txt('CreatedBy_x',   'Erstellt von (Actor)'),
      txt('UpdatedBy_x',   'Geändert von (Actor)'),
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
//  Hauptprogramm
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('\n══════════════════════════════════════');
  console.log('  AIOS SharePoint Provisioning        ');
  console.log('══════════════════════════════════════');
  console.log(`  Site: ${SITE_URL}`);
  console.log('');

  console.log('Token holen...');
  const token = await getToken();
  console.log('  ✓ Authentifiziert\n');

  const siteId = await getSiteId(token);
  console.log('');

  for (let i = 0; i < LISTS.length; i++) {
    const list = LISTS[i];
    console.log(`[${i+1}/${LISTS.length}] ${list.name}`);
    const listId = await ensureList(token, siteId, list.name, list.desc);
    if (!listId) continue;
    for (const col of list.cols) {
      await ensureColumn(token, siteId, listId, col);
    }
    console.log('');
  }

  console.log('══════════════════════════════════════');
  console.log('  ✓ Provisioning abgeschlossen!       ');
  console.log('══════════════════════════════════════');
  console.log('');
  console.log('Nächster Schritt:');
  console.log('  npm run build --prefix api');
  console.log('  npm run dev');
  console.log('');
}

main().catch(err => { console.error('Fehler:', err); process.exit(1); });
