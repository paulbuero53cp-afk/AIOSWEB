// ─────────────────────────────────────────────────────────────
//  AIOS — Field Mappers
//  SP-Feldnamen (PnP-Provisioning) ↔ TypeScript-Typen
//  Bidirektional: spToUC() und ucToSp()
// ─────────────────────────────────────────────────────────────

// ── UseCase ───────────────────────────────────────────────────

export interface UseCase {
  id: string; title: string; cl: string; sys: string; legacy: string;
  own: string; cap: string; kiType: string[]; auto: string;
  lc: string; pd: string; rt: string; tier: string; rev: string;
  vs: number; fs: number; rs: number;
  kpi: string; app: string; or: string; hitl: string;
  gt: boolean[]; sb: boolean[]; mc: boolean[];
  act: boolean; desc: string; link: string;
  createdAt: string; updatedAt: string; createdBy: string; updatedBy: string;
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
  // KiType kommt als { values: [{value}] } (MultiChoice)
  const kiTypeRaw = f['KiType'] as { values?: { value: string }[] } | string[] | null;
  let kiType: string[] = [];
  if (Array.isArray(kiTypeRaw)) {
    kiType = kiTypeRaw.map(v => typeof v === 'string' ? v : String(v));
  } else if (kiTypeRaw?.values) {
    kiType = kiTypeRaw.values.map(v => v.value);
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
    cap:      s(f['Capability'], 'Generative KI'),
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
  };
}

export function ucToSp(uc: Partial<UseCase>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  // KiType: interne Keys → SP MultiChoice-Labels
  if (uc.kiType !== undefined) {
    fields['KiType'] = {
      values: uc.kiType.map(k => ({
        value: k === 'einsatz' ? 'KI im Einsatz' : 'KI in der Erstellung',
      })),
    };
  }

  const map: [keyof UseCase, string][] = [
    ['id', 'UCId'], ['title', 'Title'], ['cl', 'Cluster'],
    ['sys', 'System'], ['legacy', 'Legacy'], ['own', 'Owner'],
    ['cap', 'Capability'], ['auto', 'Autonomy'],
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

  return fields;
}

// ── Incident ──────────────────────────────────────────────────

export interface Incident {
  id: string; ucid: string; type: string; sev: string;
  st: string; desc: string; act: string; date: string;
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
    date:     s(f['IncDate']),
    createdAt:  s(f['Created']),
    updatedAt:  s(f['Modified']),
    createdBy:  s(f['CreatedBy_x']),
    updatedBy:  s(f['UpdatedBy_x']),
  };
}

export function incidentToSp(inc: Partial<Incident>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const map: [keyof Incident, string][] = [
    ['id', 'IncId'], ['ucid', 'UCRef'], ['type', 'IncType'],
    ['sev', 'Severity'], ['st', 'Status'], ['desc', 'Description'],
    ['act', 'Actions'], ['date', 'IncDate'],
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
