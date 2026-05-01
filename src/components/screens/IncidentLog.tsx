import { useState } from 'react';
import { useIncidents } from '@/hooks/useIncidents';
import { useUseCases } from '@/hooks/useUseCases';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/common/Modal';
import type { Incident } from '@/types';

// ── Incident-Formular-State ───────────────────────────────────
interface IncidentFormState {
  ucid: string; type: string; sev: string;
  st: string; desc: string; act: string; date: string;
}

const EMPTY_FORM: IncidentFormState = {
  ucid: '', type: 'Incident', sev: 'Low',
  st: 'Open', desc: '', act: '', date: new Date().toISOString().split('T')[0],
};

function incidentToForm(inc: Incident): IncidentFormState {
  return {
    ucid: inc.ucid,
    type: inc.type,
    sev:  inc.sev,
    st:   inc.st,
    desc: inc.desc,
    act:  inc.act,
    date: inc.date?.split('T')[0] ?? '',
  };
}

// ── Incident-Modal ────────────────────────────────────────────
function IncidentModal({
  open, initial, editId, onClose,
}: {
  open: boolean;
  initial?: Incident | null;
  editId?: string;
  onClose: () => void;
}) {
  const { useCases } = useUseCases();
  const { createIncident, updateIncident } = useIncidents();
  const { showToast } = useToast();

  const [form, setForm] = useState<IncidentFormState>(
    initial ? incidentToForm(initial) : EMPTY_FORM,
  );
  const [submitting, setSubmitting] = useState(false);

  function set(key: keyof IncidentFormState, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    if (!form.ucid) { showToast('Bitte Use Case auswählen', 'error'); return; }
    if (!form.desc.trim()) { showToast('Beschreibung ist Pflichtfeld', 'error'); return; }
    setSubmitting(true);
    try {
      if (editId) {
        await updateIncident(editId, form as Partial<Incident>);
        showToast('Incident aktualisiert', 'success');
      } else {
        await createIncident(form as Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>);
        showToast('✓ Incident erfasst', 'success');
      }
      onClose();
    } catch (err) {
      showToast(`Fehler: ${String(err)}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const label = (t: string) => (
    <label className="fl" style={{ marginBottom: 4 }}>{t}</label>
  );
  const sel = (key: keyof IncidentFormState, opts: string[]) => (
    <select value={form[key]} onChange={e => set(key, e.target.value)}>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <Modal
      open={open}
      title={editId ? 'Incident bearbeiten' : 'Neuer Incident'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Speichert…' : editId ? 'Speichern' : 'Incident erfassen'}
          </button>
        </>
      }
    >
      <div className="fg">
        {/* Use Case */}
        <div className="fgroup full">
          {label('Use Case *')}
          <select value={form.ucid} onChange={e => set('ucid', e.target.value)}>
            <option value="">— Use Case wählen —</option>
            {useCases.map(uc => (
              <option key={uc.id} value={uc.id}>{uc.id} — {uc.title}</option>
            ))}
          </select>
        </div>

        {/* Typ + Schweregrad */}
        <div className="fgroup">
          {label('Typ')}
          {sel('type', ['Incident', 'Deviation', 'Near Miss'])}
        </div>
        <div className="fgroup">
          {label('Schweregrad')}
          {sel('sev', ['Low', 'Medium', 'High'])}
        </div>

        {/* Status + Datum */}
        <div className="fgroup">
          {label('Status')}
          {sel('st', ['Open', 'In Progress', 'Resolved'])}
        </div>
        <div className="fgroup">
          {label('Datum des Vorfalls')}
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>

        {/* Beschreibung */}
        <div className="fgroup full">
          {label('Beschreibung *')}
          <textarea
            rows={3}
            value={form.desc}
            onChange={e => set('desc', e.target.value)}
            placeholder="Was ist passiert?"
          />
        </div>

        {/* Maßnahmen */}
        <div className="fgroup full">
          {label('Ergriffene Maßnahmen')}
          <textarea
            rows={2}
            value={form.act}
            onChange={e => set('act', e.target.value)}
            placeholder="Welche Maßnahmen wurden eingeleitet?"
          />
        </div>
      </div>
    </Modal>
  );
}

// ── Schweregrad → CSS ─────────────────────────────────────────
const SEV_CSS: Record<string, string> = {
  High: 'br', Medium: 'by', Low: 'bg',
};

// ── Incident-Karte ────────────────────────────────────────────
function IncCard({
  inc, ucTitle, onEdit, isEditor,
}: {
  inc: Incident; ucTitle: string; onEdit: () => void; isEditor: boolean;
}) {
  return (
    <div
      className="inc-card"
      onClick={isEditor ? onEdit : undefined}
      style={isEditor ? { cursor: 'pointer' } : undefined}
    >
      <div className="inc-card-head">
        <span className={`badge ${SEV_CSS[inc.sev] ?? 'bgr'}`}>{inc.sev}</span>
        <span className="badge bgr" style={{ fontSize: 10 }}>{inc.type}</span>
        <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>
          {inc.id}
        </span>
      </div>
      <div className="inc-card-title">{ucTitle}</div>
      <div className="inc-card-desc">{inc.desc}</div>
      {inc.date && (
        <div className="inc-card-meta" style={{ marginTop: 6 }}>
          {new Date(inc.date).toLocaleDateString('de-DE')}
        </div>
      )}
    </div>
  );
}

// ── Incident Log ──────────────────────────────────────────────
export default function IncidentLog() {
  const { incidents, loading } = useIncidents();
  const { useCases }           = useUseCases();
  const { isEditor }           = useAuth();

  const [modalOpen, setModalOpen]  = useState(false);
  const [editInc,   setEditInc]    = useState<Incident | null>(null);

  function ucTitle(ucid: string) {
    const uc = useCases.find(u => u.id === ucid);
    return uc ? `${uc.id} — ${uc.title}` : ucid;
  }

  function openEdit(inc: Incident) {
    setEditInc(inc);
    setModalOpen(true);
  }

  function openNew() {
    setEditInc(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditInc(null);
  }

  const colDef: { key: Incident['st']; label: string; css: string }[] = [
    { key: 'Open',        label: 'Open',        css: 'open' },
    { key: 'In Progress', label: 'In Progress',  css: 'prog' },
    { key: 'Resolved',    label: 'Resolved',     css: 'done' },
  ];

  if (loading) return <div className="empty">Lade Incidents…</div>;

  return (
    <div>
      {/* Topbar-Aktion */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {isEditor && (
          <button className="btn btn-primary" onClick={openNew}>
            ⚠️ Incident melden
          </button>
        )}
      </div>

      {/* Kanban */}
      <div className="ib">
        {colDef.map(col => {
          const colItems = incidents.filter(i => i.st === col.key);
          return (
            <div key={col.key} className="ib-col">
              <div className={`ib-head ${col.css}`}>
                <span>{col.label}</span>
                <span className={`badge ${col.css === 'open' ? 'br' : col.css === 'prog' ? 'by' : 'bg'}`}>
                  {colItems.length}
                </span>
              </div>
              <div className="ib-body">
                {colItems.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: 8 }}>
                    Keine Einträge
                  </div>
                ) : (
                  colItems.map(inc => (
                    <IncCard
                      key={inc.id}
                      inc={inc}
                      ucTitle={ucTitle(inc.ucid)}
                      isEditor={isEditor}
                      onEdit={() => openEdit(inc)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
        Gesamt: {incidents.length} Incidents
      </div>

      {/* Modal */}
      <IncidentModal
        open={modalOpen}
        initial={editInc}
        editId={editInc?.id}
        onClose={closeModal}
      />
    </div>
  );
}
