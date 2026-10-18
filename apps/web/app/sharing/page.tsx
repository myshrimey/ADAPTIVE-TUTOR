import { redirect } from 'next/navigation';
import { getCurrentStudentId } from '@/lib/supabase-server';
import { SharingClient } from '@/components/SharingClient';

export const dynamic = 'force-dynamic';
export default async function SharingPage() {
  try { await getCurrentStudentId(); } catch (e: any) { redirect(e?.message === 'device_limit' ? '/device-limit' : '/'); }
  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Sharing: who can follow my progress</h1>
        <p style={{ color: 'var(--slate)' }}>A parent, tutor or coaching centre sees your progress only if you (or your family) give them a one-time code. You can stop anyone at any time. They never see your password or your account settings.</p>
        <SharingClient />
      </div>
    </main>
  );
}
