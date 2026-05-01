// ─────────────────────────────────────────────────────────────
//  UcForm — Shared Form für New UC und Edit Modal
//  3 Tabs: Stammdaten / Bewertung / Governance
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { UseCase } from '@/types';
import {
  CLUSTERS, CAP_OPTIONS, AUTO_OPTIONS,
  LIFECYCLE_OPTIONS, PD_OPTIONS, RISK_TIER_OPTIONS,
} from '@/lib/constants';

// ── Formular-Felder (flaches Modell für RHF) ─────────────────
export interface UcFormValues {
  title: string; cl: string; sys: string; legacy: string;
  own: string; cap: string; auto: string; lc: string; desc: string; link: string;
  kiEinsatz: boolean; kiErstellung: boolean;
  vs: number; fs: number; rs: number;
  pd: string; rt: string; tier: string; rev: string; kpi: string; hitl: string;
  gt0: boolean; gt1: boolean; gt2: boolean; gt3: boolean;
  sb0: boolean; sb1: boolean; sb2: boolean; sb3: boolean;
  mc0: boolean; mc1: boolean; mc2: boolean; mc3: boolean;
  mc4: boolean; mc5: boolean; mc6: boolean;
  app: string; or: string;
}

function ucToFormValues(uc?: Partial<UseCase>): UcFormValues {
  const gt = uc?.gt ?? [false, false, false, false];
  const sb = uc?.sb ?? [false, false, false, false];
  const mc = uc?.mc ?? new Array(7).fill(false) as boolean[];
  return {
    title:        uc?.title ?? '',
    cl:           uc?.cl ?? 'HR',
    sys:          uc?.sys ?? '',
    legacy:       uc?.legacy ?? '',
    own:          uc?.own ?? '',
    cap:          uc?.cap ?? 'Generative KI',
    auto:         uc?.auto ?? 'Empfehlung (Mensch entscheidet)',
    lc:           uc?.lc ?? 'Idea',
    desc:         uc?.desc ?? '',
    link:         uc?.link ?? '',
    kiEinsatz:    uc?.kiType?.includes('einsatz') ?? false,
    kiErstellung: uc?.kiType?.includes('erstellung') ?? false,
    vs:           uc?.vs ?? 1, fs: uc?.fs ?? 1, rs: uc?.rs ?? 1,
    pd:           uc?.pd ?? 'Start',
    rt:           uc?.rt ?? 'Low',
    tier:         uc?.tier ?? '1',
    rev:          uc?.rev ?? 'yes',
    kpi:          uc?.kpi ?? 'no',
    hitl:         uc?.hitl ?? 'yes',
    gt0: gt[0], gt1: gt[1], gt2: gt[2], gt3: gt[3],
    sb0: sb[0], sb1: sb[1], sb2: sb[2], sb3: sb[3],
    mc0: mc[0], mc1: mc[1], mc2: mc[2], mc3: mc[3],
    mc4: mc[4] ?? false, mc5: mc[5] ?? false, mc6: mc[6] ?? false,
    app:          uc?.app ?? 'Not required',
    or:           uc?.or ?? 'Not ready',
  };
}

export function formValuesToUcPatch(v: UcFormValues): Partial<UseCase> {
  return {
    title:  v.title,
    cl:     v.cl,
    sys:    v.sys,
    legacy: v.legacy,
    own:    v.own,
    cap:    v.cap,
    auto:   v.auto,
    lc:     v.lc as UseCase['lc'],
    desc:   v.desc,
    link:   v.link,
    kiType: [
      ...(v.kiEinsatz    ? ['einsatz']    : []),
      ...(v.kiErstellung ? ['erstellung'] : []),
    ] as UseCase['kiType'],
    vs: Number(v.vs), fs: Number(v.fs), rs: Number(v.rs),
    pd:   v.pd as UseCase['pd'],
    rt:   v.rt as UseCase['rt'],
    tier: v.tier,
    rev:  v.rev  as 'yes' | 'no',
    kpi:  v.kpi  as 'yes' | 'no',
    hitl: v.hitl as 'yes' | 'no',
    gt:   [v.gt0, v.gt1, v.gt2, v.gt3] as UseCase['gt'],
    sb:   [v.sb0, v.sb1, v.sb2, v.sb3] as UseCase['sb'],
    mc:   [v.mc0, v.mc1, v.mc2, v.mc3, v.mc4, v.mc5, v.mc6],
    app:  v.app as UseCase['app'],
    or:   v.or as UseCase['or'],
  };
}

