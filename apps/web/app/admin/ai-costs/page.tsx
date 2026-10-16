import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { buildUsageReport, monthRangeIst, freeProviderNames, USD_TO_INR, PLANS, type UsageRow, type UsageSummary } from '@adaptive-tutor/core';

// Founder-only: what the AI is costing, per month, per company, per feature and per student.
// "List price" = what these tokens would cost at the companies' public prices (even on a free
// tier); "Actually billed" = only providers that are NOT on a free tier (AI_FREE_PROVIDERS).
// Rates are planning numbers kept in packages/core/ai-provider/usage.ts.
export const dynamic = 'force-dynamic';

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString('en-IN');

function currentMonthIst(): string {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function Row({ label, s }: { label: string; s: UsageSummary }) {
  return (
    <tr>
      <td>{label}</td>
      <td style={{ textAlign: 'right' }}>{num(s.calls)}</td>
      <td style={{ textAlign: 'right' }}>{num(s.failures)}</td>
      <td style={{ textAlign: 'right' }}>{num(s.inputTokens + s.outputTokens)}</td>
      <td style={{ textAlign: 'right' }}>{inr(s.listPriceInr)}</td>
      <td style={{ textAlign: 'right' }}>{inr(s.billedInr)}</td>
    </tr>
  );
}

function Table({ title, rows }: { title: string; rows: [string, UsageSummary][] }) {
  return (
    <section style={{ marginTop: 'var(--space-3)' }}>
      <h2 style={{ fontSize: 'var(--step-1)' }}>{title}</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ textAlign: 'right', borderBottom: '1px solid var(--line)' }}>
              <th style={{ textAlign: 'left' }}>&nbsp;</th>
              <th>Calls</th>
              <th>Failed</th>
              <th>Tokens</th>
              <th>List price</th>
              <th>Actually billed</th>
            </tr>
          </thead>
          <tbody>{rows.map(([k, s]) => <Row key={k} label={k} s={s} />)}</tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AdminAiCostsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const gate = await adminPageGate();
  if ('gate' in gate) return gate.gate;

  const { month: monthParam } = await searchParams;
  const month = monthParam && monthRangeIst(monthParam) ? monthParam : currentMonthIst();
  const range = monthRangeIst(month)!;

  const service = createServiceClient();
  // PostgREST returns at most 1000 rows per request, so read the month in pages.
  const rows: UsageRow[] = [];
  let truncated = false;
  for (let page = 0; page < 100; page++) {
    const { data, error } = await service
      .from('ai_usage')
      .select('student_id, tier, provider, feature, ok, input_tokens, output_tokens, created_at')
      .gte('created_at', range.from)
      .lt('created_at', range.to)
      .order('created_at', { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as UsageRow[]));
    if (!data || data.length < 1000) break;
    if (page === 99) truncated = true;
  }

  const report = buildUsageReport(rows);

  const studentIds = Object.keys(report.byStudent).filter((id) => id !== 'unknown');
  const names = new Map<string, { name: string; plan: string }>();
  if (studentIds.length) {
    const { data } = await service
      .from('students')
      .select('id, display_name, student_access(plan_code)')
      .in('id', studentIds.slice(0, 500));
    for (const s of data ?? []) {
      const acc: any = Array.isArray((s as any).student_access) ? (s as any).student_access[0] : (s as any).student_access;
      names.set((s as any).id, { name: (s as any).display_name, plan: acc?.plan_code ?? 'no plan' });
    }
  }

  const active = studentIds.length;
  const avgList = active ? report.total.listPriceInr / active : 0;
  const example = PLANS.five_monthly.priceInr;
  const studentRows = Object.entries(report.byStudent)
    .sort((a, b) => b[1].listPriceInr - a[1].listPriceInr)
    .slice(0, 100)
    .map(([id, s]) => [`${names.get(id)?.name ?? id.slice(0, 8)} (${names.get(id)?.plan ?? '—'})`, s] as [string, UsageSummary]);

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>AI usage and cost</h1>
          <AdminNav />
          <p>
            <a href={`/admin/ai-costs?month=${shiftMonth(month, -1)}`}>← {shiftMonth(month, -1)}</a>{' '}
            <strong style={{ margin: '0 0.6rem' }}>{month}</strong>
            <a href={`/admin/ai-costs?month=${shiftMonth(month, 1)}`}>{shiftMonth(month, 1)} →</a>
          </p>
          <p style={{ color: 'var(--slate)' }}>
            <strong>List price</strong> is what these tokens would cost at the companies&apos; public prices, even on a free tier.{' '}
            <strong>Actually billed</strong> counts only providers that are not on a free tier (now free: {freeProviderNames().join(', ') || 'none'}; change
            AI_FREE_PROVIDERS in Vercel when a provider moves to paid billing). Rates are planning numbers (US$1 = ₹{USD_TO_INR}); check each company&apos;s
            price page. No student text is stored here, only counts.
          </p>
          {truncated && <p className="alert">This month has more than 100,000 calls; only the first 100,000 are shown.</p>}

          <section className="stat-tile-row" style={{ marginTop: 'var(--space-2)' }}>
            <div className="stat-tile"><div className="stat-tile__label">AI calls</div><div className="stat-tile__value">{num(report.total.calls)}</div></div>
            <div className="stat-tile"><div className="stat-tile__label">List-price cost</div><div className="stat-tile__value">{inr(report.total.listPriceInr)}</div></div>
            <div className="stat-tile"><div className="stat-tile__label">Actually billed</div><div className="stat-tile__value">{inr(report.total.billedInr)}</div></div>
            <div className="stat-tile"><div className="stat-tile__label">Students using AI</div><div className="stat-tile__value">{num(active)}</div></div>
          </section>

          <p style={{ marginTop: 'var(--space-2)' }}>
            Average AI list-price cost per student this month: <strong>{inr(avgList)}</strong>. For a student on the {inr(example)} per month plan that is{' '}
            <strong>{((avgList / example) * 100).toFixed(1)}%</strong> of the fee (before GST, hosting and teacher pay).
          </p>

          <Table title="By AI company" rows={Object.entries(report.byProvider)} />
          <Table title="By what it was used for" rows={Object.entries(report.byFeature)} />
          <Table title="Free plan vs paid plans" rows={Object.entries(report.byTier)} />
          <Table title="By student (top 100 by cost)" rows={studentRows} />
        </div>
      </div>
    </main>
  );
}
