// ─────────────────────────────────────────────────────────────
//  AIOS — Field Mappers
//  SP-Feldnamen (PnP-Provisioning) ↔ TypeScript-Typen
//  Bidirektional: spToUC() und ucToSp()
// ─────────────────────────────────────────────────────────────

// ── UseCase ───────────────────────────────────────────────────

export interface UseCase {
  id: string; title: string; cl: string; sys: string; legacy: string;
  own: string; cap: string; useCaseCategory: string; kiType: string[]; auto: string;
  lc: string; pd: string; rt: string; tier: string; rev: string;
  vs: number; fs: number; rs: number;
  kpi: string; app: string; or: string; hitl: string;
  gt: boolean[]; sb: boolean[]; mc: boolean[];
  act: boolean; desc: string; link: string;
  createdAt: string; updatedAt: string; createdBy: string; updatedBy: string;
  // ── Reliability (P0) ──────────────────────────────────────
  rl?: string;            // R1–R5
  hitlMode?: string;      // HITL | HOTL | none
  autonomyLevel?: string; // supervised | semi-auto | autonomous
  failureModes?: string[]; // bekannte Failure-Mode-Kategorien
  monitoringSla?: string;  // täglich | wöchentlich | …
  _spId?: string;   // interner SP Item-ID (nicht exponiert)
}

function b(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}
function s(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v);
}
function n(v: unknown, fallback = 0): number {
  const parsed = Number(v);
  return isNaN(parsed) ? fallback : parsed;
}

export function spToUC(spId: string, f: Record<string, unknown>): UseCase {
  // KiType: kommagetrennte Textzeile oder MultiChoice-Objekt (rückwärtskompatibel)
  const kiTypeRaw = f['KiType'] as { values?: { value: string }[] } | string[] | string | null;
  let kiType: string[] = [];
  if (Array.isArray(kiTypeRaw)) {
    kiType = kiTypeRaw.map(v => typeof v === 'string' ? v : String(v));
  } else if (kiTypeRaw && typeof kiTypeRaw === 'object' && 'values' in kiTypeRaw) {
    kiType = (kiTypeRaw.values ?? []).map(v => v.value);
  } else if (typeof kiTypeRaw === 'string' && kiTypeRaw.length > 0) {
    kiType = kiTypeRaw.split(',').map(s => s.trim()).filter(Boolean);
  }
  // Normalisieren auf interne Werte
  kiType = kiType.map(v => {
    if (v === 'KI im Einsatz') return 'einsatz';
    if (v === 'KI in der Erstellung') return 'erstellung';
    return v;
  });

  return {
    _spId: spId,
    id:       s(f['UCId']),
    title:    s(f['Title']),
    cl:       s(f['Cluster'], 'Sonstiges'),
    sys:      s(f['System']),
    legacy:   s(f['Legacy']),
    own:      s(f['Owner'], 'N/A'),
    cap:             s(f['Capability'], 'Generative KI'),
    useCaseCategory: s(f['UCCategory'], 'Sonstiges'),
    kiType,
    auto:     s(f['Autonomy']),
    lc:       s(f['Lifecycle'], 'Idea') as UseCase['lc'],
    pd:       s(f['Portfolio'], 'Start') as UseCase['pd'],
    rt:       s(f['RiskTier'], 'Low') as UseCase['rt'],
    tier:     s(f['GovTier'], '1'),
    rev:      s(f['Reversible'], 'yes'),
    vs:       n(f['ValueScore'], 1),
    fs:       n(f['FeasScore'], 1),
    rs:       n(f['RiskScore'], 1),
    kpi:      s(f['KpiStatus'], 'no'),
    app:      s(f['Approval'], 'Not required'),
    or:       s(f['OpReady'], 'Not ready'),
    hitl:     s(f['HiTL'], 'yes'),
    gt:       [b(f['GT01']), b(f['GT02']), b(f['GT03']), b(f['GT04'])],
    sb:       [b(f['SB01']), b(f['SB02']), b(f['SB03']), b(f['SB04'])],
    mc:       [b(f['MC01']), b(f['MC02']), b(f['MC03']), b(f['MC04']),
               b(f['MC05']), b(f['MC06']), b(f['MC07'])],
    act:      f['Active'] !== false,          // Default: aktiv
    desc:     s(f['Description']),
    link:     s(f['Link']),
    createdAt:  s(f['Created']),
    updatedAt:  s(f['Modified']),
    createdBy:  s(f['CreatedBy_x']),
    updatedBy:  s(f['UpdatedBy_x']),
    // Reliability
    rl:           s(f['ReliabilityTier']) || undefined,
    hitlMode:     s(f['HitlMode'])        || undefined,
    autonomyLevel:s(f['AutonomyLevel'])   || undefined,
    failureModes: (() => {
      try { return JSON.parse(s(f['FailureModes'], '[]')) as string[]; }
      catch { return []; }
    })(),
    monitoringSla:s(f['MonitoringSla'])   || undefined,
  };
}