// ── Hilfskomponenten ──────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fgroup">
      <label className="fl">{label}</label>
      {children}
    </div>
  );
}
function FieldFull({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fgroup full">
      <label className="fl">{label}</label>
      {children}
    </div>
  );
}

// ── Score Slider ──────────────────────────────────────────────
const SCORE_LABELS: Record<number, string> = {
  1: '1 — Niedrig', 2: '2 — Mittel', 3: '3 — Hoch',
};
function ScoreSelect({ label, name, register }: {
  label: string;
  name: 'vs' | 'fs' | 'rs';
  register: ReturnType<typeof useForm<UcFormValues>>['register'];
}) {
  return (
    <Field label={label}>
      <select {...register(name)}>
        {[1, 2, 3].map(v => <option key={v} value={v}>{SCORE_LABELS[v]}</option>)}
      </select>
    </Field>
  );
}

// ── Governance-Trigger-Definitionen ──────────────────────────
const GT_LABELS = [
  'GT01 — Entscheidungen mit erheblicher rechtlicher Wirkung auf Personen',
  'GT02 — Verarbeitung besonderer Datenkategorien (Art. 9 DSGVO)',
  'GT03 — Systematische Überwachung von Mitarbeitenden oder Öffentlichkeit',
  'GT04 — Vollständig autonome Entscheidungen ohne Human-in-the-Loop',
];
const SB_LABELS = [
  'SB01 — Personenbezogene Daten von Mitarbeitenden',
  'SB02 — Kundendaten / personenbezogene Drittdaten',
  'SB03 — Sensible Unternehmensdaten / IP / Geschäftsgeheimnisse',
  'SB04 — Finanzdaten / regulierte Daten',
];
const MC_LABELS = [
  'MC01 — Zweck und Funktionsweise des KI-Systems sind dokumentiert',
  'MC02 — Datenbasis und Qualität sind geprüft und dokumentiert',
  'MC03 — Human-in-the-Loop ist definiert (sofern Risk Tier ≥ Medium)',
  'MC04 — Datenschutzrechtliche Prüfung ist durchgeführt',
  'MC05 — IT-Security-Review ist durchgeführt',
  'MC06 — Betroffene Mitarbeitende sind informiert',
  'MC07 — Monitoring und Review-Zyklus sind festgelegt',
];

