import { PORTAL_INFO } from '@adaptive-tutor/core';
import { ReferralPanel } from '@/components/ReferralPanel';
import { type PortalUser, linkedStudentIds, summariseStudents } from '@/lib/portal';
import { LinkStudentForm } from './LinkStudentForm';
import { createServiceClient } from '@/lib/supabase-server';
import { SignOutButton } from '@/components/SignOutButton';
import { getOrgPlan, orgPlanActive, orgBalance, ensureOrgMonthlyCredits, loadSettings } from '@adaptive-tutor/core';
import { GrantCreditButton } from './GrantCreditButton';

function day(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'no activity yet';
}

// One server component, three different screens: a parent sees cards for their children, a tutor a student table
// with next steps, a coaching centre a roster with totals. Everything is a count or date from recorded work.
export async function PortalDashboard({ me }: { me: PortalUser }) {
  const info = PORTAL_INFO[me.role];
  const ids = await linkedStudentIds(me);
  const rows = await summariseStudents(ids);
  const base = `/${me.role}/student/`;
  // Parents see each child's latest saved reports right here (read with the service key only for children they are linked to).
  const latest: Record<string, { id: string; title: string; taken_at: string }[]> = {};
  if (me.role === 'parent' && me.status === 'active' && ids.length) {
    const service = createServiceClient();
    for (const sid of ids) {
      const { data } = await service.from('test_reports').select('id, title, taken_at').eq('student_id', sid).eq('audience', 'adult').order('taken_at', { ascending: false }).limit(5);
      latest[sid] = data ?? [];
    }
  }
  // Tutor / centre plan: seats and the shared credit pool.
  let orgPlan: Awaited<ReturnType<typeof getOrgPlan>> = null; let pool = 0; let seatsEnforced = false;
  if ((me.role === 'tutor' || me.role === 'centre') && me.status === 'active') {
    const service = createServiceClient();
    orgPlan = await getOrgPlan(service, me.userId);
    if (orgPlan && orgPlanActive(orgPlan)) { await ensureOrgMonthlyCredits(service, me.userId).catch(() => 0); pool = await orgBalance(service, me.userId); }
    seatsEnforced = (await loadSettings(service)).seats.enforce;
  }
  const planLive = orgPlanActive(orgPlan);
  const active7 = rows.filter((r) => r.lastActive && Date.now() - Date.parse(r.lastActive) < 7 * 86400000).length;
  const withEv = rows.filter((r) => r.averageMastery !== null);
  const avg = withEv.length ? Math.round(withEv.reduce((a, r) => a + (r.averageMastery ?? 0), 0) / withEv.length) : null;
  const masteryText = (v: number | null) => (v === null ? 'Not enough evidence yet' : `${v}/100 average across practised skills`);

  return (
    <main className="page">
      <div className="shell">
        <div className="hero-banner fade-slide-in" style={{ marginTop: 'var(--space-4)' }}>
          <p className="hero__eyebrow">{info.label} area</p>
          <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>{me.role === 'centre' ? me.displayName : `Welcome, ${me.displayName}`}</h1>
          <p style={{ margin: '0.4rem 0 0' }}>{info.blurb}</p>
        </div>
        <p style={{ marginTop: '0.6rem' }}><SignOutButton label="Sign out" /></p>
        <ReferralPanel />

        {me.status === 'pending' && <p className="alert">Your account is waiting for approval by the Sahayak team. You will be able to add students once it is approved.</p>}
        {me.status === 'suspended' && <p className="alert">This account is not active. Please contact the Sahayak team.</p>}

        {me.role === 'centre' && me.status === 'active' && (
          <div className="stat-tile-row" style={{ marginTop: 'var(--space-3)' }}>
            <div className="stat-tile"><div className="stat-tile__value">{rows.length}</div><div className="stat-tile__label">Students linked</div></div>
            <div className="stat-tile"><div className="stat-tile__value">{active7}</div><div className="stat-tile__label">Active in the last 7 days</div></div>
            <div className="stat-tile"><div className="stat-tile__value">{avg ?? '—'}</div><div className="stat-tile__label">Average mastery (students with evidence)</div></div>
          </div>
        )}

        {(me.role === 'tutor' || me.role === 'centre') && me.status === 'active' && (
          <div className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
            <strong>Your plan</strong>
            {orgPlan ? (
              <div style={{ fontSize: '0.92rem' }}>
                {planLive ? 'Active' : 'Ended or paused'} · students: {rows.length} of {orgPlan.studentLimit} · mock credits in your pool: {pool}
                {orgPlan.accessUntil ? ` · until ${orgPlan.accessUntil}` : ''}
                <div style={{ color: 'var(--slate)' }}>You can give one pool credit to a linked student below, so they can get a handwritten mock marked. Credits in the pool are added each month.</div>
              </div>
            ) : (
              <div style={{ fontSize: '0.92rem', color: 'var(--slate)' }}>
                No paid plan is active yet. {seatsEnforced ? 'You cannot add new students until it is activated.' : 'You can follow students as before.'} <a href="/plans/apply/tutor">Apply or ask about a plan</a>. Terms &amp; Conditions Apply.
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 'var(--space-3)' }}><LinkStudentForm disabled={me.status !== 'active'} /></div>
        {me.role !== 'parent' && <p style={{ marginTop: 'var(--space-2)' }}><a className="btn btn--ghost btn--small" href={`/${me.role}/challenges`}>Set a challenge for your students</a></p>}
        {me.role !== 'parent' && <p style={{ marginTop: 'var(--space-2)' }}><a className="btn btn--ghost btn--small" href={`/${me.role}/baseline`}>Common prerequisite gaps across your students</a></p>}
        {me.role !== 'parent' && <p style={{ marginTop: 'var(--space-2)' }}><a className="btn btn--ghost btn--small" href={`/${me.role}/questions`}>Add questions or ask for questions</a></p>}

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>{me.role === 'parent' ? 'Your children' : me.role === 'tutor' ? 'Your students' : 'Enrolled students'} ({rows.length})</h2>
        {rows.length === 0 && <p style={{ color: 'var(--slate)' }}>No one is linked yet. {me.role === 'parent' ? 'If your child signed up with you, they appear here automatically; otherwise add them with a code above.' : 'Add a student with a code above.'}</p>}

        {me.role === 'parent' && rows.map((r) => (
          <div key={r.studentId} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
            <a href={base + r.studentId} style={{ fontSize: 'var(--step-1)', fontWeight: 700 }}>{r.name}</a>
            <div style={{ color: 'var(--slate)' }}>{masteryText(r.averageMastery)}</div>
            <div style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>Last practised: {day(r.lastActive)} · {r.sessions14d} learning session{r.sessions14d === 1 ? '' : 's'} in the last 14 days</div>
            <div style={{ marginTop: '0.5rem', fontWeight: 600 }}>Latest test reports</div>
            {(latest[r.studentId] ?? []).length === 0
              ? <div style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>No test has been finished yet. Reports appear here, with date and time, as soon as {r.name} finishes one.</div>
              : <ul style={{ margin: '0.2rem 0 0', paddingLeft: '1.1rem' }}>{(latest[r.studentId] ?? []).map((x) => <li key={x.id}><a href={`${base}${r.studentId}/report/${x.id}`}>{x.title}</a> <span style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>· {day(x.taken_at)}</span></li>)}</ul>}
            <div style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}><a href={base + r.studentId}>See everything for {r.name} →</a></div>
            <div style={{ marginTop: '0.3rem', fontSize: '0.9rem' }}>
              <a href={`/parent/student/${r.studentId}/premium/readiness`}>Board Readiness report</a> · <a href={`/parent/student/${r.studentId}/premium/rescue`}>Exam Rescue</a> · <a href={`/parent/student/${r.studentId}/premium/programme`}>Preparation Programme</a> · <a href="/plans">Plans</a>
            </div>
          </div>
        ))}

        {me.role !== 'parent' && rows.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: '0.6rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
              <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}><th>Student</th><th>Skills practised</th><th>Average mastery</th><th>Sessions (14 days)</th><th>Last active</th>{planLive && <th></th>}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '0.5rem 0.4rem' }}><a href={base + r.studentId}>{r.name}</a></td>
                    <td>{r.skillsWithEvidence}</td>
                    <td>{r.averageMastery === null ? 'Not enough evidence' : r.averageMastery + '/100'}</td>
                    <td>{r.sessions14d}</td>
                    <td>{day(r.lastActive)}</td>
                    {planLive && <td><GrantCreditButton studentId={r.studentId} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ color: 'var(--slate)', fontSize: '0.85rem', marginTop: 'var(--space-3)' }}>These numbers come only from what each student has practised on Sahayak. They are not a prediction of marks or rank.</p>
      </div>
    </main>
  );
}
