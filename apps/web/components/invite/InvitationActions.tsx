'use client';
import { useState } from 'react';
import { ShareBar } from './ShareBar';

// Revoke / cancel / new link / extend for one invitation, and (Super Admin) approve or reject a logged role-change request.
export function InvitationActions({ id, status, role, link, campaign, canDecide, roleChanges }: { id: string; status: string; role: any; link: string | null; campaign: string | null; canDecide: boolean; roleChanges: { id: string; previous_role: string; requested_role: string; status: string }[] }) {
  const [msg, setMsg] = useState(''); const [newLink, setNewLink] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function act(action: string) {
    if ((action === 'revoke' || action === 'cancel') && !confirm('Close this invitation? The link will stop working.')) return;
    setBusy(true); setMsg('');
    const r = await fetch('/api/admin/invitations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, reason: action === 'revoke' ? 'Revoked by admin' : undefined }) }).then((x) => x.json()).catch(() => ({ error: 'failed' }));
    setBusy(false);
    if (r.error) { setMsg('Could not do that: ' + r.error); return; }
    if (action === 'reissue' && r.data?.link) { setNewLink(r.data.link); setMsg('A new invitation was created. The old link no longer works.'); } else { setMsg('Done.'); setTimeout(() => location.reload(), 600); }
  }
  async function decide(rid: string, approve: boolean) {
    setBusy(true);
    const r = await fetch('/api/admin/role-changes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: rid, approve }) }).then((x) => x.json()).catch(() => ({ error: 'failed' }));
    setBusy(false); if (r.error) setMsg('Role change: ' + r.error); else location.reload();
  }
  const open = status === 'pending' || status === 'opened';
  return (
    <div>
      {open && link && <ShareBar role={role} link={link} campaign={campaign} />}
      {newLink && <div><h3>New invitation link</h3><ShareBar role={role} link={newLink} campaign={campaign} /></div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        {open && <button className="btn" disabled={busy} onClick={() => act('revoke')}>Revoke</button>}
        {open && <button className="btn" disabled={busy} onClick={() => act('extend')}>Extend 14 days</button>}
        {status !== 'accepted' && <button className="btn btn--accent" disabled={busy} onClick={() => act('reissue')}>Generate a new invitation</button>}
      </div>
      {roleChanges.filter((r) => r.status === 'pending').map((r) => (
        <p key={r.id} className="alert">Role change requested: {r.previous_role} → {r.requested_role}. {canDecide ? (<><button className="btn" disabled={busy} onClick={() => decide(r.id, true)}>Approve</button> <button className="btn" disabled={busy} onClick={() => decide(r.id, false)}>Reject</button></>) : 'Only the Super Admin can decide this.'}</p>
      ))}
      <p role="status" style={{ color: 'var(--slate)' }}>{msg}</p>
    </div>
  );
}