// ── Haupt-Formular-Komponente ─────────────────────────────────
interface UcFormProps {
  defaultValues?: Partial<UseCase>;
  onSubmit: (data: Partial<UseCase>) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export default function UcForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Speichern',
  isSubmitting = false,
}: UcFormProps) {
  const [activeTab, setActiveTab] = useState(0);

  const {
    register, handleSubmit,
    formState: { errors },
  } = useForm<UcFormValues>({
    defaultValues: ucToFormValues(defaultValues),
  });

  const handleFormSubmit = handleSubmit(async (v) => {
    await onSubmit(formValuesToUcPatch(v));
  });

  const tabs = ['Stammdaten', 'Bewertung', 'Governance'];

  return (
    <form onSubmit={handleFormSubmit} noValidate>
      {/* Tab Bar */}
      <div className="tabs">
        {tabs.map((t, i) => (
          <div
            key={t}
            className={`tab${activeTab === i ? ' active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Tab 0 — Stammdaten */}
      <div className={`tp${activeTab === 0 ? ' active' : ''}`}>
        <div className="fg">
          <FieldFull label="Titel *">
            <input {...register('title', { required: 'Titel ist Pflichtfeld' })}
              placeholder="z.B. Copilot für E-Mail-Drafts" />
            {errors.title && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.title.message}</span>}
          </FieldFull>

          <Field label="Cluster / Abteilung">
            <select {...register('cl')}>
              {CLUSTERS.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Business Owner">
            <input {...register('own')} placeholder="Name" />
          </Field>

          <Field label="System / Werkzeug">
            <input {...register('sys')} placeholder="z.B. Copilot M365, Azure AI…" />
          </Field>

          <Field label="Betroffenes Legacy-System">
            <input {...register('legacy')} placeholder="z.B. SAP ECC, Navision…" />
          </Field>

          <Field label="KI-Technologie">
            <select {...register('cap')}>
              {CAP_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <FieldFull label="KI-Typ (Dimension)">
            <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, fontWeight: 400, cursor: 'pointer' }}>
                <input type="checkbox" {...register('kiEinsatz')} style={{ marginTop: 2, flexShrink: 0 }} />
                <span><strong>KI im Einsatz</strong> — Nutzung von KI in Systemen, Prozessen oder Produkten</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, fontWeight: 400, cursor: 'pointer' }}>
                <input type="checkbox" {...register('kiErstellung')} style={{ marginTop: 2, flexShrink: 0 }} />
                <span><strong>KI in der Erstellung</strong> — Nutzung von KI im Entwicklungsprozess</span>
              </label>
            </div>
          </FieldFull>

          <Field label="Autonomiegrad">
            <select {...register('auto')}>
              {AUTO_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Lifecycle">
            <select {...register('lc')}>
              {LIFECYCLE_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>

          <FieldFull label="Beschreibung">
            <textarea {...register('desc')} rows={3} placeholder="Kurze Beschreibung des Use Cases…" />
          </FieldFull>

          <FieldFull label="URL (Agent / Tool)">
            <input {...register('link')} type="url" placeholder="https://…" />
          </FieldFull>
        </div>
      </div>

      {/* Tab 1 — Bewertung */}
      <div className={`tp${activeTab === 1 ? ' active' : ''}`}>
        <div className="fg">
          <ScoreSelect label="Value Score (1–3)" name="vs" register={register} />
          <ScoreSelect label="Feasibility Score (1–3)" name="fs" register={register} />
          <ScoreSelect label="Risk Score (1–3)" name="rs" register={register} />

          <Field label="Portfolio Decision">
            <select {...register('pd')}>
              {PD_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Risk Tier">
            <select {...register('rt')}>
              {RISK_TIER_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Governance-Tier">
            <select {...register('tier')}>
              {['1', '2', '3'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="KPI-Tracking aktiv">
            <select {...register('kpi')}>
              <option value="no">Nein</option>
              <option value="yes">Ja</option>
            </select>
          </Field>

          <Field label="Human in the Loop">
            <select {...register('hitl')}>
              <option value="yes">Ja</option>
              <option value="no">Nein</option>
            </select>
          </Field>

          <Field label="Entscheidungen reversibel">
            <select {...register('rev')}>
              <option value="yes">Ja</option>
              <option value="no">Nein</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Tab 2 — Governance */}
      <div className={`tp${activeTab === 2 ? ' active' : ''}`}>
        {/* Governance-Trigger */}
        <div style={{ marginBottom: 20 }}>
          <div className="dstitle">Governance-Trigger (GT)</div>
          {GT_LABELS.map((label, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" {...register(`gt${i}` as keyof UcFormValues)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {/* Sensible Bereiche */}
        <div style={{ marginBottom: 20 }}>
          <div className="dstitle">Sensible Bereiche (SB)</div>
          {SB_LABELS.map((label, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" {...register(`sb${i}` as keyof UcFormValues)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {/* Minimum Standard Checks */}
        <div style={{ marginBottom: 20 }}>
          <div className="dstitle">Minimum Standard Checks (MC)</div>
          {MC_LABELS.map((label, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" {...register(`mc${i}` as keyof UcFormValues)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {/* Approval + OR */}
        <div className="fg">
          <Field label="Approval Status">
            <select {...register('app')}>
              {['Not required', 'Pending', 'Approved', 'Rejected'].map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>

          <Field label="Operational Readiness">
            <select {...register('or')}>
              <option>Not ready</option>
              <option>Operational Ready</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Footer */}
      <div className="mf" style={{ position: 'static', borderTop: '1px solid var(--border)', marginTop: 20, padding: '12px 0 0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Abbrechen
        </button>
        {activeTab < 2 && (
          <button type="button" className="btn btn-outline" onClick={() => setActiveTab(t => t + 1)}>
            Weiter →
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Speichert…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
