import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { AdminPricing } from '@/components/AdminPricing';
import { loadSettings } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const s = createServiceClient();
  const [{ data: products }, { data: offers }, settings, { data: noteRows }] = await Promise.all([
    s.from('commerce_products').select('*').order('sort'), s.from('commerce_offers').select('*').order('code'), loadSettings(s), s.from('commerce_settings').select('key, note'),
  ]);
  const notes = new Map((noteRows ?? []).map((r: any) => [r.key, r.note]));
  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Pricing, offers and limits</h1>
          <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. Everything here changes the live site without any code. Handwritten mock list price is ₹499; use an offer for discounts instead of changing it.</p>
          <AdminNav />
        </div>
        <AdminPricing products={(products ?? []) as any} offers={(offers ?? []) as any} settings={Object.entries(settings).map(([key, value]) => ({ key, value, note: notes.get(key) ?? null }))} />
      </div>
    </main>
  );
}
