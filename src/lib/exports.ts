// ─────────────────────────────────────────────────────────────
//  AIOS — Export-Funktionen
//  Identisches Schema zur HTML v4 — UTF-8 BOM für Excel
// ─────────────────────────────────────────────────────────────
import type { UseCase, Incident } from '@/types';

// ── Hilfsfunktionen ───────────────────────────────────────────
const BOM = '\uFEFF';

function csvCell(v: unknown): string {
  const s = String(v === null || v === undefined ? '' : v);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadBlob(content: string, filename: string, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(data: unknown, filename: string) {
  downloadBlob(JSON.stringify(data, null, 2), filename, 'application/json');
}

// ── UC-CSV ────────────────────────────────────────────────────
const UC_FIELDS = [
  'id','title','cl','sys','legacy','own','cap','kit_einsatz','kit_erstellung',
  'auto','lc','pd','rt','tier','rev','vs','fs','rs','kpi','app','or','hitl',
  'desc','link','gt0','gt1','gt2','gt3','sb0','sb1','sb2','sb3',
  'mc0','mc1','mc2','mc3','mc4','mc5','mc6','act',
  'createdAt','updatedAt','createdBy','updatedBy',
] as const;

function ucToRow(uc: UseCase): unknown[] {
  return [
    uc.id, uc.title, uc.cl, uc.sys, uc.legacy ?? '', uc.own, uc.cap,
    uc.kiType?.includes('einsatz')    ? '1' : '0',
    uc.kiType?.includes('erstellung') ? '1' : '0',
    uc.auto, uc.lc, uc.pd, uc.rt, uc.tier, uc.rev,
    uc.vs, uc.fs, uc.rs, uc.kpi, uc.app, uc.or, uc.hitl,
    uc.desc, uc.link,
    ...(uc.gt ?? [false,false,false,false]).map(v => v ? '1' : '0'),
    ...(uc.sb ?? [false,false,false,false]).map(v => v ? '1' : '0'),
    ...(uc.mc ?? new Array(7).fill(false)).map(v => v ? '1' : '0'),
    uc.act ? '1' : '0',
    uc.createdAt ?? '', uc.updatedAt ?? '', uc.createdBy ?? '', uc.updatedBy ?? '',
  ];
}

export function exportUseCasesCSV(useCases: UseCase[]) {
  const rows = [UC_FIELDS.join(',')];
  useCases.filter(u => u.act).forEach(uc => {
    rows.push(ucToRow(uc).map(csvCell).join(','));
  });
  downloadBlob(BOM + rows.join('\n'), 'usecases.csv');
}

// ── Incident-CSV ──────────────────────────────────────────────
const INC_FIELDS = ['id','ucid','type','sev','st','desc','act','date','createdAt','createdBy'] as const;

export function exportIncidentsCSV(incidents: Incident[]) {
  const rows = [INC_FIELDS.join(',')];
  incidents.forEach(i => {
    rows.push([i.id, i.ucid, i.type, i.sev, i.st, i.desc, i.act, i.date,
               i.createdAt ?? '', i.createdBy ?? ''].map(csvCell).join(','));
  });
  downloadBlob(BOM + rows.join('\n'), 'incidents.csv');
}

// ── Compliance-Status-CSV (24 Spalten) ────────────────────────
export interface ComplianceInput {
  useCases: UseCase[];
  artDB: {
    ra:   Record<string, Record<string, unknown>>;
    gc:   Record<string, Record<string, unknown>>;
    bc:   Record<string, Record<string, unknown>>;
    dsfa: Record<string, Record<string, unknown>>;
  };
}

const COMPLIANCE_HEADER = [
  'uc_id','uc_title','cluster','lifecycle','risk_tier','approval_status',
  'ra_vorhanden','ra_risk_score_max',
  'gc_vorhanden','gc_checks_bestanden',
  'bc_vorhanden',
  'dsfa_vorhanden','dsfa_status','dsfa_trigger_aktiv','dsfa_trigger_anzahl','dsfa_dsb_datum',
  'dsfa_bg_projektinhaber','dsfa_bg_datum','dsfa_bg_drittland',
  'kit_einsatz','kit_erstellung','legacy_system',
  'mc_abgeschlossen','mc_gesamt',
] as const;

export function exportComplianceCSV({ useCases, artDB }: ComplianceInput) {
  const TRIGGER_KEYS = ['dt1','dt2','dt3','dt4','dt5','dt6'];

  const rows = [COMPLIANCE_HEADER.join(',')];
  useCases.filter(u => u.act).forEach(uc => {
    const ra   = artDB.ra?.[uc.id]   ?? {};
    const gc   = artDB.gc?.[uc.id]   ?? {};
    const bc   = artDB.bc?.[uc.id]   ?? {};
    const dsfa = artDB.dsfa?.[uc.id] ?? {};

    const raVorh  = Object.keys(ra).length > 0 ? 'Ja' : 'Nein';
    const gcVorh  = Object.keys(gc).length > 0 ? 'Ja' : 'Nein';
    const bcVorh  = Object.keys(bc).length > 0 ? 'Ja' : 'Nein';
    const dsfaVorh = Object.keys(dsfa).length > 0 ? 'Ja' : 'Nein';

    const gcDone  = Object.values(gc).filter(Boolean).length;
    const trigAnz = TRIGGER_KEYS.filter(k => Boolean(dsfa[k])).length;
    const mcDone  = (uc.mc ?? []).filter(Boolean).length;

    rows.push([
      uc.id, uc.title, uc.cl, uc.lc, uc.rt, uc.app,
      raVorh, '—',
      gcVorh, gcDone || '—',
      bcVorh,
      dsfaVorh,
      String(dsfa['ds_status'] ?? '—'),
      trigAnz > 0 ? 'Ja' : 'Nein',
      String(trigAnz),
      String(dsfa['ds_dsbdate'] ?? ''),
      String(dsfa['bg_projektinhaber'] ?? ''),
      String(dsfa['bg_datum'] ?? ''),
      String(dsfa['bg_drittland'] ?? ''),
      uc.kiType?.includes('einsatz')    ? 'Ja' : 'Nein',
      uc.kiType?.includes('erstellung') ? 'Ja' : 'Nein',
      uc.legacy ?? '',
      String(mcDone),
      String((uc.mc ?? []).length),
    ].map(csvCell).join(','));
  });

  downloadBlob(BOM + rows.join('\n'), 'compliance-status.csv');
}

// ── Artefakte-JSON ────────────────────────────────────────────
export function exportArtefakteJSON(artDB: ComplianceInput['artDB']) {
  downloadJson(artDB, 'artefakte.json');
}

// ── Audit-Log-CSV ─────────────────────────────────────────────
export function exportAuditLogCSV(entries: import('@/types').AuditEntry[]) {
  const header = ['id','ts','actor','action','entity','entityId','comment'];
  const rows   = [header.join(',')];
  entries.forEach(e => {
    rows.push([e.id, e.ts, e.actor, e.action, e.entity, e.entityId, e.comment]
      .map(csvCell).join(','));
  });
  downloadBlob(BOM + rows.join('\n'), 'auditlog.csv');
}

// ── Excel-Export via SheetJS (on-demand) ─────────────────────
declare global {
  interface Window {
    XLSX?: {
      utils: {
        book_new: () => unknown;
        json_to_sheet: (data: unknown[]) => unknown;
        book_append_sheet: (wb: unknown, ws: unknown, name: string) => void;
      };
      writeFile: (wb: unknown, name: string) => void;
    };
  }
}

async function loadSheetJS(): Promise<typeof window.XLSX> {
  if (window.XLSX) return window.XLSX;
  await new Promise<void>((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => res();
    s.onerror = () => rej(new Error('SheetJS laden fehlgeschlagen'));
    document.head.appendChild(s);
  });
  return window.XLSX;
}

export async function exportExcel(useCases: UseCase[], incidents: Incident[]) {
  const XLSX = await loadSheetJS();
  if (!XLSX) throw new Error('SheetJS nicht verfügbar');

  const ucRows = useCases.filter(u => u.act).map(uc => {
    const row: Record<string, unknown> = {};
    UC_FIELDS.forEach((f, i) => { row[f] = ucToRow(uc)[i]; });
    return row;
  });

  const incRows = incidents.map(i => ({
    id: i.id, ucid: i.ucid, type: i.type, sev: i.sev, st: i.st,
    desc: i.desc, act: i.act, date: i.date,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ucRows), 'UseCases');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incRows), 'Incidents');
  XLSX.writeFile(wb, 'aims-data.xlsx');
}

// ── PDF-Print ─────────────────────────────────────────────────
export function printArtefakt(ucId: string, type: string) {
  // Setzt einen data-print-context Attribut und triggert window.print()
  // @media print blendet alles außer dem aktuellen Artefakt aus
  document.title = `AIOS — ${type.toUpperCase()} — ${ucId}`;
  window.print();
}
