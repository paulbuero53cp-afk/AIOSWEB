// ─────────────────────────────────────────────────────────────
//  Register — Öffentliches UC-Einreichungsformular
//  Erreichbar unter /register ohne Auth (SWA-Route: anonymous)
//  Kein AppShell / keine Navigation — standalone.
//  Sprachumschalter DE/EN via LanguageProvider (aus main.tsx).
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useLang, useT } from '@/context/LanguageContext';
import '@/styles/global.css';

const CLUSTERS_DE = [
  'Sonstiges', 'HR', 'Finance', 'IT', 'Vertrieb', 'Marketing',
  'Einkauf', 'Produktion', 'Logistik', 'Recht / Compliance',
  'Customer Service', 'F&E',
];
const CLUSTERS_EN = [
  'Other', 'HR', 'Finance', 'IT', 'Sales', 'Marketing',
  'Purchasing', 'Production', 'Logistics', 'Legal / Compliance',
  'Customer Service', 'R&D',
];

interface FormState {
  title: string;
  desc: string;
  problem: string;
  data: string;
  kiEinsatz: boolean;
  kiErstellung: boolean;
  kiWeissNicht: boolean;
  cl: string;
  own: string;
  sys: string;
  note: string;
}

const EMPTY: FormState = {
  title: '', desc: '', problem: '', data: '',
  kiEinsatz: false, kiErstellung: false, kiWeissNicht: false,
  cl: '', own: '', sys: '', note: '',
};

// ── Section heading ───────────────────────────────────────────
function Section({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '28px 0 18px',
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--petrol)',
        background: 'rgba(42,79,79,.08)', padding: '3px 8px',
        borderRadius: 4, whiteSpace: 'nowrap',
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────
function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5,
        color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// ── KI Toggle Chip ────────────────────────────────────────────
function KiChip({ label, sub, checked, onChange }: {
  label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
      border: `1.5px solid ${checked ? 'var(--petrol)' : 'var(--border)'}`,
      background: checked ? 'rgba(42,79,79,.06)' : 'var(--bg)',
      transition: 'all .15s',
      flex: 1, minWidth: 180,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
        border: `2px solid ${checked ? 'var(--petrol)' : 'var(--border)'}`,
        background: checked ? 'var(--petrol)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .15s',
      }}>
        {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>}
      </div>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ display: 'none' }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: checked ? 'var(--petrol)' : 'var(--text)', lineHeight: 1.3 }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </label>
  );
}

