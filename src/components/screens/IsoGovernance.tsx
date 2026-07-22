// ─────────────────────────────────────────────────────────────
//  AIOS — ISO 42001 Governance
//  Fragenkatalog, Antworten/Reifegrad, Visual Reports, Management
//  Report und CSV-Import. Portiert aus der STOCKMEIER-Standalone-
//  Import-App (Logik: progress()-Score, Status/Reifegrad-Modell).
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useIsoQuestions, useIsoAnswers } from '@/hooks/useIso';
import { useUseCases } from '@/hooks/useUseCases';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/common/Modal';
import { parseCsv, readFileAsText } from '@/lib/csv';
import type { IsoQuestion, IsoAnswer, IsoAnswerStatus } from '@/types';

type Tab = 'dashboard' | 'catalog' | 'visuals' | 'report' | 'import';

const STATUSES: IsoAnswerStatus[] = ['Offen', 'In Bearbeitung', 'Beantwortet', 'Risiko'];
const STATUS_COLOR: Record<string, string> = {
  'Offen': '#94a3b8', 'In Bearbeitung': '#e8a020', 'Beantwortet': '#2eaa6e', 'Risiko': '#d94040',
};

const DEFAULT_ANSWER: IsoAnswer = {
  questionId: '', status: 'Offen', maturity: 0, answer: '', evidence: '',
  actions: '', owner: '', due: '', usecases: [],
};

function answerFor(id: string, answers: IsoAnswer[]): IsoAnswer {
  return answers.find(a => a.questionId === id) ?? { ...DEFAULT_ANSWER, questionId: id };
}

function progress(a: IsoAnswer): number {
  let p = 0;
  if (a.status === 'Beantwortet') p += 42;
  if (a.status === 'In Bearbeitung') p += 18;
  if (a.status === 'Risiko') p += 20;
  if (a.answer) p += 20;
  if (a.evidence) p += 15;
  if (a.owner) p += 10;
  if (a.usecases?.length) p += 10;
  if (a.actions) p += 5;
  return Math.min(100, p);
}

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? '#94a3b8';
  return (
    <span style={{
      display: 'inline-block', background: color + '22', color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700,
    }}>
      {status}
    </span>
  );
}

function ProgressBar({ pct, color = 'var(--accent)' }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 3 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .2s' }} />
    </div>
  );
}

