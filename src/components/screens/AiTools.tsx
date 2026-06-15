import { useState, useEffect, useMemo } from 'react';
import { useAiTools } from '@/hooks/useAiTools';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/context/LanguageContext';
import { Modal } from '@/components/common/Modal';
import { aiToolApi } from '@/lib/api';
import { exportAiToolsCSV } from '@/lib/exports';
import {
  AITOOL_STATUS_OPTIONS, AITOOL_CATEGORY_OPTIONS,
  AITOOL_DATALOCATION_OPTIONS, AITOOL_STATUS_CSS,
} from '@/lib/constants';
import type { AiTool, AuditEntry } from '@/types';

const DECISION_STATES = ['Erlaubt', 'Eingeschränkt erlaubt', 'Abgelehnt', 'Zurückgezogen'];

// ── Formular-State ────────────────────────────────────────────
interface FormState {
  name: string; vendor: string; category: string; url: string;
  status: string; justification: string; scope: string;
  dataLocation: string; dpa: boolean; reviewDate: string; linkedUseCases: string;
}

const EMPTY: FormState = {
  name: '', vendor: '', category: 'Sonstiges', url: '',
  status: 'In Prüfung', justification: '', scope: '',
  dataLocation: 'Global/Unklar', dpa: false, reviewDate: '', linkedUseCases: '',
};

function toForm(t: AiTool): FormState {
  return {
    name: t.name, vendor: t.vendor, category: t.category, url: t.url,
    status: t.status, justification: t.justification, scope: t.scope,
    dataLocation: t.dataLocation, dpa: t.dpa,
    reviewDate: t.reviewDate?.split('T')[0] ?? '',
    linkedUseCases: t.linkedUseCases,
  };
}

function reviewOverdue(reviewDate: string): boolean {
  if (!reviewDate) return false;
  const d = new Date(reviewDate);
  return !isNaN(d.getTime()) && d < new Date(new Date().toDateString());
}

