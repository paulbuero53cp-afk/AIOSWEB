// ─────────────────────────────────────────────────────────────
//  EditModal — UC-Detail-Ansicht + Artefakt-Status
//  Modus "view": Übersicht mit Artefakt-Kacheln (analog Screenshot)
//  Modus "edit": UcForm mit gewähltem Tab
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { useUseCases } from '@/hooks/useUseCases';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import UcForm, { MC_LABELS } from './UcForm';
import type { UseCase } from '@/types';

// ── Score-Punkte ──────────────────────────────────────────────
function ScoreDots({ score, color }: { score: number; color: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{
          width: 11, height: 11, borderRadius: '50%',
          background: i <= score ? color : 'var(--border)',
          display: 'inline-block', flexShrink: 0,
        }} />
      ))}
    </span>
  );
}

// ── Meta-Chip ─────────────────────────────────────────────────
function Chip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', marginBottom: 4 }}>
        {label}
      </div>
      <span className="badge" style={color ? { background: color, color: '#fff', border: 'none' } : undefined}>
        {value}
      </span>
    </div>
  );
}

// ── Artefakt-Kachel ───────────────────────────────────────────
function ArtCard({
  label, exists, onOpen,
}: { label: string; exists: boolean; onOpen: () => void }) {
  return (
    <div style={{
      border: `1.5px solid ${exists ? 'var(--green)' : 'var(--border)'}`,
      borderRadius: 10, padding: '14px 16px',
      background: exists ? 'var(--green-bg, #f0faf4)' : 'var(--surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 8,
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 12, color: exists ? 'var(--green)' : 'var(--muted)', marginTop: 2 }}>
          {exists ? 'Vorhanden' : 'Ausstehend'}
        </div>
      </div>
      <button
        className={exists ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'}
        style={{ fontSize: 12, whiteSpace: 'nowrap' }}
        onClick={onOpen}
      >
        {exists ? 'Öffnen ›' : 'Starten ›'}
      </button>
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────
interface EditModalProps {
  uc: UseCase | null;
  onClose: () => void;
  artStatus?: Record<string, string[]>;
  onNavToArt?: (screen: string, ucId: string) => void;
}

export default function EditModal({ uc, onClose, artStatus, onNavToArt }: EditModalProps) {
  const { updateUC } = useUseCases();
  const { showToast } = useToast();
  const { isApprover } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode]     = useState<'view' | 'edit'>('view');
  const [editTab, setEditTab] = useState(0);

  // Reset to detail view whenever a different UC is opened
  useEffect(() => { setMode('view'); }, [uc?.id]);

  // ── Submit (aus UcForm) ───────────────────────────────────────
  async function handleSubmit(data: Partial<UseCase>) {
    if (!uc) return;
    setSubmitting(true);
    try {
      await updateUC(uc.id, data);
      showToast(`✓ ${uc.title} gespeichert`, 'success');
      setMode('view');
    } catch (err) {
      showToast(`Fehler: ${String(err)}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Freigeben ─────────────────────────────────────────────────
  async function handleApprove() {
    if (!uc) return;
    try {
      await updateUC(uc.id, { app: 'Approved' });
      showToast(`✓ ${uc.title} freigegeben`, 'success');
      onClose();
    } catch (err) {
      showToast(`Fehler: ${String(err)}`, 'error');
    }
  }

  function openEditTab(tab: number) {
    setEditTab(tab);
    setMode('edit');
  }

  if (!uc) return null;

  const ucArts = artStatus?.[uc.id] ?? [];
  const mcDone = uc.mc.filter(Boolean).length;
  const mcTotal = MC_LABELS.length;

  // Governance-Tier Farbe
  const tierColor: Record<string, string> = {
    '1': 'var(--green)', '2': 'var(--yellow)', '3': 'var(--red)',
  };
  const appColor: Record<string, string> = {
    'Approved': 'var(--green)', 'Rejected': 'var(--red)',
    'Pending': 'var(--yellow)', 'Not required': 'var(--muted)',
  };

  // ── Modaltitel ────────────────────────────────────────────────
  const title = `${uc.title} – ${uc.id}`;

  return (
    <Modal open={true} title={title} onClose={onClose} wide>
      {mode === 'view' ? (
        // ── DETAIL-ANSICHT ───────────────────────────────────────
        <div>
          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 20px', marginBottom: 18 }}>
            <Chip label="Governance-Tier" value={`Tier ${uc.tier}`} color={tierColor[uc.tier]} />
            <Chip label="Risk Tier" value={uc.rt} color={uc.rt === 'High' ? 'var(--red)' : uc.rt === 'Medium' ? 'var(--orange, #e09a00)' : 'var(--green)'} />
            <Chip label="Entscheidungen" value={uc.rev === 'yes' ? 'Reversibel' : 'Irreversibel'} />
            <Chip label="Approval" value={uc.app} color={appColor[uc.app]} />
            <Chip label="Lifecycle" value={uc.lc} />
            <Chip label="Portfolio" value={uc.pd} />
          </div>

          {/* Scores */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', marginBottom: 8 }}>
              Scores
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Value</span>
                <ScoreDots score={uc.vs} color="var(--green)" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Feasibility</span>
                <ScoreDots score={uc.fs} color="var(--petrol)" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Risk</span>
                <ScoreDots score={uc.rs} color="var(--red)" />
              </div>
            </div>
          </div>

          {/* Minimum Checks */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', marginBottom: 8 }}>
              Minimum Checks ({mcDone}/{mcTotal})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {MC_LABELS.map((lbl, i) => {
                const done = uc.mc[i] ?? false;
                const short = lbl.split(' - ')[0]; // "MC01"
                const rest  = lbl.split(' - ').slice(1).join(' - ');
                return (
                  <span
                    key={i}
                    title={lbl}
                    style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 20,
                      background: done ? 'var(--green-bg, #f0faf4)' : 'var(--bg)',
                      color: done ? 'var(--green)' : 'var(--muted)',
                      border: `1px solid ${done ? 'var(--green)' : 'var(--border)'}`,
                      cursor: 'default',
                    }}
                  >
                    {done ? 'ok ' : '— '}{short} {rest.split(' ').slice(0, 2).join(' ')}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Beschreibung */}
          {uc.desc && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', marginBottom: 6 }}>
                Beschreibung
              </div>
              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
                {uc.desc}
              </p>
            </div>
          )}

          {/* Governance-Artefakte */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', marginBottom: 10 }}>
              Governance-Artefakte
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ArtCard
                label="Risk Assessment"
                exists={ucArts.includes('ra')}
                onOpen={() => onNavToArt?.('riskassess', uc.id)}
              />
              <ArtCard
                label="Gate-Checklisten"
                exists={ucArts.includes('gc')}
                onOpen={() => onNavToArt?.('gatechecks', uc.id)}
              />
              <ArtCard
                label="Business Case"
                exists={ucArts.includes('bc')}
                onOpen={() => onNavToArt?.('bizcases', uc.id)}
              />
              <ArtCard
                label={`DSFA${ucArts.includes('dsfa') ? '' : ' (Ausstehend)'}`}
                exists={ucArts.includes('dsfa')}
                onOpen={() => onNavToArt?.('dsfa', uc.id)}
              />
            </div>
          </div>

          {/* Footer-Buttons */}
          <div style={{
            display: 'flex', gap: 8, marginTop: 20, paddingTop: 14,
            borderTop: '1px solid var(--border)', flexWrap: 'wrap',
          }}>
            <button className="btn btn-outline" onClick={onClose}>
              Schliessen
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => openEditTab(0)}>
              ✎ Stammdaten
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => openEditTab(1)}>
              ✎ Bewertung
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => openEditTab(2)}>
              ✎ Governance
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => openEditTab(3)}>
              ✎ Reliabilität
            </button>
            {isApprover && uc.app === 'Pending' && (
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleApprove}>
                Freigeben
              </button>
            )}
          </div>
        </div>
      ) : (
        // ── EDIT-ANSICHT ─────────────────────────────────────────
        <UcForm
          key={`${uc.id}-${editTab}`}
          defaultValues={uc}
          onSubmit={handleSubmit}
          onCancel={() => setMode('view')}
          submitLabel="Änderungen speichern"
          isSubmitting={submitting}
          initialTab={editTab}
        />
      )}
    </Modal>
  );
}
