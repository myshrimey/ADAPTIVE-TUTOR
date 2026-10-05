import { createServerClient, createServiceClient } from '@/lib/supabase-server';

// Gated on ADMIN_EMAILS (apps/web/.env.example) rather than a role in the
// database — this is a one-person-trial MVP, not worth a real roles table
// yet. Reads via the service client because the `feedback` table has no
// select policy for anon/authenticated (packages/db/migrations/0003_feedback.sql)
// — only the service role can read it back, by design.
export default async function AdminFeedbackPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowedEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAllowed = !!user?.email && allowedEmails.includes(user.email.toLowerCase());

  if (!isAllowed) {
    return (
      <main className="page">
        <div className="shell shell--narrow">
          <div style={{ paddingTop: 'var(--space-4)' }}>
            <h1 style={{ fontSize: 'var(--step-2)' }}>Not available</h1>
            <p style={{ color: 'var(--slate)' }}>
              {user ? "This account isn't allowed to view this page." : 'Sign in with an allowed account to view this page.'}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const service = createServiceClient();
  const { data: rows, error } = await service
    .from('feedback')
    .select('id, created_at, rating, message, contact_email, page, student_id')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Feedback</h1>
          <p style={{ color: 'var(--slate)' }}>{rows?.length ?? 0} most recent submissions.</p>
        </div>

        {error && <p className="alert">{error.message}</p>}

        {rows && rows.length === 0 && <p style={{ color: 'var(--slate)' }}>Nothing submitted yet.</p>}

        {rows?.map((r) => (
          <div key={r.id} className="chapter-row" style={{ alignItems: 'flex-start' }}>
            <div className="chapter-row__body">
              <div className="chapter-row__title" style={{ display: 'flex', gap: '0.8rem', alignItems: 'baseline' }}>
                {r.rating != null && <span style={{ fontFamily: 'var(--font-mono)' }}>{r.rating}/5</span>}
                <span style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>
                  {new Date(r.created_at).toLocaleString()} {r.page ? `· ${r.page}` : ''}
                </span>
              </div>
              <p style={{ margin: '0.4rem 0' }}>{r.message}</p>
              {r.contact_email && <p style={{ color: 'var(--slate)', fontSize: '0.85rem', margin: 0 }}>Reply to: {r.contact_email}</p>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