// ── Modal (Details + Historie) ────────────────────────────────
function AiToolModal({
  open, tool, onClose,
}: {
  open: boolean; tool: AiTool | null; onClose: () => void;
}) {
  const { createTool, updateTool } = useAiTools();
  const { showToast } = useToast();
  const { isEditor, isApprover } = useAuth();
  const t = useT();

  const [tab, setTab]   = useState<'details' | 'history'>('details');
  const [form, setForm] = useState<FormState>(tool ? toForm(tool) : EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<AuditEntry[] | null>(null);

  // Form bei Tool-Wechsel zurücksetzen
  useEffect(() => {
    setForm(tool ? toForm(tool) : EMPTY);
    setTab('details');
    setHistory(null);
  }, [tool, open]);

  // Historie lazy laden, wenn Tab geöffnet wird
  useEffect(() => {
    if (tab !== 'history' || !tool || history !== null) return;
    aiToolApi.history(tool.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [tab, tool, history]);

  const readOnly = !isEditor;
  // Editor darf keine Freigabe-Status setzen → nur Approver/Admin
  const allowedStatuses = isApprover
    ? AITOOL_STATUS_OPTIONS as readonly string[]
    : AITOOL_STATUS_OPTIONS.filter(s => !DECISION_STATES.includes(s));

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { showToast(t('tools.errName'), 'error'); return; }
    if (form.url && !/^https?:\/\//i.test(form.url)) {
      showToast(t('tools.errUrl'), 'error'); return;
    }
    const statusChanged = !tool || form.status !== tool.status;
    if (statusChanged && !form.justification.trim()) {
      showToast(t('tools.errJustification'), 'error'); return;
    }

    setSubmitting(true);
    try {
      if (tool) {
        const patch: Partial<AiTool> = {
          name: form.name, vendor: form.vendor, category: form.category, url: form.url,
          scope: form.scope, dataLocation: form.dataLocation, dpa: form.dpa,
          reviewDate: form.reviewDate, linkedUseCases: form.linkedUseCases,
          justification: form.justification,
        };
        if (statusChanged) patch.status = form.status as AiTool['status'];
        await updateTool(tool.id, patch);
        showToast(t('tools.savedUpd'), 'success');
      } else {
        await createTool({ ...form, status: form.status as AiTool['status'] });
        showToast(t('tools.savedNew'), 'success');
      }
      onClose();
    } catch (err) {
      showToast(`${t('common.errorPrefix')}: ${String(err)}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const label = (t: string) => <label className="fl" style={{ marginBottom: 4 }}>{t}</label>;

  return (
    <Modal
      open={open}
      wide
      title={tool ? `${tool.id} — ${tool.name}` : t('tools.new')}
      onClose={onClose}
      footer={
        readOnly ? (
          <button className="btn btn-outline" onClick={onClose}>{t('common.close')}</button>
        ) : (
          <>
            <button className="btn btn-outline" onClick={onClose}>{t('common.cancel')}</button>
            <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? t('tools.saving') : tool ? t('common.save') : t('tools.saveNew')}
            </button>
          </>
        )
      }
    >
      {/* Tabs nur im Bearbeiten-Modus (Historie braucht existierendes Tool) */}
      {tool && (
        <div className="tabs">
          <div className={`tab${tab === 'details' ? ' active' : ''}`} onClick={() => setTab('details')}>{t('tools.tabDetails')}</div>
          <div className={`tab${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>{t('tools.tabHistory')}</div>
        </div>
      )}

      {tab === 'details' && (
        <div className="fg">
          <div className="fgroup">
            {label(t('tools.fName'))}
            <input value={form.name} disabled={readOnly} onChange={e => set('name', e.target.value)} placeholder="ChatGPT" />
          </div>
          <div className="fgroup">
            {label(t('tools.fVendor'))}
            <input value={form.vendor} disabled={readOnly} onChange={e => set('vendor', e.target.value)} placeholder="OpenAI" />
          </div>
          <div className="fgroup">
            {label(t('tools.fCategory'))}
            <select value={form.category} disabled={readOnly} onChange={e => set('category', e.target.value)}>
              {AITOOL_CATEGORY_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="fgroup">
            {label(t('tools.fStatus'))}
            <select value={form.status} disabled={readOnly} onChange={e => set('status', e.target.value)}>
              {/* aktuellen Status immer anzeigen, auch wenn Rolle ihn nicht setzen dürfte */}
              {Array.from(new Set([form.status, ...allowedStatuses])).map(o => <option key={o}>{o}</option>)}
            </select>
            {!isApprover && !readOnly && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {t('tools.fApproverHint')}
              </div>
            )}
          </div>
          <div className="fgroup full">
            {label(t('tools.fJustification'))}
            <textarea rows={2} value={form.justification} disabled={readOnly}
              onChange={e => set('justification', e.target.value)}
              placeholder={t('tools.fJustificationPh')} />
          </div>
          <div className="fgroup full">
            {label(t('tools.fScope'))}
            <textarea rows={2} value={form.scope} disabled={readOnly}
              onChange={e => set('scope', e.target.value)}
              placeholder={t('tools.fScopePh')} />
          </div>
          <div className="fgroup">
            {label(t('tools.fDataLoc'))}
            <select value={form.dataLocation} disabled={readOnly} onChange={e => set('dataLocation', e.target.value)}>
              {AITOOL_DATALOCATION_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="fgroup">
            {label(t('tools.fDpa'))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 6 }}>
              <input type="checkbox" checked={form.dpa} disabled={readOnly} onChange={e => set('dpa', e.target.checked)} />
              {form.dpa ? 'Ja' : 'Nein'}
            </label>
          </div>
          <div className="fgroup">
            {label(t('tools.fUrl'))}
            <input value={form.url} disabled={readOnly} onChange={e => set('url', e.target.value)} placeholder="https://…" />
          </div>
          <div className="fgroup">
            {label(t('tools.fReview'))}
            <input type="date" value={form.reviewDate} disabled={readOnly} onChange={e => set('reviewDate', e.target.value)} />
          </div>
          <div className="fgroup full">
            {label(t('tools.fLinkedUc'))}
            <input value={form.linkedUseCases} disabled={readOnly} onChange={e => set('linkedUseCases', e.target.value)} placeholder="UC-2026-06-001, …" />
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {history === null ? (
            <div className="empty">{t('tools.histLoading')}</div>
          ) : history.length === 0 ? (
            <div className="empty">{t('tools.histEmpty')}</div>
          ) : (
            history.map(e => (
              <div key={e.id} className="li">
                <div className="li-hd">
                  <span className={`badge ${e.action === 'approve' ? 'bg' : e.action === 'reject' ? 'br' : 'bb'}`}>{e.action}</span>
                  <span className="li-meta">{e.ts ? new Date(e.ts).toLocaleString('de-DE') : ''} · {e.actor}</span>
                </div>
                {e.comment && <div style={{ fontSize: 13, marginTop: 4 }}>{e.comment}</div>}
                {Object.keys(e.diff ?? {}).length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {Object.entries(e.diff as Record<string, { von?: unknown; auf?: unknown }>)
                      .filter(([k]) => !['updatedAt', 'updatedBy', 'decisionDate', 'decidedBy'].includes(k))
                      .map(([k, v]) => `${k}: ${JSON.stringify(v?.von ?? '')} → ${JSON.stringify(v?.auf ?? '')}`)
                      .join(' · ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Screen ────────────────────────────────────────────────────
export default function AiTools() {
  const { tools, loading } = useAiTools();
  const { isEditor } = useAuth();
  const t = useT();

  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive]       = useState<AiTool | null>(null);
  const [statusF, setStatusF]     = useState('');
  const [catF, setCatF]           = useState('');
  const [search, setSearch]       = useState('');

  const filtered = useMemo(() => tools.filter(tool => {
    if (statusF && tool.status !== statusF) return false;
    if (catF && tool.category !== catF) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(`${tool.name} ${tool.vendor}`.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [tools, statusF, catF, search]);

  function openNew()  { setActive(null); setModalOpen(true); }
  function openTool(t: AiTool) { setActive(t); setModalOpen(true); }
  function close()    { setModalOpen(false); setActive(null); }

  if (loading) return <div className="empty">{t('tools.loading')}</div>;

  return (
    <div>
      <div className="sec-title">{t('tools.title')}</div>
      <div className="sec-sub">{t('tools.sub')}</div>

      {/* Toolbar */}
      <div className="fb" style={{ marginBottom: 16 }}>
        <input placeholder={t('tools.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 180 }} />
        <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ width: 170 }}>
          <option value="">{t('tools.allStatus')}</option>
          {AITOOL_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={catF} onChange={e => setCatF(e.target.value)} style={{ width: 160 }}>
          <option value="">{t('tools.allCategories')}</option>
          {AITOOL_CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
        </select>
        {(statusF || catF || search) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setStatusF(''); setCatF(''); setSearch(''); }}>✕ {t('common.search')}</button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-outline btn-sm" disabled={!filtered.length} onClick={() => exportAiToolsCSV(filtered)}>⬇ {t('common.csv')}</button>
        {isEditor && <button className="btn btn-primary" onClick={openNew}>{t('tools.add')}</button>}
      </div>

      {/* Tabelle */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('tools.colTool')}</th><th>{t('tools.colCategory')}</th><th>{t('tools.colStatus')}</th>
                <th>{t('tools.colDataLoc')}</th><th>{t('tools.colDpa')}</th><th>{t('tools.colReview')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="empty">{t('tools.none')}</td></tr>
              ) : filtered.map(tool => (
                <tr key={tool.id} className="clickable" onClick={() => openTool(tool)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{tool.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{tool.vendor || '—'} · {tool.id}</div>
                  </td>
                  <td>{tool.category}</td>
                  <td><span className={`badge ${AITOOL_STATUS_CSS[tool.status] ?? 'bgr'}`}>{tool.status}</span></td>
                  <td>{tool.dataLocation}</td>
                  <td>{tool.dpa ? '✓' : '—'}</td>
                  <td>
                    {tool.reviewDate ? new Date(tool.reviewDate).toLocaleDateString('de-DE') : '—'}
                    {reviewOverdue(tool.reviewDate) && <span className="badge br" style={{ marginLeft: 6 }}>{t('tools.reviewDue')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
        {filtered.length !== tools.length ? t('tools.totalOf', { n: filtered.length, m: tools.length }) : t('tools.totalAll', { n: tools.length })}
      </div>

      <AiToolModal open={modalOpen} tool={active} onClose={close} />
    </div>
  );
}