export default function Register() {
  const { lang, toggle } = useLang();
  const t = useT();

  const [form, setForm]      = useState<FormState>(EMPTY);
  const [errors, setErrors]  = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSub] = useState(false);
  const [successId, setOk]   = useState('');

  const clusters = lang === 'de' ? CLUSTERS_DE : CLUSTERS_EN;

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  }

  function setKiType(field: 'kiEinsatz' | 'kiErstellung' | 'kiWeissNicht', checked: boolean) {
    if (field === 'kiWeissNicht' && checked) {
      setForm(f => ({ ...f, kiEinsatz: false, kiErstellung: false, kiWeissNicht: true }));
    } else {
      setForm(f => ({ ...f, [field]: checked, kiWeissNicht: checked ? false : f.kiWeissNicht }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim())   errs.title   = t('reg.errTitle');
    if (!form.problem.trim()) errs.problem = t('reg.errProblem');
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSub(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      const data = await res.json() as { id: string };
      setOk(data.id);
    } catch (err) {
      setErrors({ title: String(err) });
    } finally {
      setSub(false);
    }
  }

  // ── Success Screen ──────────────────────────────────────────
  if (successId) {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <Header lang={lang} onToggle={toggle} t={t} />
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(34,197,94,.1)', border: '2px solid rgba(34,197,94,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 28,
            }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--petrol)', margin: '0 0 10px' }}>
              {t('reg.successTitle')}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 8px' }}>
              {t('reg.successSub').replace('{id}', successId)}
            </p>
            <div style={{
              display: 'inline-block', background: 'rgba(42,79,79,.08)',
              border: '1px solid rgba(42,79,79,.2)', borderRadius: 6,
              padding: '6px 16px', fontFamily: 'monospace', fontSize: 14,
              fontWeight: 700, color: 'var(--petrol)', margin: '12px 0 28px',
            }}>{successId}</div>
            <br />
            <button className="btn btn-outline" onClick={() => { setForm(EMPTY); setOk(''); setErrors({}); }}>
              {t('reg.another')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────
  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <Header lang={lang} onToggle={toggle} t={t} />

        <div style={{ padding: '0 32px 32px' }}>
          <form onSubmit={handleSubmit} noValidate>

            <Section label={lang === 'de' ? 'Idee beschreiben' : 'Describe your idea'} />

            {/* Titel */}
            <Field label={t('reg.fTitle')} required>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder={t('reg.fTitlePh')} className="form-input" />
              {errors.title && <div style={errStyle}>{errors.title}</div>}
            </Field>

            {/* Kurzbeschreibung */}
            <Field label={t('reg.fDesc')}>
              <textarea value={form.desc} onChange={e => set('desc', e.target.value)}
                placeholder={t('reg.fDescPh')} rows={2}
                className="form-input" style={{ resize: 'vertical' }} />
            </Field>

            {/* Problem */}
            <Field label={t('reg.fProblem')} required>
              <textarea value={form.problem} onChange={e => set('problem', e.target.value)}
                placeholder={t('reg.fProblemPh')} rows={3}
                className="form-input" style={{ resize: 'vertical' }} />
              {errors.problem && <div style={errStyle}>{errors.problem}</div>}
            </Field>

            {/* Daten */}
            <Field label={t('reg.fData')}>
              <textarea value={form.data} onChange={e => set('data', e.target.value)}
                placeholder={t('reg.fDataPh')} rows={2}
                className="form-input" style={{ resize: 'vertical' }} />
            </Field>

            {/* KI-Dimension */}
            <Section label={t('reg.fKiType')} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: -4 }}>
              <KiChip
                label={t('reg.kiEinsatz')}
                sub={lang === 'de' ? 'KI trifft Entscheidungen / Empfehlungen' : 'AI makes decisions / recommendations'}
                checked={form.kiEinsatz}
                onChange={v => setKiType('kiEinsatz', v)}
              />
              <KiChip
                label={t('reg.kiErstellung')}
                sub={lang === 'de' ? 'KI generiert Inhalte / Code / Texte' : 'AI generates content / code / text'}
                checked={form.kiErstellung}
                onChange={v => setKiType('kiErstellung', v)}
              />
              <KiChip
                label={t('reg.kiWeissNicht')}
                checked={form.kiWeissNicht}
                onChange={v => setKiType('kiWeissNicht', v)}
              />
            </div>

            {/* Kontext */}
            <Section label={lang === 'de' ? 'Kontext' : 'Context'} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label={t('reg.fCl')}>
                <select value={form.cl} onChange={e => set('cl', e.target.value)} className="form-input">
                  <option value="">—</option>
                  {clusters.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label={t('reg.fOwn')}>
                <input value={form.own} onChange={e => set('own', e.target.value)}
                  placeholder={lang === 'de' ? 'Name / E-Mail' : 'Name / email'} className="form-input" />
              </Field>
            </div>

            <Field label={t('reg.fSys')}>
              <input value={form.sys} onChange={e => set('sys', e.target.value)}
                placeholder={t('reg.fSysPh')} className="form-input" />
            </Field>

            <Field label={t('reg.fNote')}>
              <textarea value={form.note} onChange={e => set('note', e.target.value)}
                placeholder={t('reg.fNotePh')} rows={2}
                className="form-input" style={{ resize: 'vertical' }} />
            </Field>

            <div style={{ marginTop: 24 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}
                style={{ width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 600 }}>
                {submitting ? t('reg.submitting') : t('reg.submit')}
              </button>
            </div>
          </form>

          <p style={{ marginTop: 16, fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6 }}>
            {t('reg.privacy')}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Branded Header ────────────────────────────────────────────
function Header({ lang, onToggle, t }: { lang: string; onToggle: () => void; t: (k: string) => string }) {
  return (
    <div style={{
      background: '#2a4f4f',
      borderRadius: '12px 12px 0 0',
      padding: '24px 32px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        {/* Logo + Titel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/favicon.svg" alt="AIOS" style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 2 }}>
              AIOS
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {t('reg.title')}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 3 }}>
              {t('reg.sub')}
            </div>
          </div>
        </div>
        {/* Sprachumschalter */}
        <button onClick={onToggle} style={{
          background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
          borderRadius: 6, padding: '5px 12px', fontSize: 12, color: 'rgba(255,255,255,.85)',
          cursor: 'pointer', flexShrink: 0, marginTop: 4,
        }}>
          {lang === 'de' ? t('reg.langToggle') : '🌐 Deutsch'}
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const wrapStyle: React.CSSProperties = {
  minHeight: '100vh', background: 'var(--bg)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '40px 16px 60px', fontFamily: 'var(--font)',
};
const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 12, width: '100%', maxWidth: 620,
  boxShadow: '0 8px 32px rgba(0,0,0,.10)',
  overflow: 'hidden',
};
const errStyle: React.CSSProperties = { fontSize: 12, color: 'var(--red)', marginTop: 4 };
