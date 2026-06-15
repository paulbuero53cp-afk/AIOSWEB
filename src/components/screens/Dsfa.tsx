import { useState, useEffect, useCallback } from 'react';
import { useArtefakt } from '@/hooks/useArtefakt';
import { useToast } from '@/context/ToastContext';
import { useLang } from '@/context/LanguageContext';
import { ArtHeader } from '@/components/common/ArtHeader';
import { DSFA_TRIGGER, DSFA_RISK_ITEMS } from '@/lib/constants';
import type { DsfaData } from '@/types';

// ── Hilfsfunktionen ───────────────────────────────────────────
type LocalData = Record<string, unknown>;

function s(d: LocalData, k: string): string { return String(d[k] ?? ''); }
function b(d: LocalData, k: string): boolean { return Boolean(d[k]); }

// ── Eingabe-Komponenten ───────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  const { tx } = useLang();
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: 'var(--petrol)',
      textTransform: 'uppercase', letterSpacing: '.06em',
      margin: '20px 0 10px', paddingBottom: 6,
      borderBottom: '2px solid var(--accent-pale)',
    }}>
      {typeof children === 'string' ? tx(children) : children}
    </div>
  );
}

function TextField({
  label, fieldKey, data, onChange, big = false, type = 'text',
}: {
  label: string; fieldKey: string; data: LocalData;
  onChange: (k: string, v: unknown) => void; big?: boolean; type?: string;
}) {
  const { tx } = useLang();
  return (
    <div className="fgroup" style={{ marginBottom: 10 }}>
      <label className="fl">{tx(label)}</label>
      {big ? (
        <textarea
          rows={3} value={s(data, fieldKey)}
          onChange={e => onChange(fieldKey, e.target.value)}
        />
      ) : (
        <input
          type={type} value={s(data, fieldKey)}
          onChange={e => onChange(fieldKey, e.target.value)}
        />
      )}
    </div>
  );
}

function RadioGroup({
  label, fieldKey, data, onChange,
}: {
  label: string; fieldKey: string; data: LocalData;
  onChange: (k: string, v: unknown) => void;
}) {
  const { tx } = useLang();
  const val = s(data, fieldKey) || 'nein';
  return (
    <div style={{ marginBottom: 10 }}>
      <label className="fl" style={{ display: 'block', marginBottom: 4 }}>{tx(label)}</label>
      <div style={{ display: 'flex', gap: 16 }}>
        {[['ja', 'Ja'], ['nein', 'Nein'], ['unsicher', 'Nicht sicher']].map(([v, l]) => (
          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="radio" name={fieldKey} value={v}
              checked={val === v} onChange={() => onChange(fieldKey, v)}
            />
            {tx(l)}
          </label>
        ))}
      </div>
    </div>
  );
}

function CheckItem({
  label, fieldKey, data, onChange,
}: {
  label: string; fieldKey: string; data: LocalData;
  onChange: (k: string, v: unknown) => void;
}) {
  const { tx } = useLang();
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 13, cursor: 'pointer' }}>
      <input
        type="checkbox" checked={b(data, fieldKey)}
        onChange={e => onChange(fieldKey, e.target.checked)}
        style={{ marginTop: 2, flexShrink: 0 }}
      />
      <span>{tx(label)}</span>
    </label>
  );
}

function CheckGrid({ items, data, onChange }: {
  items: { key: string; label: string }[];
  data: LocalData;
  onChange: (k: string, v: unknown) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 4 }}>
      {items.map(i => (
        <CheckItem key={i.key} label={i.label} fieldKey={i.key} data={data} onChange={onChange} />
      ))}
    </div>
  );
}

// ── Trigger-Ampel ─────────────────────────────────────────────
function TriggerAmpel({ data }: { data: LocalData }) {
  const { tx } = useLang();
  const active = DSFA_TRIGGER.filter(t => b(data, t.key)).length;
  const color  = active > 0 ? 'var(--red)' : 'var(--green)';
  const bg     = active > 0 ? 'var(--red-bg)' : 'var(--green-bg)';
  return (
    <div style={{
      background: bg, color, borderRadius: 8,
      padding: '12px 16px', fontSize: 13, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
    }}>
      <span style={{ fontSize: 20 }}>{active > 0 ? '🔴' : '🟢'}</span>
      {active > 0
        ? `${active} ${tx('Trigger aktiv → DSFA verpflichtend (Art. 35 DSGVO)')}`
        : tx('Kein Trigger aktiv — DSFA aktuell nicht zwingend erforderlich')}
    </div>
  );
}

