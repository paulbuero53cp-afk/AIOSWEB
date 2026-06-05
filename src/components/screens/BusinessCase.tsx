import { useState, useEffect, useCallback } from 'react';
import { useArtefakt } from '@/hooks/useArtefakt';
import { useUseCases } from '@/hooks/useUseCases';
import { useToast } from '@/context/ToastContext';
import { ArtHeader } from '@/components/common/ArtHeader';
import { BC_DEFAULT_LOHNKOSTEN } from '@/lib/constants';
import type { BusinessCase, BcCalculation } from '@/types';

// ── Berechnung ────────────────────────────────────────────────
function calcBC(d: Partial<BusinessCase>): BcCalculation {
  const lohn  = Number(d.lohnkosten  ?? BC_DEFAULT_LOHNKOSTEN);
  const zeit  = Number(d.i_zeitersparnis ?? 0);
  const fq    = Number(d.i_fehlerquote   ?? 0);
  const ums   = Number(d.i_umsatz        ?? 0);
  const kuf   = Number(d.i_kundenzuf     ?? 0);
  const sonsN = Number(d.i_sonstige      ?? 0);

  const monetZeit = zeit * 12 * lohn;
  const monetFq   = fq * 500;        // Pauschal €500 Einsparung pro % Fehlerreduktion p.a.
  const monetKuf  = kuf * 200;       // Pauschal €200 pro NPS-Punkt p.a.
  const gesamtNutzen = monetZeit + monetFq + ums + monetKuf + sonsN;

  const cEntw   = Number(d.c_entwicklung ?? 0);
  const cLiz    = Number(d.c_lizenz      ?? 0);
  const cBetr   = Number(d.c_betrieb     ?? 0);
  const cSch    = Number(d.c_schulung    ?? 0);
  const cSonsK  = Number(d.c_sonstige    ?? 0);

  const einmal    = cEntw + cSch;
  const jaehrlich = cLiz + cBetr + cSonsK;

  // ROI über 3 Jahre
  const totalNutzen = gesamtNutzen * 3;
  const totalKosten = einmal + jaehrlich * 3;
  const roi3 = totalKosten > 0
    ? Math.round(((totalNutzen - totalKosten) / totalKosten) * 100)
    : 0;

  // Breakeven in Monaten
  const monatlichNetto = gesamtNutzen / 12 - jaehrlich / 12;
  const breakeven = monatlichNetto > 0
    ? Math.ceil(einmal / monatlichNetto)
    : 999;

  return { monetZeit, gesamtNutzen, einmal, jaehrlich, roi3, breakeven };
}

// ── Währungs-Formatierung ─────────────────────────────────────
function eur(v: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(v);
}

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
      showToast('✓ Business Case gespeichert', 'success');
    } catch {
      showToast('Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function syncPD(pd: string) {
    if (!ucId) return;
    try {
      await updateUC(ucId, { pd: pd as import('@/types').PortfolioDecision });
      showToast(`Portfolio Decision "${pd}" → Use Case übertragen`, 'success');
    } catch {
      showToast('Sync-Fehler', 'error');
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
        <div className="empty">Bitte Use Case auswählen.</div>
      ) : loading ? (
        <div className="empty">Lade…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* Linke Spalte: Nutzen */}
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="ch"><span className="ch-title">Nutzen (€/Jahr)</span></div>
              <div style={{ padding: '16px 20px' }}>
                <div className="fg">
                  <NumField
                    label="Lohnkostensatz"
                    suffix="€/h"
                    value={Number(local.lohnkosten ?? BC_DEFAULT_LOHNKOSTEN)}
                    onChange={v => set('lohnkosten', v)}
                  />
                  <NumField
                    label="Zeitersparnis"
                    suffix="h/Monat"
                    value={Number(local.i_zeitersparnis ?? 0)}
                    onChange={v => set('i_zeitersparnis', v)}
                    hint={`→ ${eur(calc.monetZeit)}/Jahr monetarisiert`}
                  />
                  <NumField
                    label="Fehlerreduktion"
                    suffix="% weniger"
                    value={Number(local.i_fehlerquote ?? 0)}
                    onChange={v => set('i_fehlerquote', v)}
                  />
                  <NumField
                    label="Umsatzbeitrag"
                    suffix="€/Jahr"
                    value={Number(local.i_umsatz ?? 0)}
                    onChange={v => set('i_umsatz', v)}
                  />
                  <NumField
                    label="NPS-Verbesserung"
                    suffix="Punkte"
                    value={Number(local.i_kundenzuf ?? 0)}
                    onChange={v => set('i_kundenzuf', v)}
                  />
                  <NumField
                    label="Sonstiger Nutzen"
                    suffix="€/Jahr"
                    value={Number(local.i_sonstige ?? 0)}
                    onChange={v => set('i_sonstige', v)}
                  />
                </div>
              </div>
            </div>

            {/* Narrative */}
            <div className="card">
              <div className="ch"><span className="ch-title">Begründung / Narrative</span></div>
              <div style={{ padding: '12px 20px' }}>
                <textarea
                  rows={4}
                  placeholder="Qualitative Begründung für den Business Case…"
                  value={local.narrative ?? ''}
                  onChange={e => set('narrative', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Rechte Spalte: Kosten + Ergebnis */}
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="ch"><span className="ch-title">Kosten</span></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                  Einmalig
                </div>
                <div className="fg" style={{ marginBottom: 16 }}>
                  <NumField label="Entwicklung" suffix="€" value={Number(local.c_entwicklung ?? 0)} onChange={v => set('c_entwicklung', v)} />
                  <NumField label="Schulung" suffix="€" value={Number(local.c_schulung ?? 0)} onChange={v => set('c_schulung', v)} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                  Laufend (€/Jahr)
                </div>
                <div className="fg">
                  <NumField label="Lizenz" suffix="€/Jahr" value={Number(local.c_lizenz ?? 0)} onChange={v => set('c_lizenz', v)} />
                  <NumField label="Betrieb" suffix="€/Jahr" value={Number(local.c_betrieb ?? 0)} onChange={v => set('c_betrieb', v)} />
                  <NumField label="Sonstiges" suffix="€/Jahr" value={Number(local.c_sonstige ?? 0)} onChange={v => set('c_sonstige', v)} />
                </div>
              </div>
            </div>

            {/* Ergebnisse */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="ch"><span className="ch-title">Kalkulation</span></div>
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultKpi
                  label="Nutzen/Jahr"
                  value={eur(calc.gesamtNutzen)}
                  color="var(--green)"
                />
                <ResultKpi
                  label="Kosten einmalig"
                  value={eur(calc.einmal)}
                  color="var(--red)"
                />
                <ResultKpi
                  label="ROI (3 Jahre)"
                  value={`${calc.roi3}%`}
                  color={calc.roi3 > 0 ? 'var(--green)' : 'var(--red)'}
                />
                <ResultKpi
                  label="Breakeven"
                  value={calc.breakeven >= 999 ? 'n/a' : `${calc.breakeven} Monate`}
                  color={calc.breakeven <= 24 ? 'var(--green)' : calc.breakeven <= 48 ? 'var(--yellow)' : 'var(--red)'}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="card">
              <div className="ch"><span className="ch-title">Empfehlung</span></div>
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
