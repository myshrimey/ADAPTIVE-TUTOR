import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { createServiceClient } from '@/lib/supabase-server';
import { listTeam } from '@adaptive-tutor/core';
import { TeamManager } from '@/components/invite/TeamManager';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate; // no permission: Super Admin only
  const team = await listTeam(createServiceClient());
  return (
    <main className="page"><div className="shell" style={{ paddingTop: 'var(--space-4)' }}><AdminNav />
      <h1 style={{ fontSize: 'var(--step-2)' }}>Admin team</h1>
      <p style={{ color: 'var(--slate)', maxWidth: '62ch' }}>Give colleagues access to only the parts of Admin they need. You stay Super Admin (set in ADMIN_EMAILS). Every change is written to the audit log.</p>
      <TeamManager team={team as any} />
    </div></main>
  );
}