// ── Risiko W × S Bewertung ────────────────────────────────────
const SCORE_OPT = ['1 — Niedrig', '2 — Mittel', '3 — Hoch'];

function RisikoRow({ item, data, onChange }: {
  item: typeof DSFA_RISK_ITEMS[number];
  data: LocalData;
  onChange: (k: string, v: unknown) => void;
}) {
  const { tx } = useLang();
  const wKey = `${item.key}_w`, sKey = `${item.key}_s`;
  const w = parseInt(s(data, wKey) || '1');
  const sv = parseInt(s(data, sKey) || '1');
  const score = w * sv;
  const color = score >= 6 ? 'var(--red)' : score >= 3 ? 'var(--yellow)' : 'var(--green)';

  return (
    <tr>
      <td style={{ padding: '8px 12px', fontSize: 13 }}>
        <div style={{ fontWeight: 600 }}>{tx(item.dim)}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{tx(item.label)}</div>
      </td>
      <td style={{ padding: '8px 12px' }}>
        <select value={s(data, wKey) || '1'} onChange={e => onChange(wKey, e.target.value)} style={{ fontSize: 12 }}>
          {SCORE_OPT.map((o, i) => <option key={i} value={i + 1}>{tx(o)}</option>)}
        </select>
      </td>
      <td style={{ padding: '8px 12px' }}>
        <select value={s(data, sKey) || '1'} onChange={e => onChange(sKey, e.target.value)} style={{ fontSize: 12 }}>
          {SCORE_OPT.map((o, i) => <option key={i} value={i + 1}>{tx(o)}</option>)}
        </select>
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block', width: 32, height: 32, lineHeight: '32px',
          borderRadius: '50%', background: color, color: '#fff',
          fontWeight: 700, fontSize: 14, textAlign: 'center',
        }}>
          {score}
        </span>
      </td>
    </tr>
  );
}

// ── Tab-Navigation ────────────────────────────────────────────
const TABS = ['Teil I — Hintergrund', 'Teil II — Risiken', 'Teil III — Ausnahmen',
              'Trigger-Prüfung', 'Schritt 2 — Beschreibung', 'Schritt 3 — Risikobewertung', 'Schritt 4 — Maßnahmen'];

