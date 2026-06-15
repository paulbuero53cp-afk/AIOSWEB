import { useState, useEffect, useCallback } from 'react';
import { useArtefakt } from '@/hooks/useArtefakt';
import { useToast } from '@/context/ToastContext';
import { useT } from '@/context/LanguageContext';
import { useUseCases } from '@/hooks/useUseCases';
import { ArtHeader } from '@/components/common/ArtHeader';
import { GATES, GATES_RELIABILITY } from '@/lib/constants';
import { ReliabilityBadge } from '@/components/common/Badge';
import type { GateChecks } from '@/types';

// ── Fortschrittsbalken ────────────────────────────────────────
function ProgressBar({ done, total, color }: { done: number; total: number; color: string }) {
  const t = useT();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{done}/{total} {t('gate.points')}</span>
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

// ── Gate-Panel (generisch) ────────────────────────────────────
type GateDef = {
  name: string;
  desc: string;
  color: string;
  bg?: string;
  items: readonly { key: string; label: string }[];
};

function GatePanel({
  gate, gateKey, data, onChange, badge,
}: {
  gate: GateDef;
  gateKey: string;
  data: Record<string, unknown>;
  onChange: (key: string, val: boolean) => void;
  badge?: React.ReactNode;
}) {
  const t = useT();
  const done  = gate.items.filter(i => Boolean(data[i.key])).length;
  const total = gate.items.length;

  return (
    <div className="card" style={{ marginBottom: 16, borderTop: `3px solid ${gate.color}` }}>
      <div className="ch" style={gate.bg ? { background: gate.bg } : undefined}>
        <div style={{ flex: 1 }}>
          <span className="ch-title">{t(`gate.${gateKey}.name`)}</span>
          {badge && <span style={{ marginLeft: 8 }}>{badge}</span>}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t(`gate.${gateKey}.desc`)}</div>
        </div>
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
              {t(`gate.item.${item.key}`)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Gate-Checks Screen ────────────────────────────────────────
export default function GateChecksScreen({ initialUcId }: { initialUcId?: string } = {}) {
  const [ucId,   setUcId]   = useState(initialUcId ?? '');
  const [dirty,  setDirty]  = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { useCases }   = useUseCases();
  const t              = useT();

  const { data, loading, save } = useArtefakt<Partial<GateChecks>>('gc', ucId || null);
  const [local, setLocal] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!loading) { setLocal(data as Record<string, unknown>); setDirty(false); }
  }, [data, loading, ucId]);

  const set = useCallback((key: string, val: boolean) => {
    setLocal(l => ({ ...l, [key]: val }));
    setDirty(true);
  }, []);

  // ── Reliability-Tier des gewählten UC ───────────────────────
  const selectedUc    = useCases.find(u => u.id === ucId);
  const rlTier        = selectedUc?.rl ?? '';
  const showRlBase    = ['R3', 'R4', 'R5'].includes(rlTier);
  const showRlAgentic = rlTier === 'R5';

  // Gesamt-Fortschritt (Reliability-Items nur wenn zutreffend)
  const allItems = [
    ...GATES.A.items, ...GATES.B.items, ...GATES.C.items,
    ...(showRlBase    ? [...GATES_RELIABILITY.base.items]    : []),
    ...(showRlAgentic ? [...GATES_RELIABILITY.agentic.items] : []),
  ];
  const totalDone  = allItems.filter(i => Boolean(local[i.key])).length;
  const totalCount = allItems.length;

  async function handleSave() {
    if (!ucId) return;
    setSaving(true);
    try {
      await save(local as Partial<GateChecks>);
      setDirty(false);
      showToast(t('gate.savedToast'), 'success');
    } catch {
      showToast(t('gate.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ArtHeader
        title={t('gate.title')}
        icon="✓"
        ucId={ucId}
        onUcChange={id => { setUcId(id); setDirty(false); }}
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
      />

      {!ucId ? (
        <div className="empty">{t('gate.pickUc')}</div>
      ) : loading ? (
        <div className="empty">{t('common.loadingShort')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 18, alignItems: 'start' }}>
          {/* Gates A / B / C */}
          <div>
            {(['A', 'B', 'C'] as const).map(k => (
              <GatePanel key={k} gateKey={k} gate={GATES[k]} data={local} onChange={set} />
            ))}

            {/* Reliability Controls — nur für R3/R4/R5 */}
            {showRlBase && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  margin: '24px 0 12px',
                  paddingTop: 8, borderTop: '2px dashed var(--border)',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--petrol)' }}>
                    {t('gate.relMandatory')}
                  </span>
                  <ReliabilityBadge tier={rlTier} />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {t('gate.activatedBecause', { tier: rlTier })}
                  </span>
                </div>
                <GatePanel
                  gateKey="rlbase"
                  gate={GATES_RELIABILITY.base}
                  data={local}
                  onChange={set}
                />
              </>
            )}

            {/* Agentic Controls — nur für R5 */}
            {showRlAgentic && (
              <GatePanel
                gateKey="rlagentic"
                gate={GATES_RELIABILITY.agentic}
                data={local}
                onChange={set}
                badge={<ReliabilityBadge tier="R5" />}
              />
            )}
          </div>

          {/* Sidebar-Übersicht */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div className="card">
              <div className="ch"><span className="ch-title">{t('gate.totalProgress')}</span></div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ProgressBar done={totalDone} total={totalCount} color="var(--accent)" />

                {/* Pro Gate A/B/C */}
                {(['A', 'B', 'C'] as const).map(k => {
                  const gate = GATES[k];
                  const d = gate.items.filter(i => Boolean(local[i.key])).length;
                  return (
                    <div key={k}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: gate.color, marginBottom: 4 }}>
                        {t(`gate.${k}.name`)}
                      </div>
                      <ProgressBar done={d} total={gate.items.length} color={gate.color} />
                    </div>
                  );
                })}

                {/* Reliability Controls (nur wenn zutreffend) */}
                {showRlBase && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: GATES_RELIABILITY.base.color, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {t('gate.relControls')}
                      <ReliabilityBadge tier={rlTier} />
                    </div>
                    <ProgressBar
                      done={GATES_RELIABILITY.base.items.filter(i => Boolean(local[i.key])).length}
                      total={GATES_RELIABILITY.base.items.length}
                      color={GATES_RELIABILITY.base.color}
                    />
                  </div>
                )}
                {showRlAgentic && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: GATES_RELIABILITY.agentic.color, marginBottom: 4 }}>
                      {t('gate.agenticControls')}
                    </div>
                    <ProgressBar
                      done={GATES_RELIABILITY.agentic.items.filter(i => Boolean(local[i.key])).length}
                      total={GATES_RELIABILITY.agentic.items.length}
                      color={GATES_RELIABILITY.agentic.color}
                    />
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                >
                  {saving ? '⏳' : '💾'} {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
