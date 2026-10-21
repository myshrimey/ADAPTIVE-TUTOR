import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';

// Admin dashboard: counts the database actually holds. Nothing is estimated. Admin only.
export const dynamic = 'force-dynamic';

const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const dayKey = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 10); // India date

export default async function AdminOverview() {
  const gate = await adminPageGate();
  if ('gate' in gate) return gate.gate;
  const sv = createServiceClient();
  const head = (t: string, f?: (q: any) => any) => {
    let q: any = sv.from(t).select('id', { count: 'exact', head: true });
    if (f) q = f(q);
    return q.then((r: any) => r.count ?? 0);
  };

  const [students, newWeek, newMonth, mocks, diag7, attempts7, written, teachersPending, teachersApproved, payPending, dataReq, hwQueue, feedback7, revQ, planRows, usersRows, sessionRows, qStatus, qTotal, parents, tutors, centres, partnersPending, linksActive] = await Promise.all([
    head('students'),
    head('users', (q) => q.eq('role', 'student').gte('created_at', day(7))),
    head('users', (q) => q.eq('role', 'student').gte('created_at', day(30))),
    head('mock_exams', (q) => q.eq('status', 'submitted')),
    head('diagnostic_attempts', (q) => q.eq('status', 'completed').gte('completed_at', day(7))),
    head('question_attempts', (q) => q.gte('created_at', day(7))),
    head('written_attempts'),
    head('teacher_profiles', (q: any) => q.eq('status', 'pending')).catch(() => 0),
    head('teacher_profiles', (q: any) => q.eq('status', 'approved')).catch(() => 0),
    head('pilot_payments', (q) => q.eq('status', 'pending')),
    head('data_requests', (q) => q.eq('status', 'requested')),
    head('handwritten_evaluations', (q) => q.eq('status', 'needs_teacher')),
    head('feedback', (q) => q.gte('created_at', day(7))),
    sv.from('pilot_payments').select('amount').eq('status', 'confirmed').limit(5000),
    sv.from('student_access').select('plan_code').limit(20000),
    sv.from('users').select('created_at').eq('role', 'student').gte('created_at', day(14)).limit(20000),
    sv.from('learning_sessions').select('student_id, started_at').gte('started_at', day(14)).limit(50000),
    sv.from('diagnostic_questions').select('content_status').limit(50000),
    head('diagnostic_questions'),
    head('adult_profiles', (q: any) => q.eq('role', 'parent')).catch(() => 0),
    head('adult_profiles', (q: any) => q.eq('role', 'tutor')).catch(() => 0),
    head('adult_profiles', (q: any) => q.eq('role', 'centre')).catch(() => 0),
    head('adult_profiles', (q: any) => q.eq('status', 'pending')).catch(() => 0),
    head('student_links', (q: any) => q.eq('status', 'active')).catch(() => 0),
  ]);

  const revenue = ((revQ as any).data ?? []).reduce((a: number, r: any) => a + Number(r.amount || 0), 0);
  const plans = new Map<string, number>();
  for (const r of ((planRows as any).data ?? []) as any[]) plans.set(r.plan_code, (plans.get(r.plan_code) ?? 0) + 1);
  const status = new Map<string, number>();
  for (const r of ((qStatus as any).data ?? []) as any[]) status.set(r.content_status, (status.get(r.content_status) ?? 0) + 1);

  // last 14 days: sign-ups and active students (students with at least one learning session that day)
  const keys: string[] = [];
  for (let i = 13; i >= 0; i--) keys.push(dayKey(day(i)));
  const signups = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const r of ((usersRows as any).data ?? []) as any[]) { const k = dayKey(r.created_at); if (signups.has(k)) signups.set(k, (signups.get(k) ?? 0) + 1); }
  const activeByDay = new Map<string, Set<string>>(keys.map((k) => [k, new Set<string>()]));
  const activeWeek = new Set<string>();
  for (const r of ((sessionRows as any).data ?? []) as any[]) {
    const k = dayKey(r.started_at);
    activeByDay.get(k)?.add(r.student_id);
    if (new Date(r.started_at).getTime() >= Date.now() - 7 * 86400000) activeWeek.add(r.student_id);
  }
  const maxBar = Math.max(1, ...keys.map((k) => Math.max(signups.get(k) ?? 0, activeByDay.get(k)?.size ?? 0)));

  const Card = ({ label, value, href, note }: { label: string; value: string | number; href?: string; note?: string }) => (
    <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0.8rem 1rem', background: 'var(--paper, #fff)' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{href ? <a href={href} style={{ textDecoration: 'none' }}>{value}</a> : value}</div>
      {note && <div style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>{note}</div>}
    </div>
  );

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>Admin dashboard</h1>
          <AdminNav />
          <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Counts the database holds right now (India dates). Nothing here is estimated.</p>
        </div>

        <h2 style={{ fontSize: 'var(--step-1)' }}>Needs your attention</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          <Card label="Payments waiting to be confirmed" value={payPending} href="/admin/payments" />
          <Card label="Teachers waiting for approval" value={teachersPending} href="/admin/teachers" />
          <Card label="Tutors / centres waiting for approval" value={partnersPending} href="/admin/partners" />
          <Card label="Data deletion requests" value={dataReq} href="/admin/data-requests" />
          <Card label="Handwritten answers waiting for a teacher" value={hwQueue} href="/admin/handwriting" />
          <Card label="Feedback messages, last 7 days" value={feedback7} href="/admin/feedback" />
        </div>

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Students and learning</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          <Card label="Students (all)" value={students} href="/admin/students" />
          <Card label="New students, 7 days" value={newWeek} />
          <Card label="New students, 30 days" value={newMonth} />
          <Card label="Active students, 7 days" value={activeWeek.size} note="at least one learning session" />
          <Card label="Diagnostics completed, 7 days" value={diag7} />
          <Card label="Questions answered, 7 days" value={attempts7} />
          <Card label="Mock papers submitted (all)" value={mocks} />
          <Card label="Written answers marked by AI (all)" value={written} />
        </div>

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Parents, teachers, tutors and centres</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          <Card label="Parent accounts" value={parents} href="/admin/partners" />
          <Card label="Tutor accounts" value={tutors} href="/admin/partners" />
          <Card label="Coaching centre accounts" value={centres} href="/admin/partners" />
          <Card label="Teachers (approved)" value={teachersApproved} href="/admin/teachers" />
          <Card label="Active student links" value={linksActive} note="families sharing progress with an adult" />
        </div>

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Last 14 days</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, borderBottom: '1px solid var(--line)' }} role="img" aria-label="Daily new students and active students for the last 14 days">
          {keys.map((k) => {
            const a = signups.get(k) ?? 0, b = activeByDay.get(k)?.size ?? 0;
            return (
              <div key={k} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2 }} title={`${k}: ${a} new, ${b} active`}>
                <div style={{ flex: 1, height: `${(a / maxBar) * 100}%`, minHeight: a ? 3 : 0, background: 'var(--marigold-deep, #c58a1b)' }} />
                <div style={{ flex: 1, height: `${(b / maxBar) * 100}%`, minHeight: b ? 3 : 0, background: 'var(--ink, #1c2b4a)' }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, fontSize: '0.7rem', color: 'var(--slate)' }}>{keys.map((k) => <span key={k} style={{ flex: 1, textAlign: 'center' }}>{k.slice(8)}</span>)}</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}><span style={{ color: 'var(--marigold-deep, #c58a1b)' }}>■</span> new students &nbsp; <span style={{ color: 'var(--ink, #1c2b4a)' }}>■</span> active students (day of month along the bottom)</p>

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Plans and money</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          {[...plans.entries()].sort((x, y) => y[1] - x[1]).map(([p, n]) => <Card key={p} label={`Plan: ${p}`} value={n} />)}
          <Card label="Confirmed payments (Rs)" value={revenue.toLocaleString('en-IN')} href="/admin/funnel" note="from payments you confirmed" />
        </div>

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Question bank</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          <Card label="Diagnostic/quiz questions (all)" value={qTotal} href="/admin/questions" />
          {[...status.entries()].map(([k, n]) => <Card key={k} label={`Status: ${k}`} value={n} href="/admin/reviews" />)}
          <Card label="Teachers approved" value={teachersApproved} href="/admin/teachers" />
        </div>
        <p style={{ marginTop: 'var(--space-3)', fontSize: '0.85rem', color: 'var(--slate)' }}>For AI cost see <a href="/admin/ai-costs">AI cost</a>; for the funnel and monthly economics see <a href="/admin/funnel">Funnel</a>.</p>
      </div>
    </main>
  );
}