// ── DSFA Screen ───────────────────────────────────────────────
export default function DsfaScreen({ initialUcId }: { initialUcId?: string } = {}) {
  const [ucId,   setUcId]   = useState(initialUcId ?? '');
  const [tab,    setTab]    = useState(0);
  const [dirty,  setDirty]  = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { t, tx, lang } = useLang();

  const { data, loading, save } = useArtefakt<Partial<DsfaData>>('dsfa', ucId || null);
  const [local, setLocal] = useState<LocalData>({});

  useEffect(() => {
    if (!loading) { setLocal(data as LocalData); setDirty(false); }
  }, [data, loading, ucId]);

  const set = useCallback((key: string, val: unknown) => {
    setLocal(l => ({ ...l, [key]: val }));
    setDirty(true);
  }, []);

  async function handleSave() {
    if (!ucId) return;
    setSaving(true);
    try {
      await save(local as Partial<DsfaData>);
      setDirty(false);
      showToast(tx('✓ DSFA gespeichert'), 'success');
    } catch {
      showToast(tx('Fehler beim Speichern'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ArtHeader
        title={tx('Datenschutz-Folgenabschätzung (DSFA)')}
        icon="🔒"
        ucId={ucId}
        onUcChange={id => { setUcId(id); setDirty(false); setTab(0); }}
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
      />

      {!ucId ? (
        <div className="empty">{t('common.pickUc')}</div>
      ) : loading ? (
        <div className="empty">{t('common.loadingShort')}</div>
      ) : (
        <>
          {/* Tab-Bar */}
          <div className="tabs" style={{ flexWrap: 'wrap' }}>
            {TABS.map((tabLabel, i) => (
              <div key={tabLabel} className={`tab${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>
                {tx(i < 3 ? tabLabel : tabLabel.split(' — ')[0])}
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ padding: '20px' }}>

              {/* ── TEIL I ── */}
              {tab === 0 && (
                <div>
                  <SectionTitle>1A — Hintergrundinformationen</SectionTitle>
                  <div className="fg">
                    <TextField label="Projektinhaber (Name, Funktion)" fieldKey="bg_projektinhaber" data={local} onChange={set} />
                    <TextField label="Datum" fieldKey="bg_datum" data={local} onChange={set} type="date" />
                    <div className="fgroup full" style={{ gridColumn: '1 / -1' }}>
                      <TextField label="Projektbeschreibung und Ziele" fieldKey="bg_projekt" data={local} onChange={set} big />
                    </div>
                    <div className="fgroup full" style={{ gridColumn: '1 / -1' }}>
                      <TextField label="Welche Daten sind betroffen?" fieldKey="bg_daten" data={local} onChange={set} big />
                    </div>
                  </div>

                  <SectionTitle>1B — Art der Verarbeitung (Frage 4)</SectionTitle>
                  <CheckGrid onChange={set} data={local} items={[
                    { key: 'bg_verarb_erheben',    label: 'Erheben' },
                    { key: 'bg_verarb_erfassen',   label: 'Erfassen' },
                    { key: 'bg_verarb_organisieren', label: 'Organisieren' },
                    { key: 'bg_verarb_speichern',  label: 'Speichern' },
                    { key: 'bg_verarb_anpassen',   label: 'Anpassen oder ändern' },
                    { key: 'bg_verarb_bereit',     label: 'Bereitstellung' },
                    { key: 'bg_verarb_abgleich',   label: 'Abgleichen oder verknüpfen' },
                    { key: 'bg_verarb_einschraenk', label: 'Einschränken' },
                    { key: 'bg_verarb_loeschen',   label: 'Löschen' },
                    { key: 'bg_verarb_vernichten', label: 'Vernichten' },
                    { key: 'bg_verarb_auslesen',   label: 'Auslesen' },
                    { key: 'bg_verarb_abfragen',   label: 'Abfragen' },
                    { key: 'bg_verarb_verwenden',  label: 'Verwenden' },
                    { key: 'bg_verarb_offenlegen', label: 'Offenlegen' },
                    { key: 'bg_verarb_verbreiten', label: 'Verbreiten' },
                  ]} />

                  <SectionTitle>1C — Quelle, Zugang & Rechtsgrundlage</SectionTitle>
                  <div className="fg">
                    <TextField label="Quelle der Daten (Frage 5)" fieldKey="bg_datenquelle" data={local} onChange={set} />
                    <TextField label="Sind Daten öffentlich zugänglich? (Frage 6)" fieldKey="bg_oeffentlich" data={local} onChange={set} />
                    <div className="fgroup full" style={{ gridColumn: '1 / -1' }}>
                      <TextField label="Wer hat Zugriff auf die personenbezogenen Daten? (Frage 7)" fieldKey="bg_zugriff" data={local} onChange={set} />
                    </div>
                    <div className="fgroup full" style={{ gridColumn: '1 / -1' }}>
                      <TextField label="Rechtsgrundlage der Verarbeitung (Frage 8)" fieldKey="bg_rechtsgrundlage" data={local} onChange={set} big />
                    </div>
                  </div>
                </div>
              )}

              {/* ── TEIL II ── */}
              {tab === 1 && (
                <div>
                  <SectionTitle>2A — Sensible Datenkategorien (Frage 9 / Art. 9 DSGVO)</SectionTitle>
                  <CheckGrid onChange={set} data={local} items={[
                    { key: 'bg_sens_rasse',       label: 'Rassische / ethnische Herkunft' },
                    { key: 'bg_sens_politik',     label: 'Politische Meinungen' },
                    { key: 'bg_sens_religion',    label: 'Religiöse / weltanschauliche Überzeugungen' },
                    { key: 'bg_sens_gewerkschaft', label: 'Gewerkschaftszugehörigkeit' },
                    { key: 'bg_sens_genetik',     label: 'Genetische Daten' },
                    { key: 'bg_sens_biometrie',   label: 'Biometrische Daten' },
                    { key: 'bg_sens_gesundheit',  label: 'Gesundheitsdaten' },
                    { key: 'bg_sens_sexleben',    label: 'Sexualleben / Sexuelle Orientierung' },
                    { key: 'bg_sens_strafrecht',  label: 'Strafrechtliche Verurteilungen' },
                    { key: 'bg_sens_finanzen',    label: 'Finanzdaten (Bank-/Kontodaten)' },
                    { key: 'bg_sens_keine',       label: 'Nicht zutreffend' },
                  ]} />

                  <SectionTitle>2B — Ja / Nein Fragen (10–15)</SectionTitle>
                  <RadioGroup label="Frage 10 — Automatisierte Entscheidungsfindung (inkl. Profiling)?" fieldKey="bg_auto_entscheid" data={local} onChange={set} />
                  <RadioGroup label="Frage 11 — Systematische Überwachung öffentlich zugänglicher Bereiche?" fieldKey="bg_ueberwachung" data={local} onChange={set} />
                  <RadioGroup label="Frage 12 — Leistungs- und Verhaltenskontrolle geeignet?" fieldKey="bg_verhalten_ctrl" data={local} onChange={set} />
                  <RadioGroup label="Frage 13 — Umfangreiche Verarbeitung von Daten?" fieldKey="bg_umfang_gross" data={local} onChange={set} />
                  <RadioGroup label="Frage 14 — Datensätze abgeglichen oder kombiniert?" fieldKey="bg_datensatz_abgl" data={local} onChange={set} />
                  <RadioGroup label="Frage 15 — Betroffene Personen bewertet (Profiling)?" fieldKey="bg_profiling" data={local} onChange={set} />

                  <SectionTitle>2C — Schutzbedürftige Personengruppen (Frage 16)</SectionTitle>
                  <CheckGrid onChange={set} data={local} items={[
                    { key: 'bg_sg_mitarbeiter', label: 'Mitarbeitende' },
                    { key: 'bg_sg_asyl',        label: 'Asylsuchende' },
                    { key: 'bg_sg_patienten',   label: 'Patienten' },
                    { key: 'bg_sg_behinderung', label: 'Menschen mit geistiger Behinderung' },
                    { key: 'bg_sg_senioren',    label: 'Senioren' },
                    { key: 'bg_sg_kinder',      label: 'Kinder unter 16 Jahren' },
                    { key: 'bg_sg_keine',       label: 'Nicht zutreffend' },
                  ]} />

                  <SectionTitle>2D — Weitere Fragen (17–20)</SectionTitle>
                  <RadioGroup label="Frage 17 — Neue oder innovative Technologie?" fieldKey="bg_neue_technologie" data={local} onChange={set} />
                  <RadioGroup label="Frage 18 — Übermittlung außerhalb EU/EWR?" fieldKey="bg_drittland" data={local} onChange={set} />
                  {s(local, 'bg_drittland') === 'ja' && (
                    <TextField label="Drittland — welche Länder?" fieldKey="bg_drittland_laender" data={local} onChange={set} />
                  )}
                  <RadioGroup label="Frage 19 — Aufsichtsbehörde hat DSFA-Pflicht erklärt?" fieldKey="bg_behoerde_pflicht" data={local} onChange={set} />
                  <RadioGroup label="Frage 20 — Hohes Risiko ohne obige Kategorien?" fieldKey="bg_hohes_risiko" data={local} onChange={set} />
                </div>
              )}

              {/* ── TEIL III ── */}
              {tab === 2 && (
                <div>
                  <SectionTitle>3A — Ausnahmen (Fragen 21–24)</SectionTitle>
                  <RadioGroup label="Frage 21 — Ähnliche abgeschlossene DSFA vorhanden?" fieldKey="bg_aehnl_dsfa" data={local} onChange={set} />
                  <TextField label="Falls ja — Referenz und Unterschiede (Frage 21/22)" fieldKey="bg_aehnl_dsfa_ref" data={local} onChange={set} big />
                  <RadioGroup label="Frage 23 — Aufsichtsbehörde hat geprüft und bestätigt?" fieldKey="bg_behoerde_gepr" data={local} onChange={set} />
                  <RadioGroup label="Frage 24 — Projekt auf White List der Aufsichtsbehörde?" fieldKey="bg_whitelist" data={local} onChange={set} />
                  <TextField label="Frage 23/24 — Zusätzliche Informationen / Referenz" fieldKey="bg_whitelist_info" data={local} onChange={set} big />
                </div>
              )}

              {/* ── TRIGGER ── */}
              {tab === 3 && (
                <div>
                  <TriggerAmpel data={local} />
                  <SectionTitle>DSFA-Trigger nach Art. 35 DSGVO</SectionTitle>
                  {DSFA_TRIGGER.map(t => (
                    <CheckItem key={t.key} label={t.label} fieldKey={t.key} data={local} onChange={set} />
                  ))}
                  <div style={{ marginTop: 20, padding: 14, background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
                    {tx('Mindestens ein aktiver Trigger begründet die Pflicht zur Durchführung einer vollständigen DSFA gemäß Art. 35 DSGVO. Bitte anschließend die Schritte 2–4 ausfüllen.')}
                  </div>
                </div>
              )}

              {/* ── SCHRITT 2 ── */}
              {tab === 4 && (
                <div>
                  <SectionTitle>Beschreibung der Verarbeitung</SectionTitle>
                  <TextField label="Zweck der Verarbeitung" fieldKey="ds_zweck" data={local} onChange={set} big />
                  <TextField label="Rechtsgrundlage (Art. 6 / Art. 9 DSGVO)" fieldKey="ds_rechtsgrundlage" data={local} onChange={set} big />
                  <TextField label="Kategorien betroffener Daten" fieldKey="ds_datenarten" data={local} onChange={set} big />
                  <TextField label="Kategorien betroffener Personen" fieldKey="ds_betroffene" data={local} onChange={set} />
                  <TextField label="Empfänger / Übermittlungen" fieldKey="ds_empfaenger" data={local} onChange={set} />
                  <TextField label="Löschfristen" fieldKey="ds_loeschfrist" data={local} onChange={set} />
                </div>
              )}

              {/* ── SCHRITT 3 ── */}
              {tab === 5 && (
                <div>
                  <SectionTitle>Risikobewertung — Wahrscheinlichkeit × Schwere</SectionTitle>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface2)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>{tx('Risiko')}</th>
                          <th style={{ padding: '8px 12px', fontSize: 12, color: 'var(--muted)', minWidth: 170 }}>{tx('Wahrscheinlichkeit')}</th>
                          <th style={{ padding: '8px 12px', fontSize: 12, color: 'var(--muted)', minWidth: 170 }}>{tx('Schwere')}</th>
                          <th style={{ padding: '8px 12px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{tx('Score')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DSFA_RISK_ITEMS.map(item => (
                          <RisikoRow key={item.key} item={item} data={local} onChange={set} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                    {tx('Score = Wahrscheinlichkeit × Schwere: 1–2 = Niedrig · 3–5 = Mittel · 6–9 = Hoch')}
                  </div>
                </div>
              )}

              {/* ── SCHRITT 4 ── */}
              {tab === 6 && (
                <div>
                  <SectionTitle>Technische und organisatorische Maßnahmen (TOMs)</SectionTitle>
                  <TextField label="TOMs — Beschreibung der Schutzmaßnahmen" fieldKey="ds_toms" data={local} onChange={set} big />

                  <SectionTitle>DSB-Konsultation & Status</SectionTitle>
                  <div className="fg">
                    <div className="fgroup">
                      <label className="fl">{tx('DSB-Konsultationsdatum')}</label>
                      <input
                        type="date" value={s(local, 'ds_dsbdate')}
                        onChange={e => set('ds_dsbdate', e.target.value)}
                      />
                    </div>
                    <div className="fgroup">
                      <label className="fl">{tx('DSFA-Status')}</label>
                      <select value={s(local, 'ds_status') || 'Ausstehend'} onChange={e => set('ds_status', e.target.value)}>
                        {['Ausstehend', 'In Bearbeitung', 'Abgeschlossen', 'Nicht erforderlich'].map(o => (
                          <option key={o} value={o}>{tx(o)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Gesamt-Status-Box */}
                  {(() => {
                    const st = s(local, 'ds_status') || 'Ausstehend';
                    const color = st === 'Abgeschlossen' ? 'var(--green)' : st === 'Nicht erforderlich' ? 'var(--accent)' : 'var(--yellow)';
                    return (
                      <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 14, marginTop: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 4 }}>
                          {tx('Status')}: {tx(st)}
                        </div>
                        {s(local, 'ds_dsbdate') && (
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {tx('DSB konsultiert am')}: {new Date(s(local, 'ds_dsbdate')).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE')}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          </div>

          {/* Navigations-Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button className="btn btn-outline" onClick={() => setTab(n => Math.max(0, n - 1))} disabled={tab === 0}>
              ← {t('common.back')}
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? `⏳ ${t('common.saving')}` : `💾 ${t('common.save')}`}
            </button>
            <button className="btn btn-outline" onClick={() => setTab(n => Math.min(TABS.length - 1, n + 1))} disabled={tab === TABS.length - 1}>
              {t('common.next')} →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
