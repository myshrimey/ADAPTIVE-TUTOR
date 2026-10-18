import { PORTAL_INFO } from '@adaptive-tutor/core';
import { type PortalUser, linkedStudentIds, summariseStudents } from '@/lib/portal';
import { LinkStudentForm } from './LinkStudentForm';
import { SignOutButton } from '@/components/SignOutButton';

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

        {me.status === 'pending' && <p className="alert">Your account is waiting for approval by the Sahayak team. You will be able to add students once it is approved.</p>}
        {me.status === 'suspended' && <p className="alert">This account is not active. Please contact the Sahayak team.</p>}

        {me.role === 'centre' && me.status === 'active' && (
          <div className="stat-tile-row" style={{ marginTop: 'var(--space-3)' }}>
            <div className="stat-tile"><div className="stat-tile__value">{rows.length}</div><div className="stat-tile__label">Students linked</div></div>
            <div className="stat-tile"><div className="stat-tile__value">{active7}</div><div className="stat-tile__label">Active in the last 7 days</div></div>
            <div className="stat-tile"><div className="stat-tile__value">{avg ?? '—'}</div><div className="stat-tile__label">Average mastery (students with evidence)</div></div>
          </div>
        )}

        <div style={{ marginTop: 'var(--space-3)' }}><LinkStudentForm disabled={me.status !== 'active'} /></div>

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>{me.role === 'parent' ? 'Your children' : me.role === 'tutor' ? 'Your students' : 'Enrolled students'} ({rows.length})</h2>
        {rows.length === 0 && <p style={{ color: 'var(--slate)' }}>No one is linked yet. Add a student with a code above.</p>}

        {me.role === 'parent' && rows.map((r) => (
          <a key={r.studentId} href={base + r.studentId} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem', textDecoration: 'none', color: 'inherit' }}>
            <strong style={{ fontSize: 'var(--step-1)' }}>{r.name}</strong>
            <div style={{ color: 'var(--slate)' }}>{masteryText(r.averageMastery)}</div>
            <div style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>Last practised: {day(r.lastActive)} · {r.sessions14d} learning session{r.sessions14d === 1 ? '' : 's'} in the last 14 days</div>
          </a>
        ))}

        {me.role !== 'parent' && rows.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: '0.6rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
              <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}><th>Student</th><th>Skills practised</th><th>Average mastery</th><th>Sessions (14 days)</th><th>Last active</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '0.5rem 0.4rem' }}><a href={base + r.studentId}>{r.name}</a></td>
                    <td>{r.skillsWithEvidence}</td>
                    <td>{r.averageMastery === null ? 'Not enough evidence' : r.averageMastery + '/100'}</td>
                    <td>{r.sessions14d}</td>
                    <td>{day(r.lastActive)}</td>
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
