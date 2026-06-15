import { useState, useEffect, useCallback } from 'react';
import { useArtefakt } from '@/hooks/useArtefakt';
import { useUseCases } from '@/hooks/useUseCases';
import { useToast } from '@/context/ToastContext';
import { useT } from '@/context/LanguageContext';
import { ArtHeader } from '@/components/common/ArtHeader';
import {
  RA_DIMS, RA_EUAIACT, RA_MITIGATION, calcRiskScore,
} from '@/lib/constants';
import type { RiskAssessment } from '@/types';

// ── Score-Ring ────────────────────────────────────────────────
function ScoreRing({ pct, tier }: { pct: number; tier: string }) {
  const r = 48, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = tier === 'High' ? 'var(--red)' : tier === 'Medium' ? 'var(--yellow)' : 'var(--green)';

  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
        <circle
          cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
        <text x={60} y={55} textAnchor="middle" fontSize={20} fontWeight={700} fill={color}>
          {pct}%
        </text>
        <text x={60} y={74} textAnchor="middle" fontSize={11} fill="var(--muted)">
          {tier}
        </text>
      </svg>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Risk Score</div>
    </div>
  );
}

// ── Dimension-Select ──────────────────────────────────────────
function DimSelect({
  dim, value, onChange,
}: {
  dim: typeof RA_DIMS[number];
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--petrol)', marginBottom: 4 }}>
          {t(`ra.dim.${dim.key}.label`)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{t(`ra.dim.${dim.key}.help`)}</div>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%' }}
        >
          {dim.opts.map((_o, i) => (
            <option key={i} value={String(i + 1)}>{t(`ra.dim.${dim.key}.o${i + 1}`)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Checkbox-Liste ────────────────────────────────────────────
function CheckList({
  title, items, keyPrefix, data, onChange,
}: {
  title: string;
  items: readonly { key: string; label: string }[];
  keyPrefix: string;
  data: Record<string, unknown>;
  onChange: (key: string, val: boolean) => void;
}) {
  const t = useT();
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="ch"><span className="ch-title">{title}</span></div>
      <div style={{ padding: '12px 20px' }}>
        {items.map(item => (
          <label
            key={item.key}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, cursor: 'pointer', fontSize: 13 }}
          >
            <input
              type="checkbox"
              checked={Boolean(data[item.key])}
              onChange={e => onChange(item.key, e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span>{t(`${keyPrefix}${item.key}`)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Risk Assessment Screen ────────────────────────────────────
export default function RiskAssessmentScreen({ initialUcId }: { initialUcId?: string } = {}) {
  const [ucId,   setUcId]   = useState(initialUcId ?? '');
  const [dirty,  setDirty]  = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast }       = useToast();
  const { updateUC }        = useUseCases();
  const t                   = useT();

  const { data, loading, save } = useArtefakt<Partial<RiskAssessment>>('ra', ucId || null);

  // Lokaler State — initialisiert wenn Daten ankommen
  const [local, setLocal] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!loading) {
      setLocal(data as Record<string, unknown>);
      setDirty(false);
    }
  }, [data, loading, ucId]);

  const set = useCallback((key: string, val: unknown) => {
    setLocal(l => ({ ...l, [key]: val }));
    setDirty(true);
  }, []);

  const score = calcRiskScore(local as Record<string, string | boolean>);

  async function handleSave() {
    if (!ucId) return;
    setSaving(true);
    try {
      await save(local as Partial<RiskAssessment>);
      setDirty(false);
      showToast(t('ra.savedToast'), 'success');
    } catch {
      showToast(t('common.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function syncToUC() {
    if (!ucId) return;
    try {
      await updateUC(ucId, { rt: score.tier });
      showToast(t('ra.syncToast', { tier: score.tier }), 'success');
    } catch {
      showToast(t('ra.syncErr'), 'error');
    }
  }

  return (
    <div>
      <ArtHeader
        title={t('nav.riskassess')}
        icon="⚠"
        ucId={ucId}
        onUcChange={id => { setUcId(id); setDirty(false); }}
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
      />

      {!ucId ? (
        <div className="empty">{t('ra.pickUc')}</div>
      ) : loading ? (
        <div className="empty">{t('common.loadingShort')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, alignItems: 'start' }}>
          {/* Linke Spalte: Dimensionen */}
          <div>
            <div className="sec-title" style={{ marginBottom: 12 }}>{t('ra.step1')}</div>
            {RA_DIMS.map(dim => (
              <DimSelect
                key={dim.key}
                dim={dim}
                value={String(local[dim.key] ?? '1')}
                onChange={v => set(dim.key, v)}
              />
            ))}

            <CheckList
              title={t('ra.step2')}
              items={RA_EUAIACT}
              keyPrefix="ra.euaiact."
              data={local}
              onChange={(k, v) => set(k, v)}
            />

            <CheckList
              title={t('ra.step3')}
              items={RA_MITIGATION}
              keyPrefix="ra.mit."
              data={local}
              onChange={(k, v) => set(k, v)}
            />
          </div>

          {/* Rechte Spalte: Score + Actions */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="ch"><span className="ch-title">{t('ra.result')}</span></div>
              <ScoreRing pct={score.pct} tier={score.tier} />
              <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* EU AI Act Warnung */}
                {RA_EUAIACT.some(e => local[e.key]) && (
                  <div style={{
                    background: 'var(--red-bg)', color: 'var(--red)',
                    borderRadius: 8, padding: '10px 12px', fontSize: 12, fontWeight: 600,
                  }}>
                    {t('ra.euWarn')}
                  </div>
                )}

                {/* Mitigation-Fortschritt */}
                {(() => {
                  const done = RA_MITIGATION.filter(m => local[m.key]).length;
                  const total = RA_MITIGATION.length;
                  return (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                        {t('ra.measures', { done, total })}
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                        <div style={{
                          width: `${Math.round((done / total) * 100)}%`,
                          height: 6, borderRadius: 3,
                          background: done === total ? 'var(--green)' : 'var(--accent)',
                        }} />
                      </div>
                    </div>
                  );
                })()}

                <button className="btn btn-primary" onClick={handleSave} disabled={saving || !dirty}>
                  {saving ? `⏳ ${t('common.saving')}` : `💾 ${t('common.save')}`}
                </button>
                <button className="btn btn-outline" onClick={syncToUC}>
                  {t('ra.syncBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
