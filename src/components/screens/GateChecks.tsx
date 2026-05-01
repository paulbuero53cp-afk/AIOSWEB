import { useState, useEffect, useCallback } from 'react';
import { useArtefakt } from '@/hooks/useArtefakt';
import { useToast } from '@/context/ToastContext';
import { ArtHeader } from '@/components/common/ArtHeader';
import { GATES } from '@/lib/constants';
import type { GateChecks } from '@/types';

// ── Fortschrittsbalken ────────────────────────────────────────
function ProgressBar({ done, total, color }: { done: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{done}/{total} Punkte</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
        <div style={{
          width: `${pct}%`, height: 6, borderRadius: 3,
          background: pct === 100 ? 'var(--green)' : color,
          transition: 'width .3s ease',
        }} />
      </div>
    </div>
  );
}

// ── Gate-Panel ────────────────────────────────────────────────
function GatePanel({
  gateKey, data, onChange,
}: {
  gateKey: keyof typeof GATES;
  data: Record<string, unknown>;
  onChange: (key: string, val: boolean) => void;
}) {
  const gate = GATES[gateKey];
  const done  = gate.items.filter(i => Boolean(data[i.key])).length;
  const total = gate.items.length;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="ch">
        <span className="ch-title">{gate.name}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{gate.desc}</span>
      </div>
      <div style={{ padding: '0 20px 8px' }}>
        <div style={{ padding: '12px 0 14px' }}>
          <ProgressBar done={done} total={total} color={gate.color} />
        </div>
        {gate.items.map(item => (
          <label
            key={item.key}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              marginBottom: 10, cursor: 'pointer', fontSize: 13,
              paddingBottom: 10, borderBottom: '1px solid var(--border)',
            }}
          >
            <input
              type="checkbox"
              checked={Boolean(data[item.key])}
              onChange={e => onChange(item.key, e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span style={{ color: data[item.key] ? 'var(--muted)' : 'var(--text)' }}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Gate-Checks Screen ────────────────────────────────────────
export default function GateChecksScreen() {
  const [ucId,   setUcId]   = useState('');
  const [dirty,  setDirty]  = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const { data, loading, save } = useArtefakt<Partial<GateChecks>>('gc', ucId || null);
  const [local, setLocal] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!loading) { setLocal(data as Record<string, unknown>); setDirty(false); }
  }, [data, loading, ucId]);

  const set = useCallback((key: string, val: boolean) => {
    setLocal(l => ({ ...l, [key]: val }));
    setDirty(true);
  }, []);

  // Gesamt-Fortschritt
  const allItems = [
    ...GATES.A.items, ...GATES.B.items, ...GATES.C.items,
  ];
  const totalDone  = allItems.filter(i => Boolean(local[i.key])).length;
  const totalCount = allItems.length;

  async function handleSave() {
    if (!ucId) return;
    setSaving(true);
    try {
      await save(local as Partial<GateChecks>);
      setDirty(false);
      showToast('✓ Gate-Checklisten gespeichert', 'success');
    } catch {
      showToast('Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ArtHeader
        title="Gate-Checklisten"
        icon="✓"
        ucId={ucId}
        onUcChange={id => { setUcId(id); setDirty(false); }}
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
      />

      {!ucId ? (
        <div className="empty">Bitte Use Case auswählen.</div>
      ) : loading ? (
        <div className="empty">Lade…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 18, alignItems: 'start' }}>
          {/* Gates */}
          <div>
            {(['A', 'B', 'C'] as const).map(k => (
              <GatePanel key={k} gateKey={k} data={local} onChange={set} />
            ))}
          </div>

          {/* Sidebar-Übersicht */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div className="card">
              <div className="ch"><span className="ch-title">Gesamtfortschritt</span></div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ProgressBar done={totalDone} total={totalCount} color="var(--accent)" />

                {/* Pro Gate */}
                {(['A', 'B', 'C'] as const).map(k => {
                  const gate = GATES[k];
                  const d = gate.items.filter(i => Boolean(local[i.key])).length;
                  return (
                    <div key={k}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: gate.color, marginBottom: 4 }}>
                        {gate.name}
                      </div>
                      <ProgressBar done={d} total={gate.items.length} color={gate.color} />
                    </div>
                  );
                })}

                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                >
                  {saving ? '⏳' : '💾'} Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
