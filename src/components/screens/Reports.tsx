import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useUseCases } from '@/hooks/useUseCases';
import { useIncidents } from '@/hooks/useIncidents';
import { useAiTools } from '@/hooks/useAiTools';
import { useAuth } from '@/context/AuthContext';
import { useT, useTx } from '@/context/LanguageContext';
import { swrFetcher } from '@/lib/api';
import { RA_EUAIACT, AITOOL_STATUS_OPTIONS, AITOOL_STATUS_CSS } from '@/lib/constants';
import { calcBC, eur } from '@/lib/businessCase';
import {
  exportEuAiActCSV, exportReliabilityCSV, exportManagementCSV, exportRoiCSV, type EuAiActRow,
} from '@/lib/exports';
import type { UseCase, BusinessCase } from '@/types';

type Tab = 'management' | 'euaiact' | 'reliability' | 'roi';

const PD_ORDER  = ['Start', 'Scale', 'Stop', 'Hold', 'Backlog'];
const LC_ORDER  = ['Idea', 'Build', 'Run', 'Retire'];
const RT_ORDER  = ['High', 'Medium', 'Low'];
const RL_ORDER  = ['R1', 'R2', 'R3', 'R4', 'R5'];
const FM_LABEL: Record<string, string> = {
  accuracy: 'Accuracy-Drift', inconsistency: 'Inkonsistenz', drift: 'Temporal Drift',
  agentic: 'Agentic Eskalation', infrastructure: 'Infrastruktur',
};

function count<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  return arr.reduce((m, x) => { const k = key(x); m[k] = (m[k] ?? 0) + 1; return m; }, {} as Record<string, number>);
}

interface BcRow { uc: UseCase; bc: Partial<BusinessCase>; calc: ReturnType<typeof calcBC> }

// ── ROI-Zeitleiste (kumulierter Netto-Cashflow) ────────────────
function TimelineChart({ data }: { data: { month: string; cum: number }[] }) {
  if (data.length === 0) return null;
  const w = Math.max(600, data.length * 46);
  const h = 220;
  const padL = 64, padR = 20, padT = 20, padB = 30;
  const values = data.map(d => d.cum);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const x = (i: number) => padL + (i / Math.max(1, data.length - 1)) * innerW;
  const y = (v: number) => padT + innerH - ((v - min) / range) * innerH;
  const zeroY = y(0);
  const lastPositive = data[data.length - 1].cum >= 0;
  const lineColor = lastPositive ? 'var(--green)' : 'var(--red)';

  const linePoints = data.map((d, i) => `${x(i)},${y(d.cum)}`).join(' ');
  const areaPoints = `${x(0)},${zeroY} ${linePoints} ${x(data.length - 1)},${zeroY}`;
  const breakevenIdx = data.findIndex(d => d.cum >= 0);
  const step = Math.max(1, Math.ceil(data.length / 10));

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <line x1={padL} y1={zeroY} x2={w - padR} y2={zeroY} stroke="var(--border)" strokeWidth={1} />
      <text x={padL - 8} y={zeroY + 4} textAnchor="end" fontSize={10} fill="var(--muted)">0 €</text>
      <polygon points={areaPoints} fill={lineColor} opacity={0.12} />
      <polyline points={linePoints} fill="none" stroke={lineColor} strokeWidth={2} />
      {breakevenIdx > 0 && (
        <>
          <line x1={x(breakevenIdx)} y1={padT} x2={x(breakevenIdx)} y2={h - padB} stroke="var(--accent)" strokeWidth={1} strokeDasharray="3,3" />
          <text x={x(breakevenIdx)} y={padT - 6} textAnchor="middle" fontSize={10} fill="var(--accent)" fontWeight={700}>Break-even</text>
        </>
      )}
      {data.map((d, i) => {
        if (i % step !== 0 && i !== data.length - 1) return null;
        return (
          <text key={d.month} x={x(i)} y={h - 8} textAnchor="middle" fontSize={9} fill="var(--muted)">
            {d.month}
          </text>
        );
      })}
    </svg>
  );
}

