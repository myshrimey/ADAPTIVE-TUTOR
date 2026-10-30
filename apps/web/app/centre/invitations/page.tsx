import { requirePortalPage } from '@/lib/portal';
import { createServiceClient } from '@/lib/supabase-server';
import { listInvitations, INVITE_ROLE_LABEL, INVITE_STATUS_LABEL } from '@adaptive-tutor/core';
import { InviteCreator } from '@/components/invite/InviteCreator';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const me = await requirePortalPage('centre');
  const rows = me.status === 'active' ? await listInvitations(createServiceClient(), { orgUser: me.userId }) : [];
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Invite your people</h1>
      <p style={{ color: 'var(--slate)' }}>Invite your own students, teachers and tutors. They join your centre by their own link. Joining a centre does not give you access to a student&apos;s learning: a family still shares that with a code. New tutors and teachers also wait for Sahayak approval.</p>
      {me.status !== 'active' ? <p className="alert">Your centre account is waiting for approval.</p> : <InviteCreator endpoint="/api/centre/invitations" roles={['student', 'teacher', 'tutor']} detailBase="/centre/invitations" listHref="/centre/invitations" />}
      {rows.length > 0 && (<section style={{ marginTop: 'var(--space-4)' }}><h2 style={{ fontSize: 'var(--step-1)' }}>Your invitations</h2>
        <table className="data-table"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Expires</th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.id}><td>{r.invitee_name}</td><td>{INVITE_ROLE_LABEL[r.role]}</td><td>{INVITE_STATUS_LABEL[r.status]}</td><td>{new Date(r.expires_at).toLocaleDateString('en-IN')}</td></tr>)}
        </tbody></table></section>)}
      <p><a href="/centre">Back to my centre</a></p>
    </div></main>
  );
}
