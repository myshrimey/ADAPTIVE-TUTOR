import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { createServiceClient } from '@/lib/supabase-server';
import { INVITE_ROLES, INVITE_ROLE_LABEL } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate('users'); if ('gate' in g) return g.gate;
  const service = createServiceClient();
  const counts: Record<string, number> = {};
  for (const r of INVITE_ROLES) { const { count } = await service.from('users').select('id', { count: 'exact', head: true }).eq('role', r); counts[r] = count ?? 0; }
  return (
    <main className="page"><div className="shell" style={{ paddingTop: 'var(--space-4)' }}><AdminNav />
      <h1 style={{ fontSize: 'var(--step-2)' }}>Users and accounts</h1>
      <p style={{ color: 'var(--slate)' }}>Create accounts by invitation, see who has been invited, and manage your team. Counts are accounts that exist now.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        {INVITE_ROLES.map((r) => <a key={r} className="btn btn--accent" href={`/admin/users/create?role=${r}`}>+ Add {INVITE_ROLE_LABEL[r]}</a>)}
      </div>
      <table className="data-table"><thead><tr><th>Kind of account</th><th>Accounts</th></tr></thead><tbody>{INVITE_ROLES.map((r) => <tr key={r}><td>{INVITE_ROLE_LABEL[r]}</td><td>{counts[r]}</td></tr>)}</tbody></table>
      <ul style={{ lineHeight: 1.9 }}>
        <li><a href="/admin/invitations">All invitations and their progress</a></li>
        <li><a href="/admin/team">Admin team and permissions</a> (Super Admin only)</li>
        <li><a href="/admin/students">Students and plans</a> · <a href="/admin/teachers">Teachers</a> · <a href="/admin/partners">Parents, tutors, centres</a></li>
        <li><a href="/help">Help</a></li>
      </ul>
    </div></main>
  );
}
