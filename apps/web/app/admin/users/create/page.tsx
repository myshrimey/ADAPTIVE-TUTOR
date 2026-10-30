import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { InviteCreator } from '@/components/invite/InviteCreator';
import { isInviteRole } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const g = await adminPageGate('users'); if ('gate' in g) return g.gate;
  const sp = await searchParams;
  return (
    <main className="page"><div className="shell" style={{ paddingTop: 'var(--space-4)' }}><AdminNav />
      <h1 style={{ fontSize: 'var(--step-2)' }}>Create an account by invitation</h1>
      <p style={{ color: 'var(--slate)', maxWidth: '60ch' }}>Choose the kind of account, fill in what you know, then share the link. The person sets their own password, and the account type is fixed by this invitation: they cannot pick or change it.</p>
      <InviteCreator initialRole={isInviteRole(sp.role) ? sp.role : undefined} />
    </div></main>
  );
}
