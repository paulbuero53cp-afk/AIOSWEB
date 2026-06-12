import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAppConfig } from '@/context/AppConfigContext';

type Lang = 'de' | 'en';

const NAV = [
  { num: '01', id: 's01', de: 'Definition',        en: 'Definition' },
  { num: '02', id: 's02', de: 'Scope',              en: 'Scope' },
  { num: '03', id: 's03', de: 'Governance-Prinzip', en: 'Governance Principle' },
  { num: '04', id: 's04', de: 'Trigger',            en: 'Triggers' },
  { num: '05', id: 's05', de: 'Governance-Tiers',   en: 'Governance Tiers' },
  { num: '06', id: 's06', de: 'Red Lines',          en: 'Red Lines' },
  { num: '07', id: 's07', de: 'Principles',         en: 'Principles' },
  { num: '08', id: 's08', de: 'Reliability',        en: 'Reliability' },
  { num: '09', id: 's09', de: 'Automatisierung',    en: 'Automation' },
  { num: '10', id: 's10', de: 'Control Triangle',   en: 'Control Triangle' },
  { num: '11', id: 's11', de: 'Beispiele',          en: 'Examples' },
  { num: '12', id: 's12', de: 'Grundprinzip',       en: 'Foundation' },
  { num: '13', id: 's13', de: 'Meine Rolle',        en: 'My Role' },
];

// ── Helpers ───────────────────────────────────────────────────

function Section({ id, num, title, children }: { id: string; num: string; title: string; children: ReactNode }) {
  return (
    <div id={id} style={{ marginBottom: 40, scrollMarginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{num}</span>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--petrol)', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent)', margin: '18px 0 10px' }}>{children}</div>;
}

function ChemBox({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--accent-pale)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
      <span style={{ fontSize: 18 }}>🧪</span>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent)', marginBottom: 2 }}>In unserer Welt</div>
        <div style={{ fontSize: 13, color: 'var(--petrol)' }}>{text}</div>
      </div>
    </div>
  );
}

