import { useState, useEffect, useCallback } from 'react';
import { useArtefakt } from '@/hooks/useArtefakt';
import { useUseCases } from '@/hooks/useUseCases';
import { useToast } from '@/context/ToastContext';
import { useT } from '@/context/LanguageContext';
import { ArtHeader } from '@/components/common/ArtHeader';
import { BC_DEFAULT_LOHNKOSTEN } from '@/lib/constants';
import { calcBC, eur } from '@/lib/businessCase';
import type { BusinessCase } from '@/types';

// ── Numerik-Input ─────────────────────────────────────────────
function NumField({
  label, value, onChange, suffix, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; hint?: string;
}) {
  return (
    <div className="fgroup">
      <label className="fl">{label}{suffix && <span style={{ fontWeight: 400, marginLeft: 4, fontSize: 10 }}>{suffix}</span>}</label>
      <input
        type="number"
        min={0}
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        placeholder="0"
      />
      {hint && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{hint}</span>}
    </div>
  );
}

// ── KPI-Kachel ────────────────────────────────────────────────
function ResultKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="kc" style={color ? { borderTop: `3px solid ${color}` } : undefined}>
      <div className="kc-label">{label}</div>
      <div className="kc-value" style={{ fontSize: 22, color: color ?? 'var(--petrol)' }}>
        {value}
      </div>
    </div>
  );
}

