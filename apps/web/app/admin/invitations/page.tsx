import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { createServiceClient } from '@/lib/supabase-server';
import { listInvitations, inviteStats, syncProgress, INVITE_ROLES, INVITE_ROLE_LABEL, INVITE_STATUSES, INVITE_STATUS_LABEL } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
const when = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const g = await adminPageGate('invitations'); if ('gate' in g) return g.gate;
  const sp = await searchParams; const service = createServiceClient();
  await syncProgress(service).catch(() => 0);
  const all = await listInvitations(service, {});
  const stats = inviteStats(all);
  const rows = await listInvitations(service, { status: sp.status, role: sp.role, q: sp.q, source: sp.source });
  return (
    <main className="page"><div className="shell" style={{ paddingTop: 'var(--space-4)' }}><AdminNav />
      <h1 style={{ fontSize: 'var(--step-2)' }}>Invitations</h1>
      <p><a className="btn btn--accent" href="/admin/users/create">+ New invitation</a></p>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Funnel (all invitations)</h2>
      <table className="data-table"><thead><tr>{stats.funnel.map((f) => <th key={f.step}>{f.step}</th>)}</tr></thead><tbody><tr>{stats.funnel.map((f) => <td key={f.step}>{f.count}</td>)}</tr></tbody></table>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>Counts from the database. First login, Activated (first learning, or first sign-in for adults) and Paid are filled in from what is recorded and may lag. {stats.conflicts > 0 ? `${stats.conflicts} invitation(s) are flagged: the email already has an account.` : ''} See also <a href="/admin/acquisition">Acquisition</a>.</p>
      <details style={{ margin: '8px 0' }}><summary>By role, source and who created them</summary>
        <p>Role: {Object.entries(stats.byRole).map(([k, v]) => `${INVITE_ROLE_LABEL[k as keyof typeof INVITE_ROLE_LABEL] ?? k} ${v}`).join(' · ')}</p>
        <p>Source: {Object.entries(stats.bySource).map(([k, v]) => `${k} ${v}`).join(' · ')}</p>
        <p>Created by: {Object.entries(stats.byCreator).map(([k, v]) => `${k} ${v}`).join(' · ')}</p></details>
      <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <select name="status" defaultValue={sp.status ?? ''} aria-label="Status" className="field__input" style={{ width: 'auto' }}><option value="">Any status</option>{INVITE_STATUSES.map((s) => <option key={s} value={s}>{INVITE_STATUS_LABEL[s]}</option>)}</select>
        <select name="role" defaultValue={sp.role ?? ''} aria-label="Role" className="field__input" style={{ width: 'auto' }}><option value="">Any role</option>{INVITE_ROLES.map((r) => <option key={r} value={r}>{INVITE_ROLE_LABEL[r]}</option>)}</select>
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Name, email or phone" aria-label="Search" className="field__input" style={{ width: 'auto' }} />
        <button className="btn">Filter</button> <a className="btn" href="/admin/invitations">Clear</a>
      </form>
      <table className="data-table"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Created</th><th>Expires</th><th>Opened</th><th>By</th><th></th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id}><td>{r.invitee_name}{r.conflict_user && r.status !== 'accepted' ? ' ⚠' : ''}</td><td>{INVITE_ROLE_LABEL[r.role]}</td><td>{INVITE_STATUS_LABEL[r.status]}</td><td>{when(r.created_at)}</td><td>{when(r.expires_at)}</td><td>{r.open_count}</td><td>{r.created_by?.startsWith('centre:') ? 'Centre' : r.created_by}</td><td><a href={`/admin/invitations/${r.id}`}>Open / share</a></td></tr>)}
        {rows.length === 0 && <tr><td colSpan={8}>No invitations match.</td></tr>}
      </tbody></table>
    </div></main>
  );
}
