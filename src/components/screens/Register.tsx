// ─────────────────────────────────────────────────────────────
//  Register — Öffentliches UC-Einreichungsformular
//  Erreichbar unter /register ohne Auth (SWA-Route: anonymous)
//  Kein AppShell / keine Navigation — standalone.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import '@/styles/global.css';

interface FormState {
  title: string;
  desc: string;
  cl: string;
  own: string;
  sys: string;
  note: string;
}

const EMPTY: FormState = { title: '', desc: '', cl: '', own: '', sys: '', note: '' };

const CLUSTERS = [
  'Sonstiges', 'HR', 'Finance', 'IT', 'Vertrieb', 'Marketing',
  'Einkauf', 'Produktion', 'Logistik', 'Recht / Compliance',
  'Customer Service', 'F&E',
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export default function Register() {
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [error, setError]     = useState('');
  const [submitting, setSub]  = useState(false);
  const [successId, setOk]    = useState('');

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
    if (error) setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Titel ist Pflichtfeld'); return; }

    setSub(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Fehler ${res.status}`);
      }
      const data = await res.json() as { id: string };
      setOk(data.id);
    } catch (err) {
      setError(String(err));
    } finally {
      setSub(false);
    }
  }

  if (successId) {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 48, marginBottom: 12, textAlign: 'center' }}>✅</div>
          <h2 style={h2Style}>Einreichung erfasst!</h2>
          <p style={subStyle}>
            Ihre Einreichung wurde mit der ID <strong>{successId}</strong> registriert.
            Das Governance-Team wird sich bei Ihnen melden.
          </p>
          <button
            className="btn btn-outline"
            style={{ marginTop: 20 }}
            onClick={() => { setForm(EMPTY); setOk(''); }}
          >
            Weiteren Use Case einreichen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
          <h1 style={h1Style}>KI-Use Case einreichen</h1>
          <p style={subStyle}>
            Beschreiben Sie Ihren geplanten KI-Einsatz.
            Wir prüfen ihn gemäß unserem Governance-Prozess.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <Field label="Titel des Use Cases" required>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="z.B. E-Mail-Drafts mit Copilot automatisieren"
              style={inputStyle}
            />
          </Field>

          <Field label="Beschreibung">
            <textarea
              value={form.desc}
              onChange={e => set('desc', e.target.value)}
              placeholder="Was soll die KI tun? Welches Problem wird gelöst?"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Abteilung / Bereich">
              <select
                value={form.cl}
                onChange={e => set('cl', e.target.value)}
                style={inputStyle}
              >
                <option value="">— bitte wählen —</option>
                {CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Ansprechpartner">
              <input
                value={form.own}
                onChange={e => set('own', e.target.value)}
                placeholder="Name / E-Mail"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Geplantes KI-System / Werkzeug">
            <input
              value={form.sys}
              onChange={e => set('sys', e.target.value)}
              placeholder="z.B. Copilot M365, ChatGPT, Azure AI…"
              style={inputStyle}
            />
          </Field>

          <Field label="Anmerkungen">
            <textarea
              value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="Weitere Hinweise, Zeitplan, besondere Anforderungen…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 6, background: 'var(--red-bg, #fff0f0)',
              border: '1px solid var(--red)', color: 'var(--red)', fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', padding: '12px 0', fontSize: 15 }}
          >
            {submitting ? 'Wird eingereicht…' : 'Einreichen'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          Ihre Angaben werden vertraulich behandelt und nur intern für den Governance-Prozess verwendet.
        </p>
      </div>
    </div>
  );
}

// ── Inline-Styles ─────────────────────────────────────────────
const wrapStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '40px 16px',
  fontFamily: 'var(--font)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '36px 40px',
  width: '100%',
  maxWidth: 560,
  boxShadow: '0 4px 20px rgba(0,0,0,.07)',
};

const h1Style: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--petrol)',
  margin: '0 0 8px',
};

const h2Style: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--petrol)',
  margin: '0 0 12px',
  textAlign: 'center',
};

const subStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--muted)',
  lineHeight: 1.6,
  margin: 0,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
};