// ── Verteilungs-Karte ─────────────────────────────────────────
function Dist({ title, order, counts, total }: {
  title: string; order: string[]; counts: Record<string, number>; total: number;
}) {
  return (
    <div className="card">
      <div className="ch"><span className="ch-title">{title}</span></div>
      <div style={{ padding: '6px 16px 10px' }}>
        {order.map(label => {
          const n = counts[label] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <div key={label} style={{ padding: '5px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: 'var(--muted)' }}>{label}</span>
                <strong>{n}<span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {pct}%</span></strong>
              </div>
              <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Reports() {
  const { useCases, loading } = useUseCases();
  const { incidents }         = useIncidents();
  const { tools }             = useAiTools();
  const { isAdmin }           = useAuth();
  const t                     = useT();
  const tx                    = useTx();
  const [tab, setTab]         = useState<Tab>('management');

  // Artefakte nur für Admin (Muster wie ArtefaktHub) — für EU-AI-Act + DSFA-Quote
  const { data: artExport } = useSWR<Record<string, Record<string, Record<string, unknown>>>>(
    isAdmin ? '/api/artefakte/export' : null, swrFetcher,
  );

  // ── Kennzahlen ────────────────────────────────────────────
  const total   = useCases.length;
  const run     = useCases.filter(u => u.lc === 'Run').length;
  const highRisk= useCases.filter(u => u.rt === 'High').length;
  const pending = useCases.filter(u => u.app === 'Pending').length;
  const openInc = incidents.filter(i => i.st === 'Open').length;

  const pdCounts = count(useCases, u => u.pd);
  const lcCounts = count(useCases, u => u.lc);
  const rtCounts = count(useCases, u => u.rt);
  const rlCounts = count(useCases, u => u.rl || 'ohne');
  const noRl     = useCases.filter(u => !u.rl).length;
  const toolCounts = count(tools, t => t.status);

  const needsDSFA = useCases.filter(u => u.gt?.some(Boolean) || u.rt === 'High').length;
  const withDSFA  = artExport
    ? useCases.filter(u => Object.keys(artExport.dsfa?.[u.id] ?? {}).length > 0).length
    : null;

  // ── EU-AI-Act-Inventar (Admin) ────────────────────────────
  const euRows: EuAiActRow[] = useMemo(() => {
    if (!artExport) return [];
    return useCases.map(uc => {
      const ra = artExport.ra?.[uc.id] ?? {};
      const cats = RA_EUAIACT.filter(e => ra[e.key]).map(e => t(`ra.euaiact.${e.key}`));
      return { id: uc.id, title: uc.title, cl: uc.cl, rt: uc.rt, app: uc.app, relevant: cats.length > 0, categories: cats.join('; ') };
    });
  }, [artExport, useCases, t]);
  const euRelevant = euRows.filter(r => r.relevant);

  // ── Reliability ───────────────────────────────────────────
  const r3plus = useCases.filter(u => u.rl === 'R3' || u.rl === 'R4' || u.rl === 'R5');
  const fmCounts = count(incidents.filter(i => i.failureMode), i => i.failureMode as string);

  // ── ROI & Business-Nutzen (Admin) ────────────────────────
  const bcRows: BcRow[] = useMemo(() => {
    if (!artExport) return [];
    return useCases
      .map(uc => {
        const bc = artExport.bc?.[uc.id] as Partial<BusinessCase> | undefined;
        if (!bc || Object.keys(bc).length === 0) return null;
        return { uc, bc, calc: calcBC(bc) };
      })
      .filter((x): x is BcRow => x !== null);
  }, [artExport, useCases]);

  const realizedRows = bcRows.filter(r => r.uc.lc === 'Run');
  const pipelineRows = bcRows.filter(r => r.uc.lc !== 'Run');
  const rowSum = (rows: BcRow[], key: (r: BcRow) => number) => rows.reduce((s, r) => s + key(r), 0);

  const totalInvest        = rowSum(realizedRows, r => r.calc.einmal);
  const totalAnnualCost    = rowSum(realizedRows, r => r.calc.jaehrlich);
  const totalAnnualBenefit = rowSum(realizedRows, r => r.calc.gesamtNutzen);
  const netAnnual          = totalAnnualBenefit - totalAnnualCost;
  const totalCost3y        = totalInvest + totalAnnualCost * 3;
  const totalBenefit3y     = totalAnnualBenefit * 3;
  const portfolioRoi3      = totalCost3y > 0 ? Math.round(((totalBenefit3y - totalCost3y) / totalCost3y) * 100) : 0;

  const pipelineInvest  = rowSum(pipelineRows, r => r.calc.einmal);
  const pipelineBenefit = rowSum(pipelineRows, r => r.calc.gesamtNutzen);

  // Kumulierter Netto-Cashflow seit Erfassung, monatlich — nur realisierte (Run) Use Cases,
  // da nur diese tatsächlich Ertrag/Kosten erzeugen. Zeitbasis: UC-Erfassungsdatum (kein
  // separates Go-Live-Datum vorhanden) — im UI transparent als Annäherung ausgewiesen.
  const timeline = useMemo(() => {
    if (realizedRows.length === 0) return [] as { month: string; cum: number }[];

    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
    const monthStart = (iso: string) => {
      const d = new Date(iso || Date.now());
      return new Date(d.getFullYear(), d.getMonth(), 1);
    };

    const rowsWithStart = realizedRows.map(r => ({ ...r, start: monthStart(r.uc.createdAt || r.uc.updatedAt) }));
    const earliest = rowsWithStart.reduce((a, b) => (a.start < b.start ? a : b)).start;
    const now = new Date();
    const nowStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const points: { month: string; cum: number }[] = [];
    let cum = 0;
    for (let d = new Date(earliest); d <= nowStart; d = addMonths(d, 1)) {
      rowsWithStart.forEach(r => {
        if (d.getTime() === r.start.getTime()) cum -= r.calc.einmal;
        if (d >= r.start) cum += (r.calc.gesamtNutzen - r.calc.jaehrlich) / 12;
      });
      points.push({ month: monthKey(d), cum: Math.round(cum) });
    }
    // Auf 60 Monate (5 Jahre) begrenzen, damit der Chart nicht unlesbar wird
    return points.length > 60 ? points.slice(points.length - 60) : points;
  }, [realizedRows]);

  if (loading) return <div className="empty">{t('rep.loading')}</div>;

  const tabBtn = (id: Tab, label: string) => (
    <div className={`tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>{label}</div>
  );

  return (
    <div>
      <div className="sec-title">{t('rep.title')}</div>
      <div className="sec-sub">{t('rep.sub')}</div>

      <div className="tabs">
        {tabBtn('management', t('rep.tabManagement'))}
        {tabBtn('euaiact', t('rep.tabEuAiAct'))}
        {tabBtn('reliability', t('rep.tabReliability'))}
        {tabBtn('roi', t('rep.tabRoi'))}
      </div>

      {/* ── R1 Management ────────────────────────────────── */}
      {tab === 'management' && (
        <div>
          <div className="fb" style={{ marginBottom: 14 }}>
            <div style={{ flex: 1 }} />
            <button className="btn btn-outline btn-sm" onClick={() => exportManagementCSV(buildMgmtRows())}>⬇ {t('common.csv')}</button>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨 {t('common.pdf')}</button>
          </div>

          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 18 }}>
            <div className="kc"><div className="kc-label">{t('rep.useCases')}</div><div className="kc-value">{total}</div></div>
            <div className="kc green"><div className="kc-label">{t('rep.run')}</div><div className="kc-value">{run}</div></div>
            <div className={`kc ${highRisk > 0 ? 'red' : 'green'}`}><div className="kc-label">{t('rep.highRisk')}</div><div className="kc-value">{highRisk}</div></div>
            <div className={`kc ${pending > 0 ? 'yellow' : 'green'}`}><div className="kc-label">{t('rep.approvalOpen')}</div><div className="kc-value">{pending}</div></div>
            <div className={`kc ${openInc > 0 ? 'red' : 'green'}`}><div className="kc-label">{t('rep.openInc')}</div><div className="kc-value">{openInc}</div></div>
          </div>

          <div className="gg">
            <Dist title={t('rep.distPortfolio')} order={PD_ORDER} counts={pdCounts} total={total} />
            <Dist title={t('rep.distLifecycle')} order={LC_ORDER} counts={lcCounts} total={total} />
            <Dist title={t('rep.distRiskTier')} order={RT_ORDER} counts={rtCounts} total={total} />
            <Dist title={t('rep.distReliability')} order={[...RL_ORDER, 'ohne']} counts={rlCounts} total={total} />
          </div>

          <div className="gg" style={{ marginTop: 4 }}>
            {/* DSFA */}
            <div className="card">
              <div className="ch"><span className="ch-title">{t('rep.dsfaStatus')}</span></div>
              <div style={{ padding: '10px 16px', display: 'flex', gap: 24 }}>
                <div><div className="kc-label">{t('rep.dsfaNeeded')}</div><div className="kc-value" style={{ fontSize: 26 }}>{needsDSFA}</div></div>
                <div>
                  <div className="kc-label">{t('rep.dsfaDocumented')}</div>
                  <div className="kc-value" style={{ fontSize: 26 }}>{withDSFA ?? '—'}</div>
                  {withDSFA === null && <div className="kc-sub">{t('rep.adminOnlyShort')}</div>}
                </div>
              </div>
            </div>
            {/* AI-Tools */}
            <div className="card">
              <div className="ch"><span className="ch-title">{t('rep.toolsTitle', { n: tools.length })}</span></div>
              <div style={{ padding: '6px 16px 10px' }}>
                {AITOOL_STATUS_OPTIONS.map(s => (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span><span className={`badge ${AITOOL_STATUS_CSS[s] ?? 'bgr'}`}>{tx(s)}</span></span>
                    <strong>{toolCounts[s] ?? 0}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── R2 EU AI Act ─────────────────────────────────── */}
      {tab === 'euaiact' && (
        !isAdmin ? (
          <div className="empty">{t('rep.euAdminOnly')}</div>
        ) : !artExport ? (
          <div className="empty">{t('rep.euLoading')}</div>
        ) : (
          <div>
            <div className="fb" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{euRelevant.length}</strong> {t('rep.euRelevantInfo', { m: total })}
              </div>
              <div style={{ flex: 1 }} />
              <button className="btn btn-outline btn-sm" onClick={() => exportEuAiActCSV(euRows)}>⬇ {t('common.csv')}</button>
            </div>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>{t('rep.euColUc')}</th><th>{t('rep.euColRiskTier')}</th><th>{t('rep.euColEu')}</th><th>{t('rep.euColCats')}</th><th>{t('rep.euColApproval')}</th></tr>
                </thead>
                <tbody>
                  {euRows.map(r => (
                    <tr key={r.id}>
                      <td><div style={{ fontWeight: 600 }}>{r.title}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.cl} · {r.id}</div></td>
                      <td><span className={`badge ${r.rt === 'High' ? 'br' : r.rt === 'Medium' ? 'by' : 'bg'}`}>{r.rt}</span></td>
                      <td>{r.relevant ? <span className="badge br">{t('rep.euHighRisk')}</span> : <span className="badge bg">{t('rep.euNotApplicable')}</span>}</td>
                      <td style={{ fontSize: 12 }}>{r.categories || '—'}</td>
                      <td><span className={`badge ${r.app === 'Approved' ? 'bg' : r.app === 'Pending' ? 'by' : r.app === 'Rejected' ? 'br' : 'bgr'}`}>{r.app}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── R3 Reliability ───────────────────────────────── */}
      {tab === 'reliability' && (
        <div>
          <div className="fb" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{r3plus.length}</strong> {t('rep.relInfo', { n: noRl })}
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-outline btn-sm" onClick={() => exportReliabilityCSV(useCases)}>⬇ {t('common.csv')}</button>
          </div>

          <div className="gg" style={{ marginBottom: 4 }}>
            <Dist title={t('rep.relDistTitle')} order={[...RL_ORDER, 'ohne']} counts={rlCounts} total={total} />
            <div className="card">
              <div className="ch"><span className="ch-title">{t('rep.relFmTitle')}</span></div>
              <div style={{ padding: '6px 16px 10px' }}>
                {Object.keys(FM_LABEL).map(fm => (
                  <div key={fm} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>{FM_LABEL[fm]}</span>
                    <strong>{fmCounts[fm] ?? 0}</strong>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  {t('rep.relUncategorized', { n: incidents.filter(i => !i.failureMode).length })}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <div className="ch"><span className="ch-title">{t('rep.relTableTitle')}</span></div>
            <table>
              <thead>
                <tr><th>{t('rep.relColUc')}</th><th>{t('rep.relColRTier')}</th><th>{t('rep.relColHitl')}</th><th>{t('rep.relColAutonomy')}</th><th>{t('rep.relColSla')}</th><th>{t('rep.relColFm')}</th></tr>
              </thead>
              <tbody>
                {r3plus.length === 0 ? (
                  <tr><td colSpan={6} className="empty">{t('rep.relNoR3')}</td></tr>
                ) : r3plus.map((u: UseCase) => (
                  <tr key={u.id}>
                    <td><div style={{ fontWeight: 600 }}>{u.title}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.cl} · {u.id}</div></td>
                    <td><span className={`badge ${u.rl === 'R5' ? 'br' : 'by'}`}>{u.rl}</span></td>
                    <td>{u.hitlMode || '—'}</td>
                    <td>{u.autonomyLevel || '—'}</td>
                    <td>{u.monitoringSla || <span style={{ color: 'var(--red)' }}>{t('rep.slaMissing')}</span>}</td>
                    <td style={{ fontSize: 12 }}>{(u.failureModes ?? []).map(f => FM_LABEL[f] ?? f).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── R4 ROI & Business-Nutzen ─────────────────────── */}
      {tab === 'roi' && (
        !isAdmin ? (
          <div className="empty">{t('rep.roiAdminOnly')}</div>
        ) : !artExport ? (
          <div className="empty">{t('rep.roiLoading')}</div>
        ) : bcRows.length === 0 ? (
          <div className="empty">{t('rep.roiNoData')}</div>
        ) : (
          <div>
            <div className="fb" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{realizedRows.length}</strong> {t('rep.roiKCount')}
              </div>
              <div style={{ flex: 1 }} />
              <button className="btn btn-outline btn-sm" onClick={() => exportRoiCSV(bcRows.map(r => ({ id: r.uc.id, title: r.uc.title, lc: r.uc.lc, invest: r.calc.einmal, annualCost: r.calc.jaehrlich, annualBenefit: r.calc.gesamtNutzen, netAnnual: r.calc.gesamtNutzen - r.calc.jaehrlich, breakeven: r.calc.breakeven })))}>⬇ {t('common.csv')}</button>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 8 }}>
              {t('rep.roiRealizedTitle')}
            </div>
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 18 }}>
              <div className="kc"><div className="kc-label">{t('rep.roiKInvest')}</div><div className="kc-value" style={{ fontSize: 20 }}>{eur(totalInvest)}</div></div>
              <div className="kc"><div className="kc-label">{t('rep.roiKAnnualCost')}</div><div className="kc-value" style={{ fontSize: 20 }}>{eur(totalAnnualCost)}</div></div>
              <div className="kc green"><div className="kc-label">{t('rep.roiKAnnualBenefit')}</div><div className="kc-value" style={{ fontSize: 20 }}>{eur(totalAnnualBenefit)}</div></div>
              <div className={`kc ${netAnnual >= 0 ? 'green' : 'red'}`}><div className="kc-label">{t('rep.roiKNetAnnual')}</div><div className="kc-value" style={{ fontSize: 20 }}>{eur(netAnnual)}</div></div>
              <div className={`kc ${portfolioRoi3 >= 0 ? 'green' : 'red'}`}><div className="kc-label">{t('rep.roiKRoi3')}</div><div className="kc-value" style={{ fontSize: 20 }}>{portfolioRoi3}%</div></div>
            </div>

            {pipelineRows.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', marginBottom: 18, fontSize: 13, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{t('rep.roiPipelineTitle')}</strong> — {t('rep.roiPipelineInfo', { n: pipelineRows.length, inv: eur(pipelineInvest), ben: eur(pipelineBenefit) })}
              </div>
            )}

            <div className="card" style={{ marginBottom: 18 }}>
              <div className="ch"><span className="ch-title">{t('rep.roiTimelineTitle')}</span></div>
              <div style={{ padding: '14px 20px' }}>
                {timeline.length === 0 ? (
                  <div className="empty">{t('rep.roiNoData')}</div>
                ) : (
                  <>
                    <TimelineChart data={timeline} />
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>{t('rep.roiTimelineHint')}</div>
                  </>
                )}
              </div>
            </div>

            <div className="card" style={{ overflowX: 'auto' }}>
              <div className="ch"><span className="ch-title">{t('rep.roiTableTitle')}</span></div>
              <table>
                <thead>
                  <tr>
                    <th>{t('rep.roiColUc')}</th><th>{t('rep.roiColStatus')}</th>
                    <th>{t('rep.roiColInvest')}</th><th>{t('rep.roiColAnnualBenefit')}</th>
                    <th>{t('rep.roiColNetAnnual')}</th><th>{t('rep.roiColBreakeven')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bcRows.map(r => {
                    const netA = r.calc.gesamtNutzen - r.calc.jaehrlich;
                    return (
                      <tr key={r.uc.id}>
                        <td><div style={{ fontWeight: 600 }}>{r.uc.title}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.uc.cl} · {r.uc.id}</div></td>
                        <td><span className={`badge ${r.uc.lc === 'Run' ? 'bg' : 'bgr'}`}>{r.uc.lc}</span></td>
                        <td>{eur(r.calc.einmal)}</td>
                        <td>{eur(r.calc.gesamtNutzen)}</td>
                        <td style={{ color: netA >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{eur(netA)}</td>
                        <td>{r.calc.breakeven >= 999 ? 'n/a' : `${r.calc.breakeven} Mon.`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );

  // Kennzahlen für Management-CSV
  function buildMgmtRows(): [string, string | number][] {
    const rows: [string, string | number][] = [
      ['Use Cases gesamt', total], ['In Betrieb (Run)', run], ['High Risk', highRisk],
      ['Freigabe offen', pending], ['Offene Incidents', openInc],
      ['DSFA benötigt', needsDSFA], ['DSFA dokumentiert', withDSFA ?? 'n/a'],
    ];
    PD_ORDER.forEach(p => rows.push([`Portfolio: ${p}`, pdCounts[p] ?? 0]));
    LC_ORDER.forEach(l => rows.push([`Lifecycle: ${l}`, lcCounts[l] ?? 0]));
    RT_ORDER.forEach(r => rows.push([`Risk-Tier: ${r}`, rtCounts[r] ?? 0]));
    [...RL_ORDER, 'ohne'].forEach(r => rows.push([`Reliability: ${r}`, rlCounts[r] ?? 0]));
    AITOOL_STATUS_OPTIONS.forEach(s => rows.push([`AI-Tools: ${s}`, toolCounts[s] ?? 0]));
    return rows;
  }
}
