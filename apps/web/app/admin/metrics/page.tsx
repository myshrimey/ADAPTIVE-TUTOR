import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadFounderMetrics } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';

const STRATEGY_LABEL: Record<string, string> = {
  EXPLAIN: 'Explain', EXAMPLE: 'Worked example', GUIDED_PRACTICE: 'Guided practice', SOCRATIC: 'Questioning', HINT: 'Hint', SIMPLIFY: 'Simplify',
  PREREQUISITE_REPAIR: 'Repair a prerequisite', REMEDIATION: 'Remediation', CHALLENGE: 'Challenge', REVIEW: 'Review', INDEPENDENT_TEST: 'Independent test', gentler_pace: 'Gentler pace after a hard day or several misses',
};
const PLAN_LABEL: Record<string, string> = { free: 'Free', per_subject_monthly: 'Per subject, monthly', five_monthly: 'Five subjects, monthly', five_till_march: 'Five subjects, till March', grandfathered: 'Early access (grandfathered)', custom: 'Custom' };

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat-tile"><span className="stat-tile__value">{value}</span><span className="stat-tile__label">{label}</span></div>
  );
}

// Founder metrics: activation, activity, payments, content progress and what helped. Counts only.
export default async function AdminMetricsPage() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const m = await loadFounderMetrics(createServiceClient());
  const pc = (v: number | null) => (v === null ? 'n/a' : `${v}%`);
  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Founder metrics</h1>
          <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. Counts only; no student names or answers. How each number is worked out: docs/COMMERCIAL_METRICS.md.</p>
          <AdminNav />
        </div>

        <h2 style={{ fontSize: 'var(--step-1)' }}>Students</h2>
        <div className="stat-tile-row">
          <Tile value={m.students.total} label="students" />
          <Tile value={`${m.students.activated} (${pc(m.students.activatedPercent)})`} label="finished a diagnostic" />
          <Tile value={m.money.paidPlanStudents} label="on a paid or early-access plan" />
          <Tile value={m.money.freePlanStudents} label="on the Free plan" />
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--slate)' }}>
          By plan: {Object.entries(m.students.byPlan).map(([k, n]) => `${PLAN_LABEL[k] ?? k} ${n}`).join(' · ') || 'none yet'}
        </p>

        <h2 style={{ fontSize: 'var(--step-1)' }}>Activity</h2>
        <div className="stat-tile-row">
          <Tile value={m.activity.activeLast7} label="students active, last 7 days" />
          <Tile value={m.activity.activeLast30} label="students active, last 30 days" />
          <Tile value={m.activity.sessionsLast7} label="sessions, last 7 days" />
          <Tile value={m.activity.sessionsPerActiveStudent30 ?? 'n/a'} label="sessions per active student (30 days)" />
          <Tile value={pc(m.activity.finishedPercent)} label="sessions finished (30 days)" />
          <Tile value={pc(m.activity.returnedWithin7DaysPercent)} label={`came back within 7 days (of ${m.activity.returnedBase})`} />
        </div>

        <h2 style={{ fontSize: 'var(--step-1)' }}>Payments</h2>
        <div className="stat-tile-row">
          <Tile value={m.money.confirmedPayments} label="confirmed payments" />
          <Tile value={`₹${m.money.confirmedAmountInr.toLocaleString('en-IN')}`} label="confirmed amount" />
          <Tile value={m.money.pendingPayments} label="waiting for you to verify" />
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Payments come from the manual payment-claim list (/admin/payments). Plan prices are on the plan cards; AI cost is at /admin/ai-costs.</p>

        <h2 style={{ fontSize: 'var(--step-1)' }}>Content</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}><th>Subject</th><th>Status</th><th>Verified</th><th>Needs review</th><th>Rejected</th><th>Gates</th></tr></thead>
          <tbody>
            {m.content.map((c) => (
              <tr key={c.subject} style={{ borderBottom: '1px solid var(--line)' }}><td>{c.subject}</td><td>{c.status}</td><td>{c.verified}</td><td>{c.needsReview}</td><td>{c.rejected}</td><td>{c.gatesPassed}/10</td></tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: '0.85rem' }}>Teachers approved: {m.teachers.approved} · reviews in the last 30 days: {m.teachers.reviewsLast30}. <a href="/admin/quality">Quality gates</a></p>

        <h2 style={{ fontSize: 'var(--step-1)' }}>What seems to help</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--slate)' }}>{m.interventionNote}</p>
        {m.interventions.length === 0 ? (
          <p style={{ color: 'var(--slate)' }}>No finished sessions with before-and-after readings yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}><th>Teaching move</th><th>Sessions</th><th>Average mastery change in the session</th></tr></thead>
            <tbody>
              {m.interventions.map((i) => (
                <tr key={i.strategy} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td>{STRATEGY_LABEL[i.strategy] ?? i.strategy}</td><td>{i.sessions}</td>
                  <td>{i.enough ? `${(i.avgMasteryChange as number) >= 0 ? '+' : ''}${i.avgMasteryChange} points` : 'not enough sessions yet'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
