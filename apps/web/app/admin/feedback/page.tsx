import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { SignOutButton } from '@/components/SignOutButton';
import { FeedbackPictureAdmin } from '@/components/FeedbackPictureAdmin';
import { FB_CATEGORY_LABEL, type FbCategory } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';

// Raw list of messages, newest first. The grouped view is at /admin/feedback-intelligence.
// Reads through the service client because the `feedback` table has no select policy for anon/authenticated (migration 0003).
export default async function AdminFeedbackPage() {
  const g = await adminPageGate('support');
  if ('gate' in g) return g.gate;
  const { data: rows, error } = await createServiceClient()
    .from('feedback')
    .select('id, created_at, rating, message, contact_email, page, category')
    .order('created_at', { ascending: false })
    .limit(200);
  // Pictures are optional: if migration 0061 is not applied yet, the read fails and we show none.
  const pics = new Map<string, string[]>();
  try {
    const ids = (rows ?? []).map((r: any) => r.id);
    if (ids.length) {
      const { data: ps } = await createServiceClient().from('feedback_attachments').select('id, feedback_id').in('feedback_id', ids);
      for (const p of (ps ?? []) as any[]) pics.set(p.feedback_id, [...(pics.get(p.feedback_id) ?? []), p.id]);
    }
  } catch { /* table missing: no pictures */ }
  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <h1 style={{ fontSize: 'var(--step-2)' }}>All feedback messages</h1>
            <p style={{ color: 'var(--slate)' }}>{rows?.length ?? 0} most recent. Signed in as {g.email}. <a href="/admin/feedback-intelligence">See them grouped</a>.</p>
          </div>
          <SignOutButton />
        </div>
        <AdminNav />
        {error && <p className="alert">{error.message}</p>}
        {rows && rows.length === 0 && <p style={{ color: 'var(--slate)' }}>Nothing submitted yet.</p>}
        {rows?.map((r: any) => (
          <div key={r.id} className="chapter-row" style={{ alignItems: 'flex-start' }}>
            <div className="chapter-row__body">
              <div className="chapter-row__title" style={{ display: 'flex', gap: '0.8rem', alignItems: 'baseline' }}>
                {r.rating != null && <span style={{ fontFamily: 'var(--font-mono)' }}>{r.rating}/5</span>}
                {r.category && <span>{FB_CATEGORY_LABEL[r.category as FbCategory] ?? r.category}</span>}
                <span style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} {r.page ? `· ${r.page}` : ''}</span>
              </div>
              <p style={{ margin: '0.4rem 0' }}>{r.message}</p>
              {(pics.get(r.id) ?? []).length > 0 && (
                <div style={{ margin: '0.4rem 0' }}>
                  <p style={{ color: 'var(--slate)', fontSize: '0.85rem', margin: '0 0 4px' }}>{pics.get(r.id)!.length} picture(s). May show personal details: handle with care.</p>
                  {pics.get(r.id)!.map((pid) => <FeedbackPictureAdmin key={pid} id={pid} />)}
                </div>
              )}
              {r.contact_email && <p style={{ color: 'var(--slate)', fontSize: '0.85rem', margin: 0 }}>Reply to: {r.contact_email}</p>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