export function ucToSp(uc: Partial<UseCase>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  // KiType: als kommagetrennte Textzeile (kompatibel mit manuell angelegten SP-Listen)
  if (uc.kiType !== undefined) {
    fields['KiType'] = uc.kiType
      .map(k => k === 'einsatz' ? 'KI im Einsatz' : 'KI in der Erstellung')
      .join(', ');
  }

  const map: [keyof UseCase, string][] = [
    ['id', 'UCId'], ['title', 'Title'], ['cl', 'Cluster'],
    ['sys', 'System'], ['legacy', 'Legacy'], ['own', 'Owner'],
    ['cap', 'Capability'], ['useCaseCategory', 'UCCategory'], ['auto', 'Autonomy'],
    ['lc', 'Lifecycle'], ['pd', 'Portfolio'], ['rt', 'RiskTier'],
    ['tier', 'GovTier'], ['rev', 'Reversible'],
    ['vs', 'ValueScore'], ['fs', 'FeasScore'], ['rs', 'RiskScore'],
    ['kpi', 'KpiStatus'], ['app', 'Approval'], ['or', 'OpReady'],
    ['hitl', 'HiTL'], ['act', 'Active'], ['desc', 'Description'],
    ['link', 'Link'], ['createdBy', 'CreatedBy_x'], ['updatedBy', 'UpdatedBy_x'],
  ];

  for (const [tsKey, spKey] of map) {
    if (uc[tsKey] !== undefined) fields[spKey] = uc[tsKey];
  }

  // Boolean-Arrays
  if (uc.gt) { uc.gt.forEach((v, i) => { fields[`GT0${i + 1}`] = v; }); }
  if (uc.sb) { uc.sb.forEach((v, i) => { fields[`SB0${i + 1}`] = v; }); }
  if (uc.mc) { uc.mc.forEach((v, i) => { fields[`MC0${i + 1}`] = v; }); }

  // Reliability
  if (uc.rl !== undefined)            fields['ReliabilityTier'] = uc.rl;
  if (uc.hitlMode !== undefined)      fields['HitlMode']        = uc.hitlMode;
  if (uc.autonomyLevel !== undefined) fields['AutonomyLevel']   = uc.autonomyLevel;
  if (uc.failureModes !== undefined)  fields['FailureModes']    = JSON.stringify(uc.failureModes);
  if (uc.monitoringSla !== undefined) fields['MonitoringSla']   = uc.monitoringSla;

  return fields;
}

// ── Incident ──────────────────────────────────────────────────

export interface Incident {
  id: string; ucid: string; type: string; sev: string;
  st: string; desc: string; act: string; date: string;
  failureMode?: string;   // Reliability Failure-Mode-Kategorie (P1)
  createdAt?: string; updatedAt?: string;
  createdBy?: string; updatedBy?: string;
  _spId?: string;
}

export function spToIncident(spId: string, f: Record<string, unknown>): Incident {
  return {
    _spId: spId,
    id:       s(f['IncId']),
    ucid:     s(f['UCRef']),
    type:     s(f['IncType'], 'Incident'),
    sev:      s(f['Severity'], 'Low'),
    st:       s(f['Status'], 'Open'),
    desc:     s(f['Description']),
    act:      s(f['Actions']),
    date:        s(f['IncDate']),
    failureMode: s(f['FailureMode']) || undefined,
    createdAt:   s(f['Created']),
    updatedAt:   s(f['Modified']),
    createdBy:   s(f['CreatedBy_x']),
    updatedBy:   s(f['UpdatedBy_x']),
  };
}

export function incidentToSp(inc: Partial<Incident>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const map: [keyof Incident, string][] = [
    ['id', 'IncId'], ['ucid', 'UCRef'], ['type', 'IncType'],
    ['sev', 'Severity'], ['st', 'Status'], ['desc', 'Description'],
    ['act', 'Actions'], ['date', 'IncDate'], ['failureMode', 'FailureMode'],
    ['createdBy', 'CreatedBy_x'], ['updatedBy', 'UpdatedBy_x'],
  ];
  for (const [tsKey, spKey] of map) {
    if (inc[tsKey] !== undefined) fields[spKey] = inc[tsKey];
  }
  return fields;
}

