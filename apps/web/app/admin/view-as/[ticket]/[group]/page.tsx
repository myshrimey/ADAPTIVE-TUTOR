import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate } from '@/lib/admin-page';
import { viewAsSecret } from '@/lib/view-as';
import { verifyTicket, isViewGroup, VIEW_GROUPS, VIEW_GROUP_LABEL, resolveViewTarget, loadViewData, writeAudit } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic'; // dynamic pages are sent with no-store: nothing here is cached

const pct = (v: number | null) => (v === null ? 'n/a' : `${Math.round(v)}%`);
const when = (iso: string | null) => (iso ? iso.slice(0, 16).replace('T', ' ') : 'n/a');

// v140: READ ONLY "view as" pages (design: VIEW_AS_DESIGN.md). No forms, no fetch, no writes: this file may only read.
// The gate comes first; the ticket is checked on every request; the account is re-derived on the server from the signed ticket.
export default async function Page({ params }: { params: Promise<{ ticket: string; group: string }> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const { ticket, group } = await params;
  const v = verifyTicket(decodeURIComponent(ticket), viewAsSecret(), g.email);
  const stop = (text: string) => <main className="page"><div className="shell"><h1 style={{ fontSize: 'var(--step-2)' }}>View ended</h1><p>{text}</p><p><a href="/admin/accounts">Back to the account directory</a></p></div></main>;
  if (!v.ok) return stop(v.reason === 'expired' ? 'This view ticket has expired (they last 15 minutes). Start a new one from the account page; it needs a reason and is recorded.' : 'This view ticket is not valid for you.');
  if (!isViewGroup(group)) return stop('That page is not part of the view.');
  const service = createServiceClient();
  const target = await resolveViewTarget(service, v.payload.tgt);
  if (!target) return stop('That account has no student record to view.');
  await writeAudit(service, { actorEmail: g.email, actorRole: 'super_admin', action: 'account.view_as_page', entity: 'account', entityId: target.shortId, targetAccount: v.payload.tgt, outcome: 'success', detail: { page: group } });
  const d = await loadViewData(service, target.studentId, group);
  const t = encodeURIComponent(ticket);
  return (
    <main className="page"><div className="shell">
      <div role="status" style={{ position: 'sticky', top: 0, zIndex: 50, background: '#7c2d12', color: '#fff', padding: '10px 14px', borderRadius: 6, margin: '8px 0' }}>
        <strong>Viewing account {target.shortId}{target.initials ? ` (${target.initials})` : ''} as admin. Read only.</strong> About {v.minutesLeft} minute(s) left. Recorded in the Audit log. <a href={`/admin/view-as/end?t=${t}`} style={{ color: '#fff', textDecoration: 'underline', marginLeft: 8 }}>Exit</a>
      </div>
      <p>{VIEW_GROUPS.map((x) => x === group ? <strong key={x} style={{ marginRight: 12 }}>{VIEW_GROUP_LABEL[x]}</strong> : <a key={x} href={`/admin/view-as/${t}/${x}`} style={{ marginRight: 12 }}>{VIEW_GROUP_LABEL[x]}</a>)}</p>
      <p style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>A summary built from the same records the student sees, not their own screen. No name, contact details, messages or answers are shown.</p>

      {d.group === 'dashboard' && <>
        <table className="data-table"><tbody>
          <tr><th align="left">Grade</th><td>{target.grade ?? '-'}</td></tr>
          <tr><th align="left">Plan</th><td>{d.data.plan ?? 'No plan'}{d.data.accessUntil ? ` · until ${d.data.accessUntil}` : ''}{d.data.subjectLimit ? ` · up to ${d.data.subjectLimit} subject(s)` : ''}</td></tr>
          <tr><th align="left">Subjects</th><td>{d.data.subjects.length ? d.data.subjects.join(', ') : 'None chosen'}</td></tr>
        </tbody></table>
        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 16 }}>Latest lessons</h2>
        {d.data.lessons.length ? <table className="data-table"><thead><tr><th align="left">Started (UTC)</th><th align="left">Skill</th><th align="left">Status</th><th align="left">Mastery</th></tr></thead><tbody>{d.data.lessons.map((l, i) => <tr key={i}><td>{when(l.at)}</td><td>{l.skill}</td><td>{l.status}</td><td>{l.from ?? '-'} → {l.to ?? '-'}</td></tr>)}</tbody></table> : <p>No lessons yet.</p>}
      </>}

      {d.group === 'progress' && (d.data.subjects.length ? <table className="data-table"><thead><tr><th align="left">Subject</th><th align="left">Start</th><th align="left">Now</th><th align="left">Covered</th><th align="left">Evidence</th><th align="left">Readiness</th><th align="left">Needs practice</th><th align="left">Next</th></tr></thead>
        <tbody>{d.data.subjects.map((s, i) => <tr key={i} style={{ verticalAlign: 'top' }}><td>{s.name}</td><td>{pct(s.baseline)}</td><td>{pct(s.current)}</td><td>{pct(s.coverage)}</td><td>{s.evidence}</td><td>{s.readiness || '-'}</td><td>{s.needsPractice.join(', ') || '-'}</td><td>{s.next ?? '-'}</td></tr>)}</tbody></table> : <p>No subject progress yet.</p>)}

      {d.group === 'report' && <>
        <p>Readiness assessed: {d.data.readiness.assessed} of {d.data.readiness.total} subjects; on track or above: {d.data.readiness.onTrackOrAbove}. Gentler-start sessions in the last 30 days: {d.data.gentlerSessions}.</p>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Tests</h2>
        {d.data.tests.length ? <table className="data-table"><thead><tr><th align="left">When (UTC)</th><th align="left">Subject</th><th align="left">Kind</th><th align="left">Score</th></tr></thead><tbody>{d.data.tests.map((x, i) => <tr key={i}><td>{when(x.at)}</td><td>{x.subject}</td><td>{x.kind.replace('_', ' ')}</td><td>{pct(x.percent)}</td></tr>)}</tbody></table> : <p>No tests taken yet.</p>}
      </>}
    </div></main>
  );
}
