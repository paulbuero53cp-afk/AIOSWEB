import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { configApi, swrFetcher } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { AppConfig } from '@/types';

const APP_VERSION = '1.0.0';
const REPO_URL    = 'https://github.com/paulbuero53cp-afk/AIOSWEB';

// ── Config Form ───────────────────────────────────────────────
function ConfigEditor({ initial, onSaved }: { initial: AppConfig; onSaved: () => void }) {
  const [form, setForm]     = useState<AppConfig>(initial);
  const [saving, setSaving] = useState(false);
  const { showToast }       = useToast();

  function set(key: keyof AppConfig, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }
  function setChatbot(key: keyof AppConfig['chatbot'], val: string | boolean) {
    setForm(f => ({ ...f, chatbot: { ...f.chatbot, [key]: val } }));
  }

  async function save() {
    setSaving(true);
    try {
      await configApi.save(form);
      showToast('Konfiguration gespeichert', 'success');
      onSaved();
    } catch (err) {
      showToast(`Fehler: ${String(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, val: string, onChange: (v: string) => void) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
        {label}
      </label>
      <input className="form-input" value={val} onChange={e => onChange(e.target.value)} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        {field('Firmenname', form.name,  v => set('name',  v))}
        {field('Kürzel',     form.short, v => set('short', v))}
        {field('App-Titel',  form.tag,   v => set('tag',   v))}
        {field('ISO/Norm',   form.iso,   v => set('iso',   v))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0', paddingTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Chatbot / KI-Assistent</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {field('Label',    form.chatbot.label, v => setChatbot('label', v))}
          {field('URL',      form.chatbot.url,   v => setChatbot('url',   v))}
          {field('Hinweis',  form.chatbot.hint,  v => setChatbot('hint',  v))}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
              Aktiviert
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.chatbot.enabled}
                onChange={e => setChatbot('enabled', e.target.checked)} />
              <span style={{ fontSize: 13 }}>{form.chatbot.enabled ? 'Ja' : 'Nein'}</span>
            </label>
          </div>
        </div>
      </div>

      <button className="btn" onClick={save} disabled={saving}>
        {saving ? 'Speichern…' : '💾 Speichern'}
      </button>
    </div>
  );
}

// ── Info Row ──────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 16 }}>
      <span style={{ width: 160, fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13 }}>{value}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function Info() {
  const { isAdmin, principal } = useAuth();
  const { mutate } = useSWRConfig();
  const { data: config } = useSWR<AppConfig>('/api/config', swrFetcher);

  const cfg = config ?? {
    name: '—', short: 'AIOS', tag: 'AI Management System', iso: '—',
    chatbot: { enabled: false, label: '', url: '', hint: '' },
  };

  return (
    <div>
      <div className="sec-title">Info & Konfiguration</div>
      <div className="sec-sub">App-Informationen und Systemeinstellungen</div>

      {/* App Info */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Anwendung</div>
        <InfoRow label="App"          value={`${cfg.short} — ${cfg.tag}`} />
        <InfoRow label="Organisation" value={cfg.name} />
        <InfoRow label="Norm"         value={cfg.iso} />
        <InfoRow label="Version"      value={APP_VERSION} />
        <InfoRow label="Repository"   value={REPO_URL} />
        <InfoRow label="Angemeldet als" value={principal?.userDetails ?? '—'} />
        <InfoRow label="Rollen"       value={principal?.userRoles?.filter(r => r.startsWith('AIOS.')).join(', ') ?? '—'} />
      </div>

      {/* Links */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Links</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
            ↗ GitHub Repository
          </a>
          {cfg.chatbot.enabled && cfg.chatbot.url && (
            <a href={cfg.chatbot.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
              ↗ {cfg.chatbot.label || 'KI-Assistent'}
            </a>
          )}
          <a href="/.auth/logout" className="btn btn-outline btn-sm">Abmelden</a>
        </div>
      </div>

      {/* Config Editor (Admin only) */}
      {isAdmin && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Konfiguration bearbeiten</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Nur für Administratoren sichtbar</div>
          <ConfigEditor initial={cfg} onSaved={() => mutate('/api/config')} />
        </div>
      )}
    </div>
  );
}
