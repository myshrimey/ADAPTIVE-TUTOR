import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadSheetData } from '@adaptive-tutor/core';

// Founder-only: the paying-family funnel and unit economics. Counts only what the database holds;
// stages it cannot see are marked "not tracked". Definitions: docs/COMMERCIAL_METRICS.md.
export const dynamic = 'force-dynamic';

const inr = (n: number | null) => (n === null ? 'not enough data' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);

export default async function AdminFunnelPage({ searchParams }: { searchParams: Promise<{ month?: string; rate?: string }> }) {
  const gate = await adminPageGate();
  if ('gate' in gate) return gate.gate;
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 7);
  const rate = Math.max(0, Number(sp.rate || 0)) || 0;
  const d = await loadSheetData(createServiceClient(), { month, teacherRateInr: rate });
  const e = d.economics;
  const q = `month=${month}&rate=${rate}`;
  const top = d.funnel.find((f) => f.key === 'signup')?.count || 0;

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>Funnel and economics</h1>
          <AdminNav />
          <p style={{ color: 'var(--slate)' }}>
            Real counts only. Stages Sahayak cannot see are marked &quot;not tracked&quot;. Downloads open in Google Sheets or Excel:{' '}
            {['funnel', 'students', 'sales', 'product', 'economics'].map((s) => (
              <span key={s}><a href={`/api/admin/export/${s}?${q}`}>{s}</a>{' · '}</span>
            ))}
          </p>
        </div>

        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Funnel</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
            <tbody>
              {d.funnel.map((f) => (
                <tr key={f.key} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.4rem 0' }}>{f.label}{f.note ? <div style={{ color: 'var(--slate)', fontSize: '0.8rem' }}>{f.note}</div> : null}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {f.count === null ? 'not tracked' : f.count}
                    {f.count !== null && top > 0 && f.key !== 'signup' ? <span style={{ color: 'var(--slate)', fontWeight: 400 }}> ({Math.round((f.count / top) * 100)}% of students)</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Economics for {month}</h2>
          <form method="get" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'end' }}>
            <label>Month <input name="month" defaultValue={month} pattern="\d{4}-\d{2}" style={{ width: '7rem' }} /></label>
            <label>Rupees paid per teacher review <input name="rate" type="number" min="0" defaultValue={rate} style={{ width: '6rem' }} /></label>
            <button className="btn btn--ghost" type="submit">Update</button>
          </form>
          <div className="stat-tile-row" style={{ marginTop: 'var(--space-2)' }}>
            <div className="stat-tile"><div className="stat-tile__value">{inr(e.revenueInr)}</div><div className="stat-tile__label">Confirmed revenue</div></div>
            <div className="stat-tile"><div className="stat-tile__value">{inr(e.aiCostListInr)}</div><div className="stat-tile__label">AI cost (list price)</div></div>
            <div className="stat-tile"><div className="stat-tile__value">{inr(e.teacherCostInr)}</div><div className="stat-tile__label">Teacher cost ({e.teacherReviews} reviews)</div></div>
            <div className="stat-tile"><div className="stat-tile__value">{e.grossMarginPercent === null ? 'not enough data' : `${e.grossMarginPercent}%`}</div><div className="stat-tile__label">Gross margin</div></div>
          </div>
          {e.perPaidStudent && (
            <p>Per paid student: revenue {inr(e.perPaidStudent.revenue)}, AI {inr(e.perPaidStudent.aiList)}, teacher {inr(e.perPaidStudent.teacher)}, contribution {inr(e.perPaidStudent.contribution)}.</p>
          )}
          <p style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>{e.note} Actually billed AI cost this month: {inr(e.aiCostBilledInr)}.</p>
        </section>
      </div>
    </main>
  );
}
