// ─────────────────────────────────────────────────────────────
//  UcForm — Shared Form für New UC und Edit Modal
//  4 Tabs: Stammdaten / Bewertung / Governance / Reliabilität
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { UseCase } from '@/types';
import {
  CLUSTERS, CAP_OPTIONS, AUTO_OPTIONS,
  LIFECYCLE_OPTIONS, PD_OPTIONS, RISK_TIER_OPTIONS,
  UC_CATEGORY_OPTIONS, AITOOL_STATUS_CSS,
} from '@/lib/constants';
import { useAiTools } from '@/hooks/useAiTools';

// ── Formular-Felder (flaches Modell für RHF) ─────────────────
export interface UcFormValues {
  title: string; cl: string; sys: string; toolRef: string; legacy: string;
  own: string; cap: string; useCaseCategory: string; auto: string; lc: string; desc: string; link: string;
  kiEinsatz: boolean; kiErstellung: boolean;
  vs: number; fs: number; rs: number;
  pd: string; rt: string; tier: string; rev: string; kpi: string; hitl: string;
  gt0: boolean; gt1: boolean; gt2: boolean; gt3: boolean;
  sb0: boolean; sb1: boolean; sb2: boolean; sb3: boolean;
  mc0: boolean; mc1: boolean; mc2: boolean; mc3: boolean;
  mc4: boolean; mc5: boolean; mc6: boolean;
  app: string; or: string;
  // ── Reliability (Tab 3) ──────────────────────────────────
  rl: string;
  hitlMode: string;
  autonomyLevel: string;
  fm_accuracy: boolean;
  fm_inconsistency: boolean;
  fm_drift: boolean;
  fm_agentic: boolean;
  fm_infrastructure: boolean;
  monitoringSla: string;
}

function ucToFormValues(uc?: Partial<UseCase>): UcFormValues {
  const gt = uc?.gt ?? [false, false, false, false];
  const sb = uc?.sb ?? [false, false, false, false];
  const mc = uc?.mc ?? new Array(7).fill(false) as boolean[];
  return {
    title:        uc?.title ?? '',
    cl:           uc?.cl ?? 'HR',
    sys:          uc?.sys ?? '',
    toolRef:      uc?.toolRef ?? '',
    legacy:       uc?.legacy ?? '',
    own:          uc?.own ?? '',
    cap:          uc?.cap ?? 'Generative KI',
    useCaseCategory: uc?.useCaseCategory ?? 'Sonstiges',
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
    // Reliability
    rl:              uc?.rl ?? '',
    hitlMode:        uc?.hitlMode ?? '',
    autonomyLevel:   uc?.autonomyLevel ?? '',
    fm_accuracy:     uc?.failureModes?.includes('accuracy')       ?? false,
    fm_inconsistency:uc?.failureModes?.includes('inconsistency')  ?? false,
    fm_drift:        uc?.failureModes?.includes('drift')          ?? false,
    fm_agentic:      uc?.failureModes?.includes('agentic')        ?? false,
    fm_infrastructure:uc?.failureModes?.includes('infrastructure') ?? false,
    monitoringSla:   uc?.monitoringSla ?? '',
  };
}

