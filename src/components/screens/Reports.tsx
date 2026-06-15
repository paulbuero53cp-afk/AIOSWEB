import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useUseCases } from '@/hooks/useUseCases';
import { useIncidents } from '@/hooks/useIncidents';
import { useAiTools } from '@/hooks/useAiTools';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/context/LanguageContext';
import { swrFetcher } from '@/lib/api';
import { RA_EUAIACT, AITOOL_STATUS_OPTIONS, AITOOL_STATUS_CSS } from '@/lib/constants';
import {
  exportEuAiActCSV, exportReliabilityCSV, exportManagementCSV, type EuAiActRow,
} from '@/lib/exports';
import type { UseCase } from '@/types';

type Tab = 'management' | 'euaiact' | 'reliability';

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
                    <span><span className={`badge ${AITOOL_STATUS_CSS[s] ?? 'bgr'}`}>{s}</span></span>
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