// ── Artefakt ──────────────────────────────────────────────────

export interface Artefakt {
  ucId: string;
  type: 'ra' | 'gc' | 'bc' | 'dsfa';
  payload: Record<string, unknown>;
  savedAt?: string;
  savedBy?: string;
  _spId?: string;
}

export function spToArtefakt(spId: string, f: Record<string, unknown>): Artefakt {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(s(f['Payload'], '{}'));
  } catch { /* Leer lassen */ }

  return {
    _spId:   spId,
    ucId:    s(f['UCId']),
    type:    s(f['ArtType']) as Artefakt['type'],
    payload,
    savedAt: s(f['SavedAt']),
    savedBy: s(f['SavedBy']),
  };
}

export function artefaktToSp(art: Partial<Artefakt>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (art.ucId)    fields['UCId']    = art.ucId;
  if (art.type)    fields['ArtType'] = art.type;
  if (art.payload) fields['Payload'] = JSON.stringify(art.payload);
  if (art.savedAt) fields['SavedAt'] = art.savedAt;
  if (art.savedBy) fields['SavedBy'] = art.savedBy;
  return fields;
}

// ── AiosUser ──────────────────────────────────────────────────

export interface AiosUser {
  id: string;
  email: string;
  displayName: string;
  aadUserId: string;
  role: string;
  active: boolean;
  invitedAt: string;
  invitedBy: string;
  lastLogin: string;
  _spId?: string;
}

export function spToAiosUser(spId: string, f: Record<string, unknown>): AiosUser {
  return {
    _spId:       spId,
    id:          spId,
    email:       s(f['Email']),
    displayName: s(f['DisplayName']),
    aadUserId:   s(f['AadUserId']),
    role:        s(f['Role'], 'AIOS.Viewer') as AiosUser['role'],
    active:      f['Active'] !== false,
    invitedAt:   s(f['InvitedAt']),
    invitedBy:   s(f['InvitedBy']),
    lastLogin:   s(f['LastLogin']),
  };
}

export function aiosUserToSp(u: Partial<AiosUser>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (u.email       !== undefined) fields['Email']       = u.email;
  if (u.displayName !== undefined) fields['DisplayName'] = u.displayName;
  if (u.aadUserId   !== undefined) fields['AadUserId']   = u.aadUserId;
  if (u.role        !== undefined) fields['Role']        = u.role;
  if (u.active      !== undefined) fields['Active']      = u.active;
  if (u.invitedBy   !== undefined) fields['InvitedBy']   = u.invitedBy;
  // DateTime-Spalten: leere Strings NICHT senden — SharePoint lehnt ''
  // mit "One of the provided arguments is not acceptable" ab (→ 500).
  if (u.invitedAt) fields['InvitedAt'] = u.invitedAt;
  if (u.lastLogin) fields['LastLogin'] = u.lastLogin;
  return fields;
}

// ── Audit Log ─────────────────────────────────────────────────

export interface AuditEntry {
  id: string; ts: string; actor: string; action: string;
  entity: string; entityId: string;
  diff: Record<string, unknown>; comment: string;
  _spId?: string;
}

export function spToAudit(spId: string, f: Record<string, unknown>): AuditEntry {
  let diff: Record<string, unknown> = {};
  try { diff = JSON.parse(s(f['Diff'], '{}')); } catch { /* */ }
  return {
    _spId:    spId,
    id:       s(f['EntryId']),
    ts:       s(f['Created']),
    actor:    s(f['Actor']),
    action:   s(f['Action']),
    entity:   s(f['Entity']),
    entityId: s(f['EntityId']),
    diff,
    comment:  s(f['Comment']),
  };
}

export function auditToSp(entry: Partial<AuditEntry>): Record<string, unknown> {
  return {
    ...(entry.id       && { EntryId:  entry.id }),
    ...(entry.actor    && { Actor:    entry.actor }),
    ...(entry.action   && { Action:   entry.action }),
    ...(entry.entity   && { Entity:   entry.entity }),
    ...(entry.entityId && { EntityId: entry.entityId }),
    ...(entry.diff     && { Diff:     JSON.stringify(entry.diff) }),
    ...(entry.comment  !== undefined && { Comment: entry.comment }),
  };
}