export function formValuesToUcPatch(v: UcFormValues): Partial<UseCase> {
  return {
    title:   v.title,
    cl:      v.cl,
    sys:     v.sys,
    toolRef: v.toolRef || undefined,
    legacy:  v.legacy,
    own:    v.own,
    cap:    v.cap,
    useCaseCategory: v.useCaseCategory,
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
    // Reliability
    rl:           (v.rl || undefined) as UseCase['rl'],
    hitlMode:     (v.hitlMode || undefined) as UseCase['hitlMode'],
    autonomyLevel:(v.autonomyLevel || undefined) as UseCase['autonomyLevel'],
    failureModes: [
      ...(v.fm_accuracy      ? ['accuracy']       : []),
      ...(v.fm_inconsistency ? ['inconsistency']   : []),
      ...(v.fm_drift         ? ['drift']           : []),
      ...(v.fm_agentic       ? ['agentic']         : []),
      ...(v.fm_infrastructure? ['infrastructure']  : []),
    ] as UseCase['failureModes'],
    monitoringSla: v.monitoringSla || undefined,
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

// ── Governance-Trigger-Definitionen (1:1 aus HTML-Basisversion) ──
export const GT_LABELS = [
  'GT01 – KI ist in Systeme oder Workflows integriert',
  'GT02 – KI-Ergebnisse werden geteilt oder wiederverwendet',
  'GT03 – KI beeinflusst Entscheidungen über den individuellen Nutzer hinaus',
  'GT04 – KI wird skaliert oder operationalisiert',
];
export const SB_LABELS = [
  'SB01 – Pricing / Konditionsentscheidungen',
  'SB02 – Kundenkommunikation',
  'SB03 – HR-Entscheidungen',
  'SB04 – Finanzielle Verpflichtungen',
];
export const MC_LABELS = [
  'MC01 - Datenschutz und DSGVO geprueft',
  'MC02 - KPI definiert',
  'MC03 - Business Owner benannt',
  'MC04 - Risk Assessment abgeschlossen',
  'MC05 - Rollback / Fallback definiert',
  'MC06 - Human Oversight Mechanismus definiert',
  'MC07 - Stakeholder informiert',
];

// ── Haupt-Formular-Komponente ─────────────────────────────────
interface UcFormProps {
  defaultValues?: Partial<UseCase>;
  onSubmit: (data: Partial<UseCase>) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  initialTab?: number;
}

export default function UcForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Speichern',
  isSubmitting = false,
  initialTab = 0,
}: UcFormProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { tools } = useAiTools();

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<UcFormValues>({
    defaultValues: ucToFormValues(defaultValues),
  });

  const watchedToolRef = watch('toolRef');
  const selectedTool = tools.find(tool => tool.id === watchedToolRef);

  const handleFormSubmit = handleSubmit(async (v) => {
    await onSubmit(formValuesToUcPatch(v));
  });

  const tabs = ['Stammdaten', 'Bewertung', 'Governance', 'Reliabilität'];

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
            {/* Dropdown aus AI-Tools-Register */}
            <select
              value={watchedToolRef}
              onChange={e => {
                const id = e.target.value;
                setValue('toolRef', id);
                if (id) {
                  const tool = tools.find(tool => tool.id === id);
                  if (tool) setValue('sys', tool.name);
                }
              }}
              style={{ marginBottom: 4 }}
            >
              <option value="">— aus Register wählen oder manuell eingeben —</option>
              {tools.map(tool => (
                <option key={tool.id} value={tool.id}>
                  {tool.name}{tool.vendor ? ` (${tool.vendor})` : ''} [{tool.status}]
                </option>
              ))}
            </select>
            <input type="hidden" {...register('toolRef')} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                {...register('sys')}
                placeholder="z.B. Copilot M365, Azure AI…"
                style={{ flex: 1 }}
              />
              {selectedTool && (
                <span className={`badge ${AITOOL_STATUS_CSS[selectedTool.status] ?? 'bb'}`}
                  title={`${selectedTool.name} — ${selectedTool.status}`}
                  style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {selectedTool.status}
                </span>
              )}
            </div>
          </Field>

          <Field label="Betroffenes Legacy-System">
            <input {...register('legacy')} placeholder="z.B. SAP ECC, Navision…" />
          </Field>

          <Field label="KI-Technologie">
            <select {...register('cap')}>
              {CAP_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Use Case Kategorie">
            <select {...register('useCaseCategory')}>
              {UC_CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
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

      {/* Tab 3 — Reliabilität */}
      <div className={`tp${activeTab === 3 ? ' active' : ''}`}>
        {/* R-Tier */}
        <div style={{ marginBottom: 20 }}>
          <div className="dstitle">Reliability Tier</div>
          <div className="fg">
            <Field label="R-Tier">
              <select {...register('rl')}>
                <option value="">— nicht zugewiesen —</option>
                <option value="R1">R1 — Empfehlung (Mensch entscheidet immer)</option>
                <option value="R2">R2 — Bestätigung (Mensch bestätigt vor Ausführung)</option>
                <option value="R3">R3 — Überwacht (Mensch kann jederzeit stoppen)</option>
                <option value="R4">R4 — Automation (stichprobenartige Kontrolle)</option>
                <option value="R5">R5 — Agentic (kein direkter menschlicher Eingriff)</option>
              </select>
            </Field>
            <Field label="HITL-Modus">
              <select {...register('hitlMode')}>
                <option value="">— nicht definiert —</option>
                <option value="HITL">HITL — Human In The Loop (Mensch entscheidet aktiv mit)</option>
                <option value="HOTL">HOTL — Human On The Loop (Mensch überwacht, greift ein bei Bedarf)</option>
                <option value="none">none — Kein menschlicher Oversight</option>
              </select>
            </Field>
            <Field label="Automationsgrad">
              <select {...register('autonomyLevel')}>
                <option value="">— nicht definiert —</option>
                <option value="supervised">supervised — Vollständig beaufsichtigt</option>
                <option value="semi-auto">semi-auto — Teilweise autonom</option>
                <option value="autonomous">autonomous — Vollständig autonom</option>
              </select>
            </Field>
            <Field label="Monitoring SLA">
              <select {...register('monitoringSla')}>
                <option value="">— keins definiert —</option>
                <option value="Echtzeit">Echtzeit</option>
                <option value="täglich">Täglich</option>
                <option value="wöchentlich">Wöchentlich</option>
                <option value="monatlich">Monatlich</option>
                <option value="quartalsweise">Quartalsweise</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Failure-Mode-Risiken */}
        <div>
          <div className="dstitle">Bekannte Failure-Mode-Risiken</div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            Welche Zuverlässigkeits-Risikokategorien sind für diesen Use Case relevant?
          </p>
          {[
            { name: 'fm_accuracy'      as const, label: 'Accuracy-Drift — KI-Ergebnisse weichen von erwarteter Qualität ab' },
            { name: 'fm_inconsistency' as const, label: 'Inkonsistenz — Gleiche Eingabe, unterschiedliche Ausgaben (non-determinism)' },
            { name: 'fm_drift'         as const, label: 'Temporal Drift — Modell veraltet durch Daten- oder Umfeldveränderungen' },
            { name: 'fm_agentic'       as const, label: 'Agentic Eskalation — Autonomes System überschreitet definierten Handlungsrahmen' },
            { name: 'fm_infrastructure'as const, label: 'Infrastruktur-Ausfall — Abhängigkeiten (APIs, Modelle, Daten) nicht verfügbar' },
          ].map(({ name, label }) => (
            <label key={name} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" {...register(name)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mf" style={{ position: 'static', borderTop: '1px solid var(--border)', marginTop: 20, padding: '12px 0 0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Abbrechen
        </button>
        {activeTab < tabs.length - 1 && (
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
