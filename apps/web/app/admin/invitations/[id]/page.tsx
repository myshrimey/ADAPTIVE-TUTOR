import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { createServiceClient } from '@/lib/supabase-server';
import { invitationDetail, inviteToken, INVITE_ROLE_LABEL, INVITE_STATUS_LABEL, ROLE_FIELDS } from '@adaptive-tutor/core';
import { siteOrigin, inviteLink } from '@/lib/site-url';
import { InvitationActions } from '@/components/invite/InvitationActions';

export const dynamic = 'force-dynamic';
const stamp = (v: string | null) => (v ? new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—');
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const g = await adminPageGate('invitations'); if ('gate' in g) return g.gate;
  const { id } = await params; const service = createServiceClient();
  const d = await invitationDetail(service, id);
  if (!d) return <main className="page"><div className="shell"><AdminNav /><p>Invitation not found.</p></div></main>;
  const { inv } = d; const token = await inviteToken(service, id); const link = token ? inviteLink(siteOrigin(), token) : null;
  const labels = Object.fromEntries(ROLE_FIELDS[inv.role].map((f) => [f.key, f.label]));
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><AdminNav />
      <p><a href="/admin/invitations">← All invitations</a></p>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{INVITE_ROLE_LABEL[inv.role]} invitation: {inv.invitee_name}</h1>
      <p><strong>{INVITE_STATUS_LABEL[inv.status]}</strong> · expires {stamp(inv.expires_at)} · opened {inv.open_count} time(s)</p>
      {inv.conflict_note && <p className="alert">{inv.conflict_note} No second account is created and nothing is converted automatically.</p>}
      <InvitationActions id={inv.id} status={inv.status} role={inv.role} link={link} campaign={inv.campaign} canDecide={!!g.superAdmin} roleChanges={d.roleChanges} />
      <h2 style={{ fontSize: 'var(--step-1)' }}>Details</h2>
      <ul style={{ lineHeight: 1.7 }}>
        <li>Email: {inv.invitee_email ?? '—'} · Phone: {inv.invitee_phone ?? '—'}</li>
        {Object.entries(inv.fields ?? {}).map(([k, v]) => <li key={k}>{labels[k] ?? k}: {v}</li>)}
        <li>Created by {inv.created_by ?? '—'} on {stamp(inv.created_at)}</li>
        <li>Source: {inv.source ?? 'Not recorded'} · Campaign: {inv.campaign ?? 'Not recorded'} · Referral code: {inv.referral_code ?? 'none'}</li>
        <li>Opened {stamp(inv.opened_at)} · Started {stamp(inv.started_at)} · Completed {stamp(inv.completed_at)} · First login {stamp(inv.first_login_at)} · Activated {stamp(inv.activated_at)} · Paid {stamp(inv.paid_at)}</li>
        {inv.note && <li>Your note: {inv.note}</li>}
        {inv.revoked_at && <li>Closed {stamp(inv.revoked_at)}: {inv.revoked_reason ?? ''}</li>}
      </ul>
      <h2 style={{ fontSize: 'var(--step-1)' }}>History</h2>
      <table className="data-table"><thead><tr><th>When</th><th>What</th><th>By</th></tr></thead><tbody>{d.events.map((e: any) => <tr key={e.id}><td>{stamp(e.at)}</td><td>{String(e.event).replace(/_/g, ' ')}</td><td>{e.actor ?? 'system / the invitee'}</td></tr>)}</tbody></table>
    </div></main>
  );
}
