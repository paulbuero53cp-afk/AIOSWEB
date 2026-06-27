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

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{hint}</div>}
    </div>
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

  if (successId) {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <LangToggle lang={lang} onToggle={toggle} t={t} />
          <div style={{ fontSize: 48, marginBottom: 12, textAlign: 'center' }}>✅</div>
          <h2 style={h2Style}>{t('reg.successTitle')}</h2>
          <p style={{ ...subStyle, textAlign: 'center', marginTop: 8 }}>
            {t('reg.successSub').replace('{id}', successId)}
          </p>
          <button className="btn btn-outline" style={{ marginTop: 20, width: '100%' }}
            onClick={() => { setForm(EMPTY); setOk(''); setErrors({}); }}>
            {t('reg.another')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <LangToggle lang={lang} onToggle={toggle} t={t} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
          <h1 style={h1Style}>{t('reg.title')}</h1>
          <p style={subStyle}>{t('reg.sub')}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Titel */}
          <Field label={t('reg.fTitle')} required>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder={t('reg.fTitlePh')} style={inputStyle} />
            {errors.title && <div style={errStyle}>{errors.title}</div>}
          </Field>

          {/* Kurzbeschreibung */}
          <Field label={t('reg.fDesc')}>
            <textarea value={form.desc} onChange={e => set('desc', e.target.value)}
              placeholder={t('reg.fDescPh')} rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          {/* Problem */}
          <Field label={t('reg.fProblem')} required>
            <textarea value={form.problem} onChange={e => set('problem', e.target.value)}
              placeholder={t('reg.fProblemPh')} rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
            {errors.problem && <div style={errStyle}>{errors.problem}</div>}
          </Field>

          {/* Daten */}
          <Field label={t('reg.fData')}>
            <textarea value={form.data} onChange={e => set('data', e.target.value)}
              placeholder={t('reg.fDataPh')} rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          {/* KI-Dimension */}
          <Field label={t('reg.fKiType')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {([
                ['kiEinsatz',    t('reg.kiEinsatz')],
                ['kiErstellung', t('reg.kiErstellung')],
                ['kiWeissNicht', t('reg.kiWeissNicht')],
              ] as const).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form[key]}
                    onChange={e => setKiType(key, e.target.checked)}
                    style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </Field>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          {/* Abteilung + Ansprechpartner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label={t('reg.fCl')}>
              <select value={form.cl} onChange={e => set('cl', e.target.value)} style={inputStyle}>
                <option value="">—</option>
                {clusters.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={t('reg.fOwn')}>
              <input value={form.own} onChange={e => set('own', e.target.value)}
                placeholder={lang === 'de' ? 'Name / E-Mail' : 'Name / email'} style={inputStyle} />
            </Field>
          </div>

          {/* System */}
          <Field label={t('reg.fSys')}>
            <input value={form.sys} onChange={e => set('sys', e.target.value)}
              placeholder={t('reg.fSysPh')} style={inputStyle} />
          </Field>

          {/* Anmerkungen */}
          <Field label={t('reg.fNote')}>
            <textarea value={form.note} onChange={e => set('note', e.target.value)}
              placeholder={t('reg.fNotePh')} rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          <button type="submit" className="btn btn-primary" disabled={submitting}
            style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>
            {submitting ? t('reg.submitting') : t('reg.submit')}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          {t('reg.privacy')}
        </p>
      </div>
    </div>
  );
}

// ── Sprachumschalter ──────────────────────────────────────────
function LangToggle({ lang, onToggle, t }: { lang: string; onToggle: () => void; t: (k: string) => string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
      <button onClick={onToggle} style={{
        background: 'none', border: '1px solid var(--border)', borderRadius: 6,
        padding: '4px 10px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
      }}>
        {lang === 'de' ? t('reg.langToggle') : '🌐 Deutsch'}
      </button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const wrapStyle: React.CSSProperties = {
  minHeight: '100vh', background: 'var(--bg)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '40px 16px', fontFamily: 'var(--font)',
};
const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '32px 40px', width: '100%', maxWidth: 580,
  boxShadow: '0 4px 20px rgba(0,0,0,.07)',
};
const h1Style: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: 'var(--petrol)', margin: '0 0 8px' };
const h2Style: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: 'var(--petrol)', margin: '0 0 12px', textAlign: 'center' };
const subStyle: React.CSSProperties = { fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 };
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box' };
const errStyle: React.CSSProperties = { fontSize: 12, color: 'var(--red)', marginTop: 4 };