// ── Dist-Karte (analog Reports.tsx) ───────────────────────────
function Dist({ title, order, counts, total, colors }: {
  title: string; order: string[]; counts: Record<string, number>; total: number; colors?: Record<string, string>;
}) {
  return (
    <div className="card">
      <div className="ch"><span className="ch-title">{title}</span></div>
      <div style={{ padding: '6px 16px 10px' }}>
        {order.map(label => {
          const n = counts[label] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <div key={label} style={{ padding: '5px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: 'var(--muted)' }}>{label}</span>
                <strong>{n}<span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {pct}%</span></strong>
              </div>
              <ProgressBar pct={pct} color={colors?.[label] ?? 'var(--accent)'} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Domain-Burn-up (gestapelter Balken: beantwortet/risiko/offen) ──
function DomainBurnup({ domains }: {
  domains: { label: string; total: number; done: number; risk: number; avg: number }[];
}) {
  return (
    <div className="card">
      <div className="ch"><span className="ch-title">Domain-Fortschritt (beantwortet / Risiko / offen)</span></div>
      <div style={{ padding: '10px 16px' }}>
        {domains.map(d => {
          const open = Math.max(0, d.total - d.done - d.risk);
          return (
            <div key={d.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{d.label}</span>
                <span style={{ color: 'var(--muted)' }}>{d.total} Fragen · Ø {d.avg}%</span>
              </div>
              <div style={{ display: 'flex', height: 10, borderRadius: 4, overflow: 'hidden', background: 'var(--surface2)' }}>
                {d.done > 0 && <div style={{ width: `${d.done / d.total * 100}%`, background: STATUS_COLOR['Beantwortet'] }} title={`${d.done} beantwortet`} />}
                {d.risk > 0 && <div style={{ width: `${d.risk / d.total * 100}%`, background: STATUS_COLOR['Risiko'] }} title={`${d.risk} Risiko`} />}
                {open > 0 && <div style={{ width: `${open / d.total * 100}%`, background: 'var(--surface2)' }} title={`${open} offen`} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Antwort-Bearbeiten-Modal ───────────────────────────────────
function AnswerModal({
  question, answer, useCaseOptions, onClose, onSave,
}: {
  question: IsoQuestion | null;
  answer: IsoAnswer;
  useCaseOptions: { id: string; title: string }[];
  onClose: () => void;
  onSave: (patch: Partial<IsoAnswer>) => Promise<void>;
}) {
  const [status, setStatus] = useState<IsoAnswerStatus>(answer.status);
  const [maturity, setMaturity] = useState(answer.maturity);
  const [owner, setOwner] = useState(answer.owner);
  const [due, setDue] = useState(answer.due?.slice(0, 10) ?? '');
  const [selectedUcs, setSelectedUcs] = useState<Set<string>>(new Set(answer.usecases));
  const [answerText, setAnswerText] = useState(answer.answer);
  const [evidence, setEvidence] = useState(answer.evidence);
  const [actions, setActions] = useState(answer.actions);
  const [saving, setSaving] = useState(false);

  if (!question) return null;

  function toggleUc(id: string) {
    setSelectedUcs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        status, maturity, owner, due, answer: answerText, evidence, actions,
        usecases: [...selectedUcs],
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={true} title={`${question.id} — ${question.domain}`} onClose={onClose} wide>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
          {question.section}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{question.question}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <div>
          <label className="fl">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as IsoAnswerStatus)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="fl">Reifegrad (0-5)</label>
          <select value={maturity} onChange={e => setMaturity(Number(e.target.value))}>
            {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="fl">Verantwortlich</label>
          <input value={owner} onChange={e => setOwner(e.target.value)} />
        </div>
        <div>
          <label className="fl">Fällig am</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="fl">Verknüpfte Use Cases</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
          {useCaseOptions.length === 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Keine Use Cases vorhanden.</span>}
          {useCaseOptions.map(u => {
            const sel = selectedUcs.has(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleUc(u.id)}
                className={`btn btn-sm ${sel ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 11 }}
                title={u.title}
              >
                {u.id}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10, marginBottom: 4 }}>
        <div>
          <label className="fl">Antwort</label>
          <textarea rows={2} value={answerText} onChange={e => setAnswerText(e.target.value)} />
        </div>
        <div>
          <label className="fl">Evidenz</label>
          <textarea rows={2} value={evidence} onChange={e => setEvidence(e.target.value)} />
        </div>
        <div>
          <label className="fl">Maßnahmen</label>
          <textarea rows={2} value={actions} onChange={e => setActions(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-outline" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </Modal>
  );
}

// ── Import-Tab ──────────────────────────────────────────────────
function ImportPanel() {
  const { importQuestions } = useIsoQuestions();
  const { importAnswers } = useIsoAnswers();
  const { showToast } = useToast();
  const [busyQ, setBusyQ] = useState(false);
  const [busyA, setBusyA] = useState(false);

  async function handleQuestionsFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusyQ(true);
    try {
      const text = await readFileAsText(file);
      const rows = parseCsv(text).map(r => ({
        id: r.id, domain: r.domain, section: r.section,
        question: r.question, source: r.source, priority: r.priority || 'Mittel',
      })).filter(r => r.id);
      const result = await importQuestions(rows);
      showToast(`✓ ${result.imported} neu, ${result.updated} aktualisiert`, 'success');
    } catch (err) {
      showToast(`Import fehlgeschlagen: ${String(err)}`, 'error');
    } finally {
      setBusyQ(false);
    }
  }

  async function handleAnswersFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusyA(true);
    try {
      const text = await readFileAsText(file);
      const rows = parseCsv(text).map(r => ({
        questionId: r.questionId || r.id,
        answer: r.answer, maturity: Number(r.maturity) || 0,
        evidence: r.evidence, actions: r.actions, owner: r.owner,
        status: (r.status || 'Beantwortet') as IsoAnswerStatus,
        due: r.due,
        usecases: (r.usecases || '').split(',').map(x => x.trim()).filter(Boolean),
      })).filter(r => r.questionId);
      const result = await importAnswers(rows);
      showToast(`✓ ${result.imported} neu, ${result.updated} aktualisiert`, 'success');
    } catch (err) {
      showToast(`Import fehlgeschlagen: ${String(err)}`, 'error');
    } finally {
      setBusyA(false);
    }
  }

  return (
    <div className="grid cols2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div className="card" style={{ padding: 16 }}>
        <div className="ch-title" style={{ marginBottom: 8 }}>Fragenkatalog importieren</div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
          CSV-Spalten: <code>id;domain;section;question;source;priority</code>
        </p>
        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
          {busyQ ? 'Importiere…' : '📄 Fragen-CSV wählen'}
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleQuestionsFile} disabled={busyQ} />
        </label>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div className="ch-title" style={{ marginBottom: 8 }}>Antworten importieren</div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
          CSV-Spalten: <code>questionId;answer;maturity;evidence;actions;owner;status;due;usecases</code>
        </p>
        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
          {busyA ? 'Importiere…' : '📄 Antworten-CSV wählen'}
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleAnswersFile} disabled={busyA} />
        </label>
      </div>
    </div>
  );
}

// ── Hauptkomponente ─────────────────────────────────────────────
export default function IsoGovernance() {
  const { questions, loading: qLoading } = useIsoQuestions();
  const { answers, saveAnswer } = useIsoAnswers();
  const { useCases } = useUseCases();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editQ, setEditQ] = useState<IsoQuestion | null>(null);

  const domains = useMemo(() => [...new Set(questions.map(q => q.domain))], [questions]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return questions.filter(q => {
      const a = answerFor(q.id, answers);
      if (domainFilter && q.domain !== domainFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (s && !`${q.id} ${q.question} ${q.section}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [questions, answers, search, domainFilter, statusFilter]);

  // ── Kennzahlen ──────────────────────────────────────────────
  const total = questions.length;
  const done  = questions.filter(q => answerFor(q.id, answers).status === 'Beantwortet').length;
  const risk  = questions.filter(q => answerFor(q.id, answers).status === 'Risiko').length;
  const avgProgress = total ? Math.round(questions.reduce((sum, q) => sum + progress(answerFor(q.id, answers)), 0) / total) : 0;

  const statusCounts = STATUSES.reduce((m, s) => {
    m[s] = questions.filter(q => answerFor(q.id, answers).status === s).length;
    return m;
  }, {} as Record<string, number>);

  const maturityCounts = [0, 1, 2, 3, 4, 5].reduce((m, n) => {
    m[String(n)] = questions.filter(q => answerFor(q.id, answers).maturity === n).length;
    return m;
  }, {} as Record<string, number>);

  const domainStats = useMemo(() => domains.map(d => {
    const qs = questions.filter(q => q.domain === d);
    const doneN = qs.filter(q => answerFor(q.id, answers).status === 'Beantwortet').length;
    const riskN = qs.filter(q => answerFor(q.id, answers).status === 'Risiko').length;
    const avg = qs.length ? Math.round(qs.reduce((sum, q) => sum + progress(answerFor(q.id, answers)), 0) / qs.length) : 0;
    return { label: d, total: qs.length, done: doneN, risk: riskN, avg };
  }), [domains, questions, answers]);

  const notStarted = domainStats.filter(d => d.avg < 10);

  const ucLinkCounts = useMemo(() => {
    const m: Record<string, number> = {};
    answers.forEach(a => a.usecases.forEach(id => { m[id] = (m[id] ?? 0) + 1; }));
    return Object.entries(m)
      .map(([id, n]) => ({ id, title: useCases.find(u => u.id === id)?.title ?? id, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 10);
  }, [answers, useCases]);

  const openActions = useMemo(() =>
    answers
      .filter(a => a.actions && a.status !== 'Beantwortet')
      .map(a => ({ ...a, question: questions.find(q => q.id === a.questionId) }))
      .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')),
  [answers, questions]);

  async function handleSaveAnswer(patch: Partial<IsoAnswer>) {
    if (!editQ) return;
    await saveAnswer(editQ.id, patch);
  }

  if (qLoading) return <div className="empty">Lade ISO-42001-Fragenkatalog…</div>;

  const tabBtn = (id: Tab, label: string) => (
    <div className={`tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>{label}</div>
  );

  return (
    <div>
      <div className="sec-title">ISO 42001 Governance</div>
      <div className="sec-sub">KI-Managementsystem-Assessment — Fragenkatalog, Reifegrad, Visual Reports</div>

      <div className="tabs">
        {tabBtn('dashboard', 'Dashboard')}
        {tabBtn('catalog', 'Fragenkatalog')}
        {tabBtn('visuals', 'Visual Reports')}
        {tabBtn('report', 'Management Report')}
        {isAdmin && tabBtn('import', 'Import')}
      </div>

      {total === 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 14, marginBottom: 6, color: 'var(--text)', fontWeight: 600 }}>Noch kein Fragenkatalog importiert</div>
          <div style={{ fontSize: 13 }}>
            {isAdmin ? 'Wechsle in den Tab "Import" und lade den Fragenkatalog (CSV) hoch.' : 'Bitte wende dich an einen Admin, um den ISO-42001-Fragenkatalog zu importieren.'}
          </div>
        </div>
      )}

      {total > 0 && tab === 'dashboard' && (
        <div>
          <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
            <div className="kc"><div className="kc-label">Fragen</div><div className="kc-value">{total}</div></div>
            <div className="kc green"><div className="kc-label">Beantwortet</div><div className="kc-value">{done}</div></div>
            <div className={`kc ${risk > 0 ? 'red' : 'green'}`}><div className="kc-label">Risiken</div><div className="kc-value">{risk}</div></div>
            <div className="kc"><div className="kc-label">Ø Fortschritt</div><div className="kc-value">{avgProgress}%</div></div>
          </div>

          {notStarted.length > 0 && (
            <div style={{ background: '#fff7f0', border: '1px solid #fcd0a0', borderRadius: 10, padding: '14px 18px', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--petrol)', marginBottom: 6 }}>
                ⚠ Kritische Lücken — noch nicht begonnen
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                {notStarted.map(d => d.label).join(' · ')}
              </div>
            </div>
          )}

          <DomainBurnup domains={domainStats} />

          {openActions.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="ch"><span className="ch-title">Offene Maßnahmen ({openActions.length})</span></div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Frage</th><th>Maßnahme</th><th>Verantwortlich</th><th>Fällig</th><th>Status</th></tr></thead>
                  <tbody>
                    {openActions.slice(0, 15).map(a => (
                      <tr key={a.questionId}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.questionId}</td>
                        <td style={{ fontSize: 12, maxWidth: 320 }}>{a.actions}</td>
                        <td style={{ fontSize: 12 }}>{a.owner || '—'}</td>
                        <td style={{ fontSize: 12 }}>{a.due || '—'}</td>
                        <td><StatusPill status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {total > 0 && tab === 'catalog' && (
        <div>
          <div className="fb" style={{ marginBottom: 14 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suche…" style={{ flex: 1, minWidth: 180 }} />
            <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)} style={{ width: 220 }}>
              <option value="">Alle Domänen</option>
              {domains.map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
              <option value="">Alle Status</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{filtered.length} von {total} Fragen</div>
          <div className="card" style={{ overflow: 'auto' }}>
            <table>
              <thead>
                <tr><th>ID</th><th>Frage</th><th>Status</th><th>Reifegrad</th><th>Owner</th><th>Fortschritt</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="empty">Keine Treffer.</td></tr>
                ) : filtered.map(q => {
                  const a = answerFor(q.id, answers);
                  const p = progress(a);
                  return (
                    <tr key={q.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{q.id}</td>
                      <td style={{ maxWidth: 380 }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>{q.domain} · {q.section}</div>
                        <div style={{ fontSize: 13 }}>{q.question}</div>
                      </td>
                      <td><StatusPill status={a.status} /></td>
                      <td style={{ fontSize: 13 }}>{a.maturity}/5</td>
                      <td style={{ fontSize: 12 }}>{a.owner || '—'}</td>
                      <td style={{ width: 100 }}><ProgressBar pct={p} /></td>
                      <td><button className="btn btn-outline btn-sm" onClick={() => setEditQ(q)}>Bearbeiten</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > 0 && tab === 'visuals' && (
        <div>
          <div className="gg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Dist title="Status-Verteilung" order={STATUSES} counts={statusCounts} total={total} colors={STATUS_COLOR} />
            <Dist title="Reifegrad-Verteilung" order={['0', '1', '2', '3', '4', '5']} counts={maturityCounts} total={total} />
          </div>
          <DomainBurnup domains={domainStats} />
          <div className="card" style={{ marginTop: 14 }}>
            <div className="ch"><span className="ch-title">Top Use Cases nach ISO-Verknüpfungen</span></div>
            <div style={{ padding: '6px 16px 10px' }}>
              {ucLinkCounts.length === 0 ? (
                <div className="empty">Noch keine Use Cases verknüpft.</div>
              ) : ucLinkCounts.map(u => {
                const max = ucLinkCounts[0]?.n || 1;
                const pct = Math.round((u.n / max) * 100);
                return (
                  <div key={u.id} style={{ padding: '5px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                      <span>{u.id} · {u.title}</span>
                      <strong>{u.n}</strong>
                    </div>
                    <ProgressBar pct={pct} color="var(--petrol)" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {total > 0 && tab === 'report' && (
        <div>
          <div className="fb" style={{ marginBottom: 14 }}>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨 Als PDF drucken</button>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <h1 style={{ fontSize: 20, color: 'var(--petrol)', marginTop: 0 }}>ISO 42001 Management Report</h1>
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>Stand: {new Date().toLocaleString('de-DE')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, margin: '16px 0' }}>
              <div className="kc"><div className="kc-label">Fragen</div><div className="kc-value">{total}</div></div>
              <div className="kc green"><div className="kc-label">Beantwortet</div><div className="kc-value">{done}</div></div>
              <div className={`kc ${risk > 0 ? 'red' : 'green'}`}><div className="kc-label">Risiken</div><div className="kc-value">{risk}</div></div>
              <div className="kc"><div className="kc-label">Ø Fortschritt</div><div className="kc-value">{avgProgress}%</div></div>
            </div>
            <h2 style={{ fontSize: 15, color: 'var(--petrol)' }}>Domain-Fortschritt</h2>
            <table>
              <thead><tr><th>Domäne</th><th>Fragen</th><th>Beantwortet</th><th>Risiken</th><th>Ø Fortschritt</th></tr></thead>
              <tbody>
                {domainStats.map(d => (
                  <tr key={d.label}><td>{d.label}</td><td>{d.total}</td><td>{d.done}</td><td>{d.risk}</td><td>{d.avg}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdmin && tab === 'import' && <ImportPanel />}

      <AnswerModal
        question={editQ}
        answer={editQ ? answerFor(editQ.id, answers) : DEFAULT_ANSWER}
        useCaseOptions={useCases.map(u => ({ id: u.id, title: u.title }))}
        onClose={() => setEditQ(null)}
        onSave={handleSaveAnswer}
      />
    </div>
  );
}
