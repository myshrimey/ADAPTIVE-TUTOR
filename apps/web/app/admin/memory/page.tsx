import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { MemoryEditor } from '@/components/founder/MemoryEditor';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const { data } = await createServiceClient().from('founder_memory').select('section, title, body').order('sort');
  return (<main className="page"><div className="shell shell--narrow"><div style={{ paddingTop: 'var(--space-3)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>Project memory</h1>
    <p style={{ color: 'var(--slate)' }}>Write your vision, decisions and rejected ideas here in your own words. <a href="/api/admin/founder/memory-export"><strong>Download everything as one text file</strong></a> to give a future Claude session or another AI the full picture. The file contains live prices and settings but no passwords, keys or child data.</p><AdminNav /></div>
    <MemoryEditor sections={(data ?? []) as any} /></div></main>);
}
