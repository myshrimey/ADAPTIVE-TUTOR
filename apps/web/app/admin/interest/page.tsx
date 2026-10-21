import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { AdminInterest } from '@/components/AdminInterest';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const { data } = await createServiceClient().from('commerce_interest').select('*').order('created_at', { ascending: false }).limit(300);
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Applications and requests</h1>
        <p style={{ color: 'var(--slate)' }}>Tutor, coaching-centre and Founding Partner interest, and subject requests. Follow up personally. These are not purchases and not investments. <a href="/api/admin/commerce/export?table=interest">Download CSV</a></p>
        <AdminNav />
      </div>
      <AdminInterest rows={data ?? []} />
    </div></main>
  );
}
