import { useState, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { configApi, exchangeApi, swrFetcher } from '@/lib/api';
import type { UcBundle, ImportResult } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTx } from '@/context/LanguageContext';
import { downloadJson } from '@/lib/exports';
import type { AppConfig } from '@/types';

const APP_VERSION = '1.0.0';
const REPO_URL    = 'https://github.com/paulbuero53cp-afk/AIOSWEB';

// ── Config Form ───────────────────────────────────────────────
function ConfigEditor({ initial, onSaved }: { initial: AppConfig; onSaved: () => void }) {
  const [form, setForm]     = useState<AppConfig>(initial);
  const [saving, setSaving] = useState(false);
  const { showToast }       = useToast();
  const tx                  = useTx();

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
      showToast(tx('Konfiguration gespeichert'), 'success');
      onSaved();
    } catch (err) {
      showToast(`${tx('Fehler')}: ${String(err)}`, 'error');
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
        {field(tx('Firmenname'), form.name,  v => set('name',  v))}
        {field(tx('Kürzel'),     form.short, v => set('short', v))}
        {field(tx('App-Titel'),  form.tag,   v => set('tag',   v))}
        {field(tx('ISO/Norm'),   form.iso,   v => set('iso',   v))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0', paddingTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{tx('Chatbot / KI-Assistent')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {field('Label',       form.chatbot.label, v => setChatbot('label', v))}
          {field('URL',         form.chatbot.url,   v => setChatbot('url',   v))}
          {field(tx('Hinweis'), form.chatbot.hint,  v => setChatbot('hint',  v))}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
              {tx('Aktiviert')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.chatbot.enabled}
                onChange={e => setChatbot('enabled', e.target.checked)} />
              <span style={{ fontSize: 13 }}>{form.chatbot.enabled ? tx('Ja') : tx('Nein')}</span>
            </label>
          </div>
        </div>
      </div>

      <button className="btn" onClick={save} disabled={saving}>
        {saving ? tx('Speichern…') : tx('💾 Speichern')}
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

// ── Exchange Panel ────────────────────────────────────────────
type ExportState = 'idle' | 'exporting' | 'done' | 'error';
type ImportPhase = 'idle' | 'parsed' | 'importing' | 'done' | 'error';

function ExchangePanel() {
  const [exportState, setExportState]   = useState<ExportState>('idle');
  const [exportCount, setExportCount]   = useState<number | null>(null);
  const [importPhase, setImportPhase]   = useState<ImportPhase>('idle');
  const [importBundle, setImportBundle] = useState<UcBundle | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError]   = useState('');
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const { showToast }                   = useToast();
  const tx                              = useTx();

  async function handleExport() {
    setExportState('exporting');
    setExportCount(null);
    try {
      const bundle = await exchangeApi.export();
      const date   = new Date().toISOString().slice(0, 10);
      downloadJson(bundle, `AIOS_Export_${date}.json`);
      setExportCount(bundle.count);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 4000);
    } catch (err) {
      showToast(`Export fehlgeschlagen: ${String(err)}`, 'error');
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportPhase('idle');
    setImportError('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const bundle = JSON.parse(ev.target?.result as string) as UcBundle;
        if (!bundle?.useCases || !Array.isArray(bundle.useCases)) {
          setImportError('Ungültiges Format: useCases-Array fehlt');
          setImportPhase('error');
          return;
        }
        setImportBundle(bundle);
        setImportPhase('parsed');
      } catch {
        setImportError('Datei konnte nicht als JSON gelesen werden');
        setImportPhase('error');
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!importBundle) return;
    setImportPhase('importing');
    try {
      const result = await exchangeApi.import(importBundle);
      setImportResult(result);
      setImportPhase('done');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setImportError(String(err));
      setImportPhase('error');
    }
  }

  const statusStyle = (color: string) => ({
    fontSize: 12, color, marginTop: 8,
  });

  return (
    <div>
      {/* Export */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          {tx('Export')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          {tx('Alle aktiven Use Cases inklusive Artefakte als JSON-Bundle herunterladen.')}
        </div>
        <button
          className="btn"
          onClick={handleExport}
          disabled={exportState === 'exporting'}
        >
          {exportState === 'exporting'
            ? tx('Exportiere…')
            : exportState === 'done'
              ? tx('✓ Heruntergeladen')
              : tx('⬇ Alle exportieren')}
        </button>
        {exportState === 'done' && exportCount !== null && (
          <div style={statusStyle('var(--green)')}>
            {exportCount} {tx('Use Cases exportiert')}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 20 }} />

      {/* Import */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          {tx('Import')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          {tx('AIOS-Bundle (.json) importieren. Bestehende Use Cases werden aktualisiert, neue angelegt.')}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          style={{ fontSize: 13, display: 'block', marginBottom: 12 }}
        />

        {importPhase === 'parsed' && importBundle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {importBundle.count} {tx('Use Cases im Bundle')}
              {importBundle.exportedAt && ` · ${tx('exportiert am')} ${new Date(importBundle.exportedAt).toLocaleDateString('de-DE')}`}
            </span>
            <button className="btn btn-primary btn-sm" onClick={handleImport}>
              {tx('Importieren')}
            </button>
          </div>
        )}

        {importPhase === 'importing' && (
          <div style={statusStyle('var(--muted)')}>{tx('Importiere…')}</div>
        )}

        {importPhase === 'done' && importResult && (
          <div style={{ marginTop: 8 }}>
            <div style={statusStyle('var(--green)')}>
              ✓ {importResult.imported} {tx('neu angelegt')}, {importResult.updated} {tx('aktualisiert')}
            </div>
            {importResult.errors.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
                {importResult.errors.length} {tx('Fehler')}: {importResult.errors.join(' · ')}
              </div>
            )}
          </div>
        )}

        {importPhase === 'error' && (
          <div style={statusStyle('var(--red)')}>{importError}</div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function Info() {
  const { isAdmin, principal } = useAuth();
  const { mutate } = useSWRConfig();
  const { data: config } = useSWR<AppConfig>('/api/config', swrFetcher);
  const tx = useTx();

  const cfg = config ?? {
    name: '—', short: 'AIOS', tag: 'AI Management System', iso: '—',
    chatbot: { enabled: false, label: '', url: '', hint: '' },
  };

  return (
    <div>
      <div className="sec-title">{tx('Info & Konfiguration')}</div>
      <div className="sec-sub">{tx('App-Informationen und Systemeinstellungen')}</div>

      {/* App Info */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{tx('Anwendung')}</div>
        <InfoRow label="App"                value={`${cfg.short} — ${cfg.tag}`} />
        <InfoRow label={tx('Organisation')} value={cfg.name} />
        <InfoRow label={tx('Norm')}         value={cfg.iso} />
        <InfoRow label="Version"            value={APP_VERSION} />
        <InfoRow label="Repository"         value={REPO_URL} />
        <InfoRow label={tx('Angemeldet als')} value={principal?.userDetails ?? '—'} />
        <InfoRow label={tx('Rollen')}       value={principal?.userRoles?.filter(r => r.startsWith('AIOS.')).join(', ') ?? '—'} />
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
              ↗ {cfg.chatbot.label || tx('KI-Assistent')}
            </a>
          )}
          <a href="/.auth/logout" className="btn btn-outline btn-sm">{tx('Abmelden')}</a>
        </div>
      </div>

      {/* Config Editor (Admin only) */}
      {isAdmin && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{tx('Konfiguration bearbeiten')}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{tx('Nur für Administratoren sichtbar')}</div>
          <ConfigEditor initial={cfg} onSaved={() => mutate('/api/config')} />
        </div>
      )}

      {/* Data Exchange (Admin only) */}
      {isAdmin && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{tx('Datenaustausch')}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{tx('Nur für Administratoren sichtbar')}</div>
          <ExchangePanel />
        </div>
      )}

      {/* SP Provisioning (Admin only) */}
      {isAdmin && <ProvisionPanel />}
    </div>
  );
}

// ── Provisioning Panel ────────────────────────────────────────
type ProvState = 'idle' | 'running' | 'done' | 'error';
interface ProvReport { list: string; column: string; status: 'added' | 'exists' | 'error'; detail?: string }

function ProvisionPanel() {
  const [state, setState]   = useState<ProvState>('idle');
  const [report, setReport] = useState<ProvReport[]>([]);
  const [errMsg, setErrMsg] = useState('');

  async function run() {
    setState('running');
    setReport([]);
    try {
      const res = await fetch('/api/provision', {
        method: 'POST',
        headers: { 'X-Requested-With': 'AIOS', 'Content-Type': 'application/json' },
      });
      const text = await res.text();
      if (!text) throw new Error(`HTTP ${res.status}: leere Serverantwort`);
      const data = JSON.parse(text) as { report: ProvReport[]; errors: number };
      setReport(data.report ?? []);
      setState(data.errors > 0 ? 'error' : 'done');
    } catch (err) {
      setErrMsg(String(err));
      setState('error');
    }
  }

  const statusColor = (s: ProvReport['status']) =>
    s === 'added' ? 'var(--green)' : s === 'exists' ? 'var(--muted)' : 'var(--red)';
  const statusLabel = (s: ProvReport['status']) =>
    s === 'added' ? '✓ angelegt' : s === 'exists' ? '– vorhanden' : '✕ Fehler';

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>SharePoint Provisioning</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
        Legt fehlende SP-Spalten an (idempotent — bereits vorhandene werden übersprungen).
      </div>

      <button className="btn" onClick={run} disabled={state === 'running'}>
        {state === 'running' ? '⏳ Läuft…' : '⚙ SP-Spalten prüfen & anlegen'}
      </button>

      {report.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {report.map((r, i) => (
            <div key={i} style={{ fontSize: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ color: statusColor(r.status), fontWeight: 600, width: 100, flexShrink: 0 }}>
                {statusLabel(r.status)}
              </span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>
                {r.list} → {r.column}
              </span>
              {r.detail && <span style={{ color: 'var(--red)', fontSize: 11 }}>{r.detail}</span>}
            </div>
          ))}
        </div>
      )}

      {state === 'error' && !report.length && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--red)' }}>{errMsg}</div>
      )}
    </div>
  );
}
