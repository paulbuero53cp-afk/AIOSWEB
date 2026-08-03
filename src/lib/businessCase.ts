// ─────────────────────────────────────────────────────────────
//  AIOS — Business-Case-Berechnung (geteilt zwischen BusinessCase-
//  Screen und Reports/ROI-Aggregation — eine Formel, ein Ort)
// ─────────────────────────────────────────────────────────────
import { BC_DEFAULT_LOHNKOSTEN } from '@/lib/constants';
import type { BusinessCase, BcCalculation } from '@/types';

export function calcBC(d: Partial<BusinessCase>): BcCalculation {
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

export function eur(v: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(v);
}