function CheckList({ label, color, items }: { label: string; color: string; items: string[] }) {
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${color}30`, borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 10 }}>{label}</div>
      {items.map(item => (
        <div key={item} style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 6, display: 'flex', gap: 8, lineHeight: 1.4 }}>
          <span style={{ color, flexShrink: 0 }}>{label.startsWith('✓') ? '✓' : '✗'}</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function AiStrategy({ onNav }: { onNav?: (s: string) => void }) {
  const [lang, setLang] = useState<Lang>('de');
  const [active, setActive] = useState('s01');
  const contentRef = useRef<HTMLDivElement>(null);
  const { name: companyName } = useAppConfig();

  const t = (de: string, en: string) => lang === 'de' ? de : en;

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    const container = contentRef.current;
    if (!el || !container) return;
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    container.scrollBy({ top: elRect.top - cRect.top - 24, behavior: 'smooth' });
    setActive(id);
  }

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    function onScroll() {
      const cTop = container!.getBoundingClientRect().top;
      let cur = NAV[0].id;
      for (const { id } of NAV) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - cTop <= 80) cur = id;
      }
      setActive(cur);
    }
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ display: 'flex', margin: '-20px -22px', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* ── Left Nav ─────────────────────────────────────── */}
      <div style={{
        width: 196, minWidth: 196, background: 'var(--petrol)',
        display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%',
      }}>
        {onNav && (
          <button onClick={() => onNav('dashboard')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,.55)', fontSize: 12, padding: '14px 16px',
            textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,.08)',
            display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font)',
          }}>
            ← AIOS
          </button>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {NAV.map(({ num, id, de, en }) => (
            <div key={id} onClick={() => scrollTo(id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px',
              cursor: 'pointer', transition: 'all .12s',
              color: active === id ? '#fff' : 'rgba(255,255,255,.5)',
              background: active === id ? 'rgba(77,128,128,.2)' : 'none',
              borderLeft: active === id ? '3px solid var(--accent)' : '3px solid transparent',
              fontSize: 12.5,
            }}>
              <span style={{
                fontFamily: 'DM Mono, monospace', fontSize: 10,
                color: active === id ? 'var(--accent-light)' : 'rgba(255,255,255,.3)',
                flexShrink: 0, minWidth: 20,
              }}>{num}</span>
              <span>{lang === 'de' ? de : en}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', gap: 6 }}>
          {(['de', 'en'] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              flex: 1, padding: '5px 0', border: '1px solid rgba(255,255,255,.18)',
              borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: lang === l ? 'var(--accent)' : 'transparent',
              color: lang === l ? '#fff' : 'rgba(255,255,255,.45)',
              fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '.06em',
            }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', height: '100%', padding: '28px 36px', background: 'var(--bg)' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
            Artificial Intelligence Operating System (AIOS) · {t('Zentrales Referenzartefakt', 'Central Reference Document')}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--petrol)', marginBottom: 8 }}>AI @ {companyName}</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 600, lineHeight: 1.65 }}>
            {t(
              'Das verbindliche Rahmenwerk für alle KI-Aktivitäten — Definition, Governance, Risiko, Reliability und strategische Leitplanken.',
              'The binding framework for all AI activities — definition, governance, risk, reliability and strategic guardrails.',
            )}
          </div>
          <div style={{
            marginTop: 18, background: 'var(--surface)', border: '1px solid var(--border)',
            borderLeft: '4px solid var(--accent)', borderRadius: '0 8px 8px 0',
            padding: '12px 18px', maxWidth: 540, display: 'inline-block',
          }}>
            <div style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--petrol)', marginBottom: 3 }}>
              💬 "If you can't show it, you don't have it."
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{companyName} · {t('Governance-Leitsatz', 'Governance Principle')}</div>
          </div>
        </div>

        {/* ── 01 Definition ────────────────────────────── */}
        <Section id="s01" num="01" title={t('Definition von KI', 'Definition of AI')}>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            {t(
              `KI wird bei ${companyName} über die verwendete Technologie definiert — nicht über Anwendungsfall, Business Impact oder Skalierung.`,
              `AI at ${companyName} is defined by the technology used — not by use case, business impact or scale.`,
            )}
          </p>
          <ChemBox text={t('Ein Stoff ist das, was er ist — unabhängig vom Einsatzgebiet', 'A substance is what it is — regardless of its application area')} />

          <Sub>{t('Als KI gelten — drei Technologien', 'What counts as AI — three technologies')}</Sub>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 22 }}>
            {[
              { l: 'A', title: t('Generative KI (GenAI)', 'Generative AI (GenAI)'), desc: t('Sprachliche, bildliche oder code-basierte Generierung', 'Language, image or code-based generation') },
              { l: 'B', title: 'Machine Learning', desc: t('Modelle, die aus Daten lernen und Muster erkennen', 'Models that learn from data and recognise patterns') },
              { l: 'C', title: 'Deep Neural Networks', desc: t('DNN — eingeschränkte Interpretierbarkeit, tiefe Netze', 'DNN — limited interpretability, deep networks') },
            ].map(({ l, title, desc }) => (
              <div key={l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.1em', marginBottom: 5 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--petrol)', marginBottom: 5 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>

          <Sub>{t('Zweiteilige Definition — beide Dimensionen gelten', 'Two-part definition — both dimensions apply')}</Sub>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
            {[
              { dim: 'A', title: t('KI im Einsatz', 'AI in Use'), text: t('Nutzung von KI in Systemen, Prozessen oder Produkten.', 'Use of AI in systems, processes or products.') },
              { dim: 'B', title: t('KI in der Erstellung', 'AI in Creation'), text: t('Nutzung von KI im Entwicklungsprozess — auch wenn das Endergebnis deterministisch ist.', 'Use of AI in the development process — even if the end result is deterministic.') },
            ].map(({ dim, title, text }) => (
              <div key={dim} style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.1em', marginBottom: 4 }}>Dimension {dim}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--petrol)', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{text}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <CheckList label={t('✓ Als KI eingeordnet', '✓ Classified as AI')} color="var(--green)" items={[
              t('Modelle mit automatischer Mustererkennung', 'Models with automatic pattern recognition'),
              t('Systeme mit eingeschränkter Interpretierbarkeit', 'Systems with limited interpretability'),
              t('Generative oder probabilistische Modelle', 'Generative or probabilistic models'),
              t('GenAI-generierter Code (auch wenn Ergebnis deterministisch)', 'GenAI-generated code (even if result is deterministic)'),
            ]} />
            <CheckList label={t('✗ Nicht als KI definiert', '✗ Not defined as AI')} color="var(--muted)" items={[
              t('Klassische statistische Modelle (z.B. SAP Forecasting)', 'Classic statistical models (e.g. SAP Forecasting)'),
              t('Regelbasierte Systeme ohne Lernfähigkeit', 'Rule-based systems without learning capability'),
            ]} />
          </div>
        </Section>

        {/* ── 02 Scope ─────────────────────────────────── */}
        <Section id="s02" num="02" title={t('Scope des aktuellen KI-Programms', 'Scope of Current AI Programme')}>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            {t('KI-Aktivitäten lassen sich als 5×3-Matrix beschreiben. Der aktuelle Fokus liegt auf zwei Feldern.', 'AI activities can be described as a 5×3 matrix. The current focus is on two fields.')}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {[t('KI-Typ', 'AI Type'), t('Administration', 'Administration'), t('Produktion / Logistik', 'Production / Logistics'), t('Produkt', 'Product')].map(h => (
                    <th key={h} style={{ background: 'var(--surface2)', padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', border: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { type: t('Generative KI (GenAI)', 'Generative AI (GenAI)'), cols: ['active', '', ''] },
                  { type: t('Predictive AI', 'Predictive AI'), cols: ['active', '', ''] },
                  { type: t('Computer Vision & Audio', 'Computer Vision & Audio'), cols: ['', '', ''] },
                  { type: t('Physical AI (Robotic)', 'Physical AI (Robotic)'), cols: ['', '', ''] },
                  { type: t('Spezialisierte Modelle', 'Specialised Models'), cols: ['', '', ''] },
                ].map(({ type, cols }) => (
                  <tr key={type}>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--border)', fontWeight: 500 }}>{type}</td>
                    {cols.map((c, i) => (
                      <td key={i} style={{ padding: '10px 14px', border: '1px solid var(--border)', textAlign: 'center', background: c === 'active' ? 'var(--green-bg)' : undefined }}>
                        {c === 'active'
                          ? <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 12 }}>✓ {t('Aktiver Fokus', 'Active Focus')}</span>
                          : <span style={{ color: 'var(--muted)' }}>–</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            {t('Alle Felder ohne Markierung sind aktuell nicht Bestandteil des Programms.', 'All unmarked fields are not currently part of the programme.')}
          </div>
        </Section>

        {/* ── 03 Governance-Prinzip ─────────────────────── */}
        <Section id="s03" num="03" title={t('Governance-Grundprinzip', 'Governance Principle')}>
          <ChemBox text={t('Das AIOS ist das Qualitätsmanagementsystem für den Rohstoff KI', 'AIOS is the quality management system for the raw material AI')} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 8 }}>
            {[
              { icon: '🔍', sub: t('Die KI-Definition', 'The AI Definition'), title: t('Bewusst breit', 'Intentionally broad'), text: t('Erfasst alle relevanten Technologien — damit nichts im Verborgenen bleibt.', 'Captures all relevant technologies — so nothing remains hidden.') },
              { icon: '🎯', sub: t('Die Governance-Anwendung', 'Governance Application'), title: t('Bewusst selektiv', 'Intentionally selective'), text: t('Nicht jede KI-Nutzung braucht volle Governance. Die Trigger entscheiden.', 'Not every AI use requires full governance. Triggers decide.') },
              { icon: '⚙️', sub: 'AI Operating System', title: 'AIOS', text: t('Gleichzeitig ein Managementsystem und ein kulturelles System.', 'Simultaneously a management system and a cultural system.') },
              { icon: '👁️', sub: t('Unkontrollierte Nutzung', 'Uncontrolled Use'), title: 'Shadow AI', text: t('Adressiert durch Selbstdeklaration und kulturelle Verankerung — nicht durch Verbote.', 'Addressed through self-declaration and cultural anchoring — not by prohibition.') },
            ].map(({ icon, sub, title, text }) => (
              <div key={title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{sub}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--petrol)', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{text}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 04 Trigger ───────────────────────────────── */}
        <Section id="s04" num="04" title={t('Governance-Trigger', 'Governance Triggers')}>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            {t('Governance wird nur dann aktiviert, wenn mindestens eines dieser Kriterien erfüllt ist.', 'Governance is only activated when at least one of these criteria is met.')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
            {[
              t('KI ist in Systeme oder Workflows integriert', 'AI is integrated into systems or workflows'),
              t('KI-Ergebnisse werden geteilt oder wiederverwendet', 'AI results are shared or reused'),
              t('KI beeinflusst Entscheidungen über den individuellen Nutzer hinaus', 'AI influences decisions beyond the individual user'),
              t('KI wird skaliert oder operationalisiert', 'AI is scaled or operationalised'),
            ].map((text, i) => (
              <div key={i} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderTop: '3px solid var(--accent)', borderRadius: '0 0 8px 8px', padding: '14px 16px',
              }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>T0{i + 1}</div>
                <div style={{ fontSize: 13, color: 'var(--petrol)', lineHeight: 1.5 }}>{text}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 05 Governance-Tiers ──────────────────────── */}
        <Section id="s05" num="05" title={t('Governance-Tiers & Risikohaltung', 'Governance Tiers & Risk Posture')}>
          <ChemBox text={t('Gefahrklassen: vom Laborreagenz bis zur behördlichen Betriebsgenehmigung', 'Hazard classes: from lab reagent to regulatory operating permit')} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              {
                tier: 'Tier 1', color: 'var(--green)',
                title: t('Persönliche / Assistive KI', 'Personal / Assistive AI'),
                items: [t('Individuelle Nutzung (z.B. Copilot)', 'Individual use (e.g. Copilot)'), t('Keine Systemabhängigkeit', 'No system dependency'), t('Keine entscheidungsrelevante Weitergabe', 'No decision-relevant sharing')],
                badge: '→ Guidelines',
              },
              {
                tier: 'Tier 2', color: 'var(--yellow)',
                title: t('Team / Entscheidungsunterstützung', 'Team / Decision Support'),
                items: [t('Nutzung im Team', 'Team use'), t('Einfluss auf Entscheidungen', 'Influence on decisions'), t('Interne Wirkung', 'Internal impact')],
                badge: '→ Steering Group',
              },
              {
                tier: 'Tier 3', color: 'var(--red)',
                title: t('Operative / System-KI', 'Operational / System AI'),
                items: [t('Integration in Workflows', 'Integration into workflows'), t('Kundenwirksam oder automatisiert', 'Customer-impacting or automated'), t('Skalierter Einsatz', 'Scaled deployment')],
                badge: t('→ Vollständige Governance (Gates A/B/C)', '→ Full Governance (Gates A/B/C)'),
              },
            ].map(({ tier, color, title, items, badge }) => (
              <div key={tier} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, borderRadius: '0 0 8px 8px', padding: '16px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>{tier}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--petrol)', marginBottom: 10 }}>{title}</div>
                {items.map(item => (
                  <div key={item} style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 5, display: 'flex', gap: 6 }}>
                    <span style={{ flexShrink: 0 }}>•</span><span>{item}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, padding: '4px 10px', background: 'var(--surface2)', borderRadius: 5, fontSize: 11, fontWeight: 600, color }}>{badge}</div>
              </div>
            ))}
          </div>
          <Sub>{t('Risikohaltung je Kategorie', 'Risk posture per category')}</Sub>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { color: 'var(--green)', title: t('Kategorie 1 · Hohe Bereitschaft', 'Category 1 · High Readiness'), sub: t('Interne Produktivität', 'Internal Productivity'), ex: t('Bsp: Copilot, interne Assistenz', 'Ex: Copilot, internal assistance'), fLabel: t('Fokus', 'Focus'), fVal: t('Geschwindigkeit', 'Speed') },
              { color: 'var(--yellow)', title: t('Kategorie 2 · Mittlere Bereitschaft', 'Category 2 · Medium Readiness'), sub: t('Entscheidungsunterstützung', 'Decision Support'), ex: t('Bsp: Planung, Pricing', 'Ex: Planning, Pricing'), fLabel: t('Ansatz', 'Approach'), fVal: t('Kontrollierte Experimente', 'Controlled Experiments') },
              { color: 'var(--red)', title: t('Kategorie 3 · Niedrige Bereitschaft', 'Category 3 · Low Readiness'), sub: t('Kundenwirkung', 'Customer Impact'), ex: t('Bsp: Chatbots, autom. Entscheidungen', 'Ex: Chatbots, automated decisions'), fLabel: t('Prüfintensität', 'Review Intensity'), fVal: t('Hoch', 'High') },
            ].map(({ color, title, sub, ex, fLabel, fVal }) => (
              <div key={title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{sub}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--petrol)', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{ex}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}><strong>{fLabel}:</strong> {fVal}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 06 Red Lines ─────────────────────────────── */}
        <Section id="s06" num="06" title={t('Strategische Leitplanken — Red Lines', 'Strategic Guardrails — Red Lines')}>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            {t('Diese Grenzen sind nicht verhandelbar — unabhängig von Tier, Kontext oder Geschäftsdruck.', 'These boundaries are non-negotiable — regardless of tier, context or business pressure.')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              t('Keine KI-Entscheidung ohne verantwortlichen Menschen', 'No AI decision without a responsible human'),
              t('Keine Nutzung sensibler Daten ohne explizite Freigabe', 'No use of sensitive data without explicit authorisation'),
              t('Keine vollautomatisierten kundenwirksamen Entscheidungen ohne Genehmigung', 'No fully automated customer-impacting decisions without approval'),
              t('Keine Black-Box-Modelle in kritischen Prozessen ohne Erklärbarkeit', 'No black-box models in critical processes without explainability'),
              t('Bei Unsicherheit über Datenschutz: CISO kontaktieren und Nutzung aussetzen', 'If uncertain about data protection: contact CISO and suspend use'),
            ].map((text, i) => (
              <div key={i} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderLeft: '4px solid var(--red)', borderRadius: '0 8px 8px 0', padding: '12px 16px',
              }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--red)', fontWeight: 700, flexShrink: 0 }}>0{i + 1}</span>
                <span style={{ fontSize: 13.5, color: 'var(--petrol)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 07 Principles ────────────────────────────── */}
        <Section id="s07" num="07" title="Operating Principles">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
            {[
              { icon: '🔀', title: 'Gates A / B / C', sub: null, text: t('Alle Use Cases durchlaufen definierte Gates. Kein Use Case geht ohne Gate-Freigabe in den operativen Betrieb.', 'All use cases go through defined gates. No use case enters operational use without gate approval.') },
              { icon: '👤', title: t('Jedes KI-System benötigt', 'Every AI system requires'), sub: 'Owner · Monitoring · Fallback', text: t('Einen benannten Owner, aktives Monitoring und definierte Fallback-Mechanismen.', 'A named owner, active monitoring and defined fallback mechanisms.') },
              { icon: '📋', title: t('Portfolio-Entscheidungen', 'Portfolio Decisions'), sub: 'Steering Group', text: t('Start / Scale / Stop / Hold / Backlog — entschieden in der Steering Group.', 'Start / Scale / Stop / Hold / Backlog — decided in the Steering Group.') },
              { icon: '🎯', title: t('Strategische Ausrichtung', 'Strategic Alignment'), sub: 'Strategy Group', text: t('Priorisierung und strategische Leitlinien durch die Strategy Group.', 'Prioritisation and strategic guidelines by the Strategy Group.') },
            ].map(({ icon, title, sub, text }) => (
              <div key={title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px' }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--petrol)', marginBottom: sub ? 3 : 8 }}>{title}</div>
                {sub && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>{sub}</div>}
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>{text}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 08 Reliability ───────────────────────────── */}
        <Section id="s08" num="08" title={t('AI Reliability Framework', 'AI Reliability Framework')}>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            {t(
              'Der Governance-Tier beschreibt die organisatorische Verantwortungsebene. Der Reliability Tier (R-Tier) beschreibt, wie ein KI-System technisch betrieben und überwacht wird — unabhängig von der Organisationsstruktur.',
              'The Governance Tier describes the organisational accountability level. The Reliability Tier (R-Tier) describes how an AI system is technically operated and monitored — independently of the organisational structure.',
            )}
          </p>

          {/* R-Tier Matrix */}
          <Sub>{t('R-Tier — Betriebsklassifikation (R1–R5)', 'R-Tier — Operational Classification (R1–R5)')}</Sub>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {[
              { tier: 'R1', color: '#22c55e', title: t('Persönlicher Assistent', 'Personal Assistant'), oversight: 'HITL', desc: t('Mensch entscheidet aktiv bei jeder Ausgabe. KI empfiehlt — keine autonome Wirkung.', 'Human decides actively for every output. AI recommends — no autonomous effect.'), controls: t('Keine Pflichtkontrollen', 'No mandatory controls') },
              { tier: 'R2', color: '#84cc16', title: t('Team-Tool', 'Team Tool'), oversight: 'HITL', desc: t('KI-Ergebnisse werden im Team genutzt oder weitergegeben. Mensch bestätigt explizit vor Wirkung.', 'AI results are used or shared within the team. Human confirms explicitly before effect.'), controls: t('Keine Pflichtkontrollen', 'No mandatory controls') },
              { tier: 'R3', color: '#f59e0b', title: t('Entscheidungsunterstützung', 'Decision Support'), oversight: 'HOTL', desc: t('System handelt in definierten Grenzen. Mensch kann jederzeit eingreifen (Kill-Switch erforderlich).', 'System acts within defined boundaries. Human can intervene at any time (kill switch required).'), controls: t('Kill-Switch, Tracing, Bounded Autonomy, Rollback, Monitoring SLA', 'Kill-Switch, Tracing, Bounded Autonomy, Rollback, Monitoring SLA') },
              { tier: 'R4', color: '#f97316', title: t('Automatisierter Prozess', 'Automated Process'), oversight: 'HOTL', desc: t('Weitgehend automatisiert. Mensch überwacht per Stichprobe und definiertem Monitoring.', 'Largely automated. Human monitors via spot checks and defined monitoring.'), controls: t('Kill-Switch, Tracing, Bounded Autonomy, Rollback, Monitoring SLA', 'Kill-Switch, Tracing, Bounded Autonomy, Rollback, Monitoring SLA') },
              { tier: 'R5', color: '#ef4444', title: t('Agentic System', 'Agentic System'), oversight: t('Autonom', 'Autonomous'), desc: t('Vollautonomes System plant und führt Schritte ohne Bestätigung aus. Höchste Kontrollanforderungen.', 'Fully autonomous system plans and executes steps without confirmation. Highest control requirements.'), controls: t('R3/R4-Kontrollen + Boundary Map, Eskalationspfad, Multi-Agent-Doku', 'R3/R4 controls + Boundary Map, Escalation Path, Multi-Agent Doc') },
            ].map(({ tier, color, title, oversight, desc, controls }) => (
              <div key={tier} style={{ display: 'flex', gap: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: 6, background: color, flexShrink: 0 }} />
                <div style={{ padding: '12px 16px', flex: 1, display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: '0 20px', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, color }}>{tier}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{oversight}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--petrol)', marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 4 }}>{t('Pflichtkontrollen', 'Mandatory Controls')}</div>
                    <div style={{ fontSize: 11.5, color: color, lineHeight: 1.5 }}>{controls}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Abgrenzung Governance vs Reliability */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent)', marginBottom: 12 }}>
              {t('Governance-Tier vs. R-Tier — Abgrenzung', 'Governance Tier vs. R-Tier — Distinction')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--petrol)', marginBottom: 6 }}>{t('Governance-Tier (1/2/3)', 'Governance Tier (1/2/3)')}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  {t('Wer trägt die Verantwortung? Welche organisatorischen Prozesse greifen? Welche Gates müssen durchlaufen werden?', 'Who bears responsibility? Which organisational processes apply? Which gates must be completed?')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--petrol)', marginBottom: 6 }}>{t('R-Tier (R1–R5)', 'R-Tier (R1–R5)')}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  {t('Wie autonom läuft das System? Welche technischen Sicherheitsmechanismen sind Pflicht? Welches Oversight-Modell gilt?', 'How autonomously does the system run? Which technical safety mechanisms are mandatory? Which oversight model applies?')}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--accent-pale)', borderRadius: 6, fontSize: 12, color: 'var(--petrol)' }}>
              💡 {t('Ein Tier-1-System (persönlich) kann R3 sein, wenn es automatisiert läuft. Ein Tier-3-System ist mindestens R3, meist R4 oder R5.', 'A Tier-1 system (personal) can be R3 if it runs automatically. A Tier-3 system is at least R3, usually R4 or R5.')}
            </div>
          </div>

          {/* Failure Modes */}
          <Sub>{t('Die 5 Reliability Failure Modes', 'The 5 Reliability Failure Modes')}</Sub>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
            {t(
              'Für jeden Use Case werden bekannte Risikokategorien im AIOS erfasst. Sie bestimmen, welche Kontrollen und Monitoring-Maßnahmen erforderlich sind.',
              'For each use case, known risk categories are recorded in AIOS. They determine which controls and monitoring measures are required.',
            )}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { code: 'FM-1', color: '#f97316', title: t('Accuracy Failure', 'Accuracy Failure'), desc: t('Modellfehler oder systematisch falsche Ergebnisse — Abweichung von erwarteter Qualität.', 'Model errors or systematically wrong results — deviation from expected quality.') },
              { code: 'FM-2', color: '#a855f7', title: t('Inkonsistenz', 'Inconsistency'), desc: t('Gleiche Eingabe erzeugt unterschiedliche Ausgaben — Non-Determinismus unkontrolliert.', 'Same input produces different outputs — non-determinism uncontrolled.') },
              { code: 'FM-3', color: '#3b82f6', title: t('Temporal Drift', 'Temporal Drift'), desc: t('Modellqualität verschlechtert sich über Zeit durch veränderte Daten oder Umgebungsbedingungen.', 'Model quality degrades over time due to changed data or environmental conditions.') },
              { code: 'FM-4', color: '#ef4444', title: t('Agentic Eskalation', 'Agentic Escalation'), desc: t('Autonomes System überschreitet definierten Handlungsrahmen — unkontrolliertes Verhalten.', 'Autonomous system exceeds defined action scope — uncontrolled behaviour.') },
              { code: 'FM-5', color: '#6b7280', title: t('Infrastruktur-Ausfall', 'Infrastructure Failure'), desc: t('Abhängige Dienste (APIs, Modelle, Datenquellen) nicht verfügbar — Systemausfall oder Stille.', 'Dependent services (APIs, models, data sources) unavailable — system failure or silent failure.') },
            ].map(({ code, color, title, desc }) => (
              <div key={code} style={{ background: 'var(--surface)', border: `1px solid ${color}30`, borderTop: `3px solid ${color}`, borderRadius: '0 0 8px 8px', padding: '14px 16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 700, color, marginBottom: 5 }}>{code}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--petrol)', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Pflichtkontrollen R3+ */}
          <Sub>{t('Pflichtkontrollen ab R3', 'Mandatory Controls from R3')}</Sub>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid #f59e0b40', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 10 }}>R3 / R4 — {t('Reliability Controls', 'Reliability Controls')}</div>
              {[
                { c: 'RC-1', l: t('Kill-Switch', 'Kill Switch'), d: t('Dokumentiert, implementiert und regelmäßig getestet', 'Documented, implemented and regularly tested') },
                { c: 'RC-2', l: t('Execution Tracing', 'Execution Tracing'), d: t('Alle Aktionen vollständig protokolliert', 'All actions fully logged') },
                { c: 'RC-3', l: t('Bounded Autonomy', 'Bounded Autonomy'), d: t('Scope, Limits und Grenzwerte dokumentiert', 'Scope, limits and thresholds documented') },
                { c: 'RC-4', l: t('Rollback-Prozess', 'Rollback Process'), d: t('Beschrieben, getestet, für alle Betreiber bekannt', 'Described, tested, known to all operators') },
                { c: 'RC-5', l: t('Monitoring SLA', 'Monitoring SLA'), d: t('Vereinbart, konfiguriert und im Betrieb validiert', 'Agreed, configured and validated in operation') },
              ].map(({ c, l, d }) => (
                <div key={c} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#f59e0b', fontWeight: 700, flexShrink: 0, paddingTop: 1 }}>{c}</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--petrol)' }}>{l}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid #ef444440', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 10 }}>R5 — {t('Agentic Controls (zusätzlich)', 'Agentic Controls (additional)')}</div>
              {[
                { c: 'AC-1', l: t('Agentic Boundary Map', 'Agentic Boundary Map'), d: t('Erlaubte Aktionen und Systemgrenzen vollständig dokumentiert', 'Permitted actions and system boundaries fully documented') },
                { c: 'AC-2', l: t('Human Escalation Path', 'Human Escalation Path'), d: t('Automatische Eskalation konfiguriert und getestet', 'Automatic escalation configured and tested') },
                { c: 'AC-3', l: t('Multi-Agent-Dokumentation', 'Multi-Agent Documentation'), d: t('Abhängigkeiten, Datenaustausch und Fehlerbehandlung dokumentiert', 'Dependencies, data exchange and error handling documented') },
              ].map(({ c, l, d }) => (
                <div key={c} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#ef4444', fontWeight: 700, flexShrink: 0, paddingTop: 1 }}>{c}</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--petrol)' }}>{l}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{d}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#ef444412', borderRadius: 6, fontSize: 11.5, color: '#ef4444' }}>
                ⚠ {t('R5-Systeme erfordern explizite Genehmigung durch die Governance-Steering-Group.', 'R5 systems require explicit approval from the Governance Steering Group.')}
              </div>
            </div>
          </div>
        </Section>

        {/* ── 09 Automation ────────────────────────────── */}
        <Section id="s09" num="09" title={t('Automatisierungsgrenzen', 'Automation Boundaries')}>
          <div style={{ background: 'var(--accent-pale)', border: '1px solid var(--accent)', borderRadius: 8, padding: '13px 18px', marginBottom: 20, fontSize: 14, fontWeight: 600, color: 'var(--petrol)' }}>
            ⚖ {t('Human-in-the-loop ist der Standard — nicht die Ausnahme.', 'Human-in-the-loop is the standard — not the exception.')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AutoBlock code="B1" title={t('Verantwortlichkeit', 'Accountability')} sub={t('Nicht verhandelbar', 'Non-negotiable')}>
              <BadgeLine badge={t('Standard', 'Standard')} color="var(--green)" text={t('Jeder KI-Prozess benötigt einen klar benannten menschlichen Verantwortlichen.', 'Every AI process requires a clearly named human responsible party.')} />
            </AutoBlock>
            <AutoBlock code="B2" title={t('Entscheidungslogik', 'Decision Logic')} sub={t('Was ist erlaubt?', 'What is permitted?')}>
              <BadgeLine badge={t('Erlaubt', 'Permitted')} color="var(--green)" text={t('KI empfiehlt → Mensch entscheidet (Standard)', 'AI recommends → Human decides (Standard)')} />
              <BadgeLine badge={t('Bedingt', 'Conditional')} color="var(--yellow)" text={t('KI handelt innerhalb definierter, vorab genehmigter Grenzen', 'AI acts within defined, pre-approved limits')} />
              <BadgeLine badge={t('Eingeschränkt', 'Restricted')} color="var(--red)" text={t('Vollständig autonome Entscheidungen mit externer Wirkung', 'Fully autonomous decisions with external impact')} />
            </AutoBlock>
            <AutoBlock code="B3" title={t('Explizite Freigabe', 'Explicit Authorisation')} sub={t('Sensible Bereiche', 'Sensitive Areas')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
                {[t('Pricing und Konditionsentscheidungen', 'Pricing and terms decisions'), t('Kundenkommunikation', 'Customer communication'), t('HR-Entscheidungen', 'HR decisions'), t('Finanzielle Verpflichtungen', 'Financial commitments')].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 7, fontSize: 12.5, color: 'var(--petrol)', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--yellow)', fontWeight: 700, flexShrink: 0 }}>→</span><span>{item}</span>
                  </div>
                ))}
              </div>
            </AutoBlock>
            <AutoBlock code="B4" title={t('Reversibilität', 'Reversibility')} sub={t('Entscheidungstypen', 'Decision Types')}>
              <BadgeLine badge={t('Zulässig', 'Permitted')} color="var(--green)" text={t('Reversible Entscheidungen — können korrigiert werden', 'Reversible decisions — can be corrected')} />
              <BadgeLine badge={t('Eingeschränkt', 'Restricted')} color="var(--red)" text={t('Irreversible Entscheidungen — erhöhte Anforderungen', 'Irreversible decisions — increased requirements')} />
            </AutoBlock>
          </div>
        </Section>

        {/* ── 10 Control Triangle ──────────────────────── */}
        <Section id="s10" num="10" title={t('AI Control Triangle', 'AI Control Triangle')}>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
            {t('Die strategische Steuerung von KI basiert auf drei gleichwertigen Dimensionen. Jede Verschiebung in einer Dimension beeinflusst die anderen beiden.', 'Strategic AI governance is based on three equal dimensions. Any shift in one dimension affects the other two.')}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{ position: 'relative', width: 280, height: 230 }}>
              <svg viewBox="0 0 280 230" style={{ width: '100%', height: '100%' }}>
                <polygon points="140,24 264,210 16,210" fill="var(--accent-pale)" stroke="var(--accent)" strokeWidth="2.5" />
                <circle cx="140" cy="24" r="7" fill="var(--accent)" />
                <circle cx="264" cy="210" r="7" fill="var(--accent)" />
                <circle cx="16" cy="210" r="7" fill="var(--accent)" />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -22px)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--petrol)' }}>{t('Investment', 'Investment')}</span>
              </div>
              <div style={{ position: 'absolute', bottom: -4, right: -8, textAlign: 'right', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--petrol)' }}>{t('Risikobereitschaft', 'Risk Appetite')}</span>
              </div>
              <div style={{ position: 'absolute', bottom: -4, left: -8, textAlign: 'left', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--petrol)' }}>{t('Automatisierungsgrenzen', 'Automation Limits')}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { num: '01', title: t('Investment', 'Investment'), text: t('Wie stark wird KI vorangetrieben — Ressourcen, Tempo, Ambition', 'How strongly AI is driven — resources, pace, ambition') },
              { num: '02', title: t('Risikobereitschaft', 'Risk Appetite'), text: t('Wie viel Risiko wird akzeptiert — differenziert nach Kategorie', 'How much risk is accepted — differentiated by category') },
              { num: '03', title: t('Automatisierungsgrenzen', 'Automation Limits'), text: t('Wo endet Automatisierung — Human-in-the-loop als Standard', 'Where automation ends — human-in-the-loop as standard') },
            ].map(({ num, title, text }) => (
              <div key={num} style={{ background: 'var(--accent-pale)', border: '1px solid var(--accent)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>{num}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--petrol)', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{text}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 11 Examples ──────────────────────────────── */}
        <Section id="s11" num="11" title={t('Einordnung — Beispiele', 'Classification — Examples')}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {[t('Anwendungsfall', 'Use Case'), t('KI?', 'AI?'), 'Gov-Tier', 'R-Tier', t('Begründung', 'Rationale')].map(h => (
                    <th key={h} style={{ background: 'var(--surface2)', padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', border: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { uc: t('SAP statistisches Forecasting', 'SAP Statistical Forecasting'), isAI: false, tier: '–', rtier: '–', reason: t('Regelbasiert, deterministisch', 'Rule-based, deterministic') },
                  { uc: t('SAP ML Forecast', 'SAP ML Forecast'), isAI: true, tier: 'Tier 2–3', rtier: 'R3–R4', reason: t('ML, Systemintegration, automatisiert', 'ML, system integration, automated') },
                  { uc: t('Copilot E-Mail', 'Copilot E-Mail'), isAI: true, tier: 'Tier 1', rtier: 'R1', reason: t('Generative KI, individuelle Nutzung, HITL', 'Generative AI, individual use, HITL') },
                  { uc: t('Customer Chatbot', 'Customer Chatbot'), isAI: true, tier: 'Tier 3', rtier: 'R4–R5', reason: t('Kundenwirksam, automatisiert, skaliert', 'Customer-impacting, automated, scaled') },
                  { uc: t('GenAI-generierter Code', 'GenAI-generated Code'), isAI: true, tier: 'Tier 1', rtier: 'R1', reason: t('KI in der Erstellung, Ergebnis deterministisch', 'AI in creation, result deterministic') },
                  { uc: t('Autonomer Einkaufs-Agent', 'Autonomous Procurement Agent'), isAI: true, tier: 'Tier 3', rtier: 'R5', reason: t('Agentic, finanzielle Wirkung, vollautomatisiert', 'Agentic, financial impact, fully automated') },
                ].map(({ uc, isAI, tier, rtier, reason }) => (
                  <tr key={uc}>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--border)', fontWeight: 500 }}>{uc}</td>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--border)' }}>
                      <span className={`badge ${isAI ? 'bg' : 'bgr'}`}>{isAI ? `✓ KI` : `✗ ${t('Kein KI', 'Not AI')}`}</span>
                    </td>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{tier}</td>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{rtier}</td>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12 }}>{reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── 12 Foundation ────────────────────────────── */}
        <Section id="s12" num="12" title={t('Grundprinzip', 'Foundation')}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ background: 'var(--petrol)', color: '#fff', borderRadius: 12, padding: '28px 36px', textAlign: 'center', maxWidth: 520 }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>🧭</div>
              <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.7 }}>
                {t(
                  'KI ist ein Unterstützungswerkzeug — keine autonome Entscheidungsinstanz. Die Verantwortung liegt immer beim Menschen.',
                  'AI is a support tool — not an autonomous decision-maker. Responsibility always lies with the human.',
                )}
              </div>
            </div>
          </div>
          <div style={{ padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
            {t(
              'Dieses Dokument ist das zentrale Referenzartefakt für alle anderen AIOS-Assets — Use Case Definition, Risk Tiering, Reliability Framework, Governance-Entscheidungen und Schulungen.',
              'This document is the central reference artefact for all other AIOS assets — use case definition, risk tiering, reliability framework, governance decisions and training.',
            )}
          </div>
          {onNav && (
            <div style={{ marginTop: 28, textAlign: 'center' }}>
              <button className="btn btn-outline" onClick={() => onNav('dashboard')}>← {t('Zurück zum Dashboard', 'Back to Dashboard')}</button>
            </div>
          )}
        </Section>

        {/* ── 13 My Role ───────────────────────────────── */}
        <Section id="s13" num="13" title={t('KI-Zuverlässigkeit & meine Rolle', 'AI Reliability & My Role')}>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
            {t(
              'Wenn du täglich mit KI-Systemen arbeitest, ist es wichtig zu verstehen, welche Rolle du spielst — und wann du eingreifen musst.',
              'When you work with AI systems daily, it is important to understand what role you play — and when you need to intervene.',
            )}
          </p>

          <Sub>{t('Zwei Betriebsmodi — was bin ich?', 'Two operating modes — which am I?')}</Sub>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--green)', borderRadius: '0 0 8px 8px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>HITL</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--petrol)', marginBottom: 8 }}>{t('Human In The Loop', 'Human In The Loop')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
                {t('Die KI gibt eine Empfehlung — du triffst aktiv die Entscheidung. Ohne deine explizite Bestätigung passiert nichts.', 'The AI gives a recommendation — you actively make the decision. Nothing happens without your explicit confirmation.')}
              </div>
              <div style={{ background: 'var(--green-bg)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                <strong>{t('Erkennungsmerkmal:', 'How to recognise it:')}</strong>{' '}
                {t('Du siehst eine Empfehlung und musst sie bestätigen, bevor sie wirksam wird.', 'You see a recommendation and must confirm it before it takes effect.')}
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--yellow)', borderRadius: '0 0 8px 8px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--yellow)', marginBottom: 6 }}>HOTL</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--petrol)', marginBottom: 8 }}>{t('Human On The Loop', 'Human On The Loop')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
                {t('Die KI handelt eigenständig — du überwachst den Prozess und kannst jederzeit eingreifen und stoppen.', 'The AI acts independently — you monitor the process and can intervene and stop it at any time.')}
              </div>
              <div style={{ background: 'var(--yellow-bg)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                <strong>{t('Erkennungsmerkmal:', 'How to recognise it:')}</strong>{' '}
                {t('Das System läuft automatisch. Du bekommst Benachrichtigungen bei Anomalien.', 'The system runs automatically. You receive notifications for anomalies.')}
              </div>
            </div>
          </div>

          <Sub>{t('Wann muss ich eingreifen?', 'When do I need to intervene?')}</Sub>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {[
              t('Ein Ergebnis ist unplausibel oder widerspricht dem gesunden Menschenverstand', 'A result is implausible or contradicts common sense'),
              t('Das System tut etwas, das außerhalb des erwarteten Rahmens liegt', 'The system does something that is outside the expected scope'),
              t('Du siehst eine Anomalie im Monitoring oder eine unerwartete Benachrichtigung', 'You see an anomaly in monitoring or an unexpected notification'),
              t('Du bist dir bei einem Ergebnis nicht sicher — im Zweifel immer stoppen', 'You are unsure about a result — when in doubt, always stop'),
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>0{i + 1}</span>
                <span style={{ fontSize: 13, color: 'var(--petrol)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>

          <Sub>{t('R-Tier — was bedeutet das für mich?', 'R-Tier — what does this mean for me?')}</Sub>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 24 }}>
            {[
              { tier: 'R1', color: '#22c55e', role: t('HITL immer', 'HITL always'), desc: t('Ich entscheide aktiv — die KI empfiehlt nur', 'I decide actively — the AI only recommends') },
              { tier: 'R2', color: '#84cc16', role: t('HITL mit Bestätigung', 'HITL with confirmation'), desc: t('Ich bestätige explizit, bevor die KI handelt', 'I confirm explicitly before the AI acts') },
              { tier: 'R3', color: '#f59e0b', role: t('HOTL — ich überwache', 'HOTL — I monitor'), desc: t('Ich kann jederzeit stoppen (Kill-Switch)', 'I can stop at any time (kill switch)') },
              { tier: 'R4', color: '#f97316', role: t('HOTL — Stichproben', 'HOTL — spot checks'), desc: t('Automatisiert — ich prüfe regelmäßig', 'Automated — I check regularly') },
              { tier: 'R5', color: '#ef4444', role: t('Agentic — nur Monitoring', 'Agentic — monitoring only'), desc: t('Vollautonomous — ich greife bei Eskalation ein', 'Fully autonomous — I intervene on escalation') },
            ].map(({ tier, color, role, desc }) => (
              <div key={tier} style={{ background: 'var(--surface)', border: `1px solid ${color}40`, borderTop: `3px solid ${color}`, borderRadius: '0 0 8px 8px', padding: '12px 14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>{tier}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--petrol)', marginBottom: 5 }}>{role}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>

          <Sub>{t('Was ist ein Agentic AI System?', 'What is an Agentic AI System?')}</Sub>
          <div style={{ background: 'var(--surface)', border: '1px solid #ef444430', borderLeft: '4px solid #ef4444', borderRadius: '0 8px 8px 0', padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 13.5, color: 'var(--petrol)', lineHeight: 1.65 }}>
              {t(
                'Ein Agentic System kann selbstständig Schritte planen und ausführen — es braucht keine Bestätigung für jeden Schritt. Es hat einen R5-Tier im AIOS. Solche Systeme haben besondere Kontrollen: Kill-Switch, Execution Tracing und eine Boundary Map.',
                'An Agentic system can independently plan and execute steps — it does not need confirmation for each step. It has an R5 tier in AIOS. Such systems have special controls: kill switch, execution tracing and a boundary map.',
              )}
            </div>
          </div>

          <div style={{ background: 'var(--accent-pale)', border: '1px solid var(--accent)', borderRadius: 8, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--petrol)', marginBottom: 6 }}>
                {t('Vorfälle melden — auch Near-Misses', 'Report incidents — including near-misses')}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                {t(
                  'Nutze den Incident Log im AIOS. Auch wenn nichts passiert ist, aber fast — melde es. Near-Misses sind wichtige Frühwarnsignale für das gesamte System.',
                  'Use the Incident Log in AIOS. Even if nothing happened, but almost did — report it. Near-misses are important early warning signals for the entire system.',
                )}
              </div>
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function AutoBlock({ code, title, sub, children }: { code: string; title: string; sub: string; children: ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{code}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--petrol)' }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {sub}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function BadgeLine({ badge, color, text }: { badge: string; color: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}22`, color, flexShrink: 0, whiteSpace: 'nowrap' }}>{badge}</span>
      <span style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}