// ── Business Case Screen ──────────────────────────────────────
export default function BusinessCaseScreen({ initialUcId }: { initialUcId?: string } = {}) {
  const [ucId,   setUcId]   = useState(initialUcId ?? '');
  const [dirty,  setDirty]  = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { updateUC }  = useUseCases();
  const t             = useT();

  const { data, loading, save } = useArtefakt<Partial<BusinessCase>>('bc', ucId || null);
  const [local, setLocal] = useState<Partial<BusinessCase>>({});

  useEffect(() => {
    if (!loading) {
      setLocal({ lohnkosten: BC_DEFAULT_LOHNKOSTEN, ...data });
      setDirty(false);
    }
  }, [data, loading, ucId]);

  const set = useCallback(<K extends keyof BusinessCase>(key: K, val: BusinessCase[K]) => {
    setLocal(l => ({ ...l, [key]: val }));
    setDirty(true);
  }, []);

  const calc = calcBC(local);

  async function handleSave() {
    if (!ucId) return;
    setSaving(true);
    try {
      await save(local);
      setDirty(false);
      showToast(t('bc.savedToast'), 'success');
    } catch {
      showToast(t('common.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function syncPD(pd: string) {
    if (!ucId) return;
    try {
      await updateUC(ucId, { pd: pd as import('@/types').PortfolioDecision });
      showToast(t('bc.syncToast', { pd }), 'success');
    } catch {
      showToast(t('ra.syncErr'), 'error');
    }
  }

  return (
    <div>
      <ArtHeader
        title="Business Case"
        icon="📈"
        ucId={ucId}
        onUcChange={id => { setUcId(id); setDirty(false); }}
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
      />

      {!ucId ? (
        <div className="empty">{t('common.pickUc')}</div>
      ) : loading ? (
        <div className="empty">{t('common.loadingShort')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* Linke Spalte: Nutzen */}
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="ch"><span className="ch-title">{t('bc.benefitTitle')}</span></div>
              <div style={{ padding: '16px 20px' }}>
                <div className="fg">
                  <NumField
                    label={t('bc.fLohn')}
                    suffix="€/h"
                    value={Number(local.lohnkosten ?? BC_DEFAULT_LOHNKOSTEN)}
                    onChange={v => set('lohnkosten', v)}
                  />
                  <NumField
                    label={t('bc.fZeit')}
                    suffix={t('bc.suffixHMonth')}
                    value={Number(local.i_zeitersparnis ?? 0)}
                    onChange={v => set('i_zeitersparnis', v)}
                    hint={t('bc.zeitHint', { v: eur(calc.monetZeit) })}
                  />
                  <NumField
                    label={t('bc.fFehler')}
                    suffix={t('bc.suffixLess')}
                    value={Number(local.i_fehlerquote ?? 0)}
                    onChange={v => set('i_fehlerquote', v)}
                  />
                  <NumField
                    label={t('bc.fUmsatz')}
                    suffix={t('bc.suffixEurYear')}
                    value={Number(local.i_umsatz ?? 0)}
                    onChange={v => set('i_umsatz', v)}
                  />
                  <NumField
                    label={t('bc.fNps')}
                    suffix={t('bc.suffixPoints')}
                    value={Number(local.i_kundenzuf ?? 0)}
                    onChange={v => set('i_kundenzuf', v)}
                  />
                  <NumField
                    label={t('bc.fSonstNutzen')}
                    suffix={t('bc.suffixEurYear')}
                    value={Number(local.i_sonstige ?? 0)}
                    onChange={v => set('i_sonstige', v)}
                  />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '16px 0 10px' }}>
                  {t('bc.onetimeBenefit')}
                </div>
                <div className="fg">
                  <NumField
                    label={t('bc.fEinmalig')}
                    suffix="€"
                    value={Number(local.i_einmalig ?? 0)}
                    onChange={v => set('i_einmalig', v)}
                    hint={t('bc.einmaligHint')}
                  />
                </div>
              </div>
            </div>

            {/* Narrative */}
            <div className="card">
              <div className="ch"><span className="ch-title">{t('bc.narrativeTitle')}</span></div>
              <div style={{ padding: '12px 20px' }}>
                <textarea
                  rows={4}
                  placeholder={t('bc.narrativePh')}
                  value={local.narrative ?? ''}
                  onChange={e => set('narrative', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Rechte Spalte: Kosten + Ergebnis */}
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="ch"><span className="ch-title">{t('bc.costTitle')}</span></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                  {t('bc.once')}
                </div>
                <div className="fg" style={{ marginBottom: 16 }}>
                  <NumField label={t('bc.fEntw')} suffix="€" value={Number(local.c_entwicklung ?? 0)} onChange={v => set('c_entwicklung', v)} />
                  <NumField label={t('bc.fSchulung')} suffix="€" value={Number(local.c_schulung ?? 0)} onChange={v => set('c_schulung', v)} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                  {t('bc.recurring')}
                </div>
                <div className="fg">
                  <NumField label={t('bc.fLizenz')} suffix={t('bc.suffixEurYear')} value={Number(local.c_lizenz ?? 0)} onChange={v => set('c_lizenz', v)} />
                  <NumField label={t('bc.fBetrieb')} suffix={t('bc.suffixEurYear')} value={Number(local.c_betrieb ?? 0)} onChange={v => set('c_betrieb', v)} />
                  <NumField label={t('bc.fSonstK')} suffix={t('bc.suffixEurYear')} value={Number(local.c_sonstige ?? 0)} onChange={v => set('c_sonstige', v)} />
                </div>
              </div>
            </div>

            {/* Ergebnisse */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="ch"><span className="ch-title">{t('bc.calcTitle')}</span></div>
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <ResultKpi
                  label={t('bc.kBenefitYear')}
                  value={eur(calc.gesamtNutzen)}
                  color="var(--green)"
                />
                <ResultKpi
                  label={t('bc.kOnetime')}
                  value={eur(calc.einmaligerNutzen)}
                  color="var(--green)"
                />
                <ResultKpi
                  label={t('bc.kCostOnce')}
                  value={eur(calc.einmal)}
                  color="var(--red)"
                />
                <ResultKpi
                  label={t('bc.kRoi')}
                  value={`${calc.roi3}%`}
                  color={calc.roi3 > 0 ? 'var(--green)' : 'var(--red)'}
                />
                <ResultKpi
                  label={t('bc.kBreakeven')}
                  value={calc.breakeven >= 999 ? 'n/a' : t('bc.months', { n: calc.breakeven })}
                  color={calc.breakeven <= 24 ? 'var(--green)' : calc.breakeven <= 48 ? 'var(--yellow)' : 'var(--red)'}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="card">
              <div className="ch"><span className="ch-title">{t('bc.recTitle')}</span></div>
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Start', 'Scale', 'Hold', 'Stop', 'Backlog'].map(pd => (
                  <button
                    key={pd}
                    className="btn btn-outline btn-sm"
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => syncPD(pd)}
                  >
                    Portfolio Decision → <strong style={{ marginLeft: 4 }}>{pd}</strong>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
