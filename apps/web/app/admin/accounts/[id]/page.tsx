import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadSnapshot, KIND_LABEL } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
const when = (iso: string | null) => (iso ? iso.slice(0, 16).replace('T', ' ') : 'Never recorded');

// Super Admin only. READ ONLY snapshot of one account (masked). Every open is written to the Audit log.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const { id } = await params;
  const s = await loadSnapshot(createServiceClient(), id, g.email);
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <p><a href="/admin/accounts">← Account directory</a></p>
        <AdminNav />
        {!s.found ? <><h1 style={{ fontSize: 'var(--step-2)' }}>Account not found</h1><p>No account has that id.</p></> : <>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Account {s.shortId} · {s.kind ? KIND_LABEL[s.kind] : ''}</h1>
        <p style={{ color: 'var(--slate)' }}>Read only and masked. This view was recorded in the Audit log. It is a summary from existing records, not the account&apos;s own screens: &quot;view as this account&quot; is not built (and will never sign you in as someone else).</p>
        <table className="data-table"><tbody>
          <tr><th align="left">Initials</th><td>{s.initials || '-'}</td></tr>
          <tr><th align="left">Email (masked)</th><td>{s.maskedEmail}</td></tr>
          <tr><th align="left">Registered</th><td>{when(s.registered)}</td></tr>
          <tr><th align="left">First source</th><td>{s.source ?? 'Not recorded'}</td></tr>
          <tr><th align="left">Status</th><td>{s.status.replace('_', ' ')}</td></tr>
          {s.kind === 'student' && <>
            <tr><th align="left">Grade</th><td>{s.grade ?? '-'}</td></tr>
            <tr><th align="left">Plan</th><td>{s.plan ?? 'No plan'}{s.accessUntil ? ` · until ${s.accessUntil}` : ''}{s.subjectLimit ? ` · up to ${s.subjectLimit} subject(s)` : ''}</td></tr>
            <tr><th align="left">Subjects</th><td>{s.subjects.length ? s.subjects.join(', ') : 'None chosen'}</td></tr>
            <tr><th align="left">Last learning activity</th><td>{when(s.lastActivity)}</td></tr>
            <tr><th align="left">Saved test reports</th><td>{s.reports}</td></tr>
          </>}
          <tr><th align="left">Registered devices</th><td>{s.devices}</td></tr>
        </tbody></table>
        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 20 }}>Links</h2>
        {s.links.length ? <ul>{s.links.map((l, i) => <li key={i}>{l.who} {l.shortId}{l.initials ? ` (${l.initials})` : ''} · {l.type} · {l.status}</li>)}</ul> : <p>No links.</p>}
        {s.payments.length > 0 && <><h2 style={{ fontSize: 'var(--step-1)', marginTop: 20 }}>Payment claims</h2><ul>{s.payments.map((p, i) => <li key={i}>{when(p.at)} · {p.status} · INR {p.amount}</li>)}</ul></>}
        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 20 }}>Timeline (from existing records)</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Built from accounts, access, payments, links, devices, saved reports and the last 30 days of learning events (counts per day only; no answers or messages). Sign-in, page views and errors are not recorded yet, so this is not a complete activity log.</p>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem' }}><tbody>{s.timeline.map((t, i) => <tr key={i}><td style={{ paddingRight: 12 }}>{t.at.slice(0, 10)}</td><td style={{ paddingRight: 12 }}>{t.what}</td><td>{t.detail ?? ''}</td></tr>)}</tbody></table>
        </>}
      </div>
    </div></main>
  );
}
