import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { AdminSignIn } from '@/components/AdminSignIn';
import { SignOutButton } from '@/components/SignOutButton';
import { AdminPaymentActions } from '@/components/AdminPaymentActions';

// Same gating pattern as /admin/feedback: ADMIN_EMAILS, checked against the
// signed-in user's own email. This is the only place a pilot_payments row
// can move from "pending" to "confirmed"/"rejected" — pilot_payments has no
// RLS update policy for ordinary authenticated users at all (see migration
// 0009_pilot_payments.sql), so this page is not just a UI gate, it's backed
// by a database-level one too.
export default async function AdminPaymentsPage() {
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
            <h1 style={{ fontSize: 'var(--step-2)' }}>Admin sign in</h1>
            {user ? (
              <>
                <p className="alert">Signed in as {user.email}, but this account isn't in ADMIN_EMAILS.</p>
                <SignOutButton label="Sign out" />
              </>
            ) : (
              <>
                <p style={{ color: 'var(--slate)' }}>Sign in with an allowed account to manage payments.</p>
                <AdminSignIn />
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  const service = createServiceClient();
  const { data: rows, error } = await service
    .from('pilot_payments')
    .select('id, created_at, offer_label, amount, payment_date, transaction_reference, status, pilot_start_date, pilot_end_date, student_id, students(display_name)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <h1 style={{ fontSize: 'var(--step-2)' }}>Payments (Complete Board Preparation)</h1>
            <p style={{ color: 'var(--slate)' }}>{rows?.length ?? 0} claims. Signed in as {user!.email}.</p>
          </div>
          <SignOutButton />
        </div>

        {error && <p className="alert">{error.message}</p>}
        {rows && rows.length === 0 && <p style={{ color: 'var(--slate)' }}>No payment claims submitted yet.</p>}

        {rows?.map((r: any) => (
          <div key={r.id} className="chapter-row" style={{ alignItems: 'flex-start' }}>
            <div className="chapter-row__body">
              <div className="chapter-row__title">
                {r.students?.display_name ?? 'Student'} — ₹{r.amount} — {r.offer_label}
              </div>
              <div className="chapter-row__skills">
                Paid {r.payment_date} · submitted {new Date(r.created_at).toLocaleString()} · status: <strong>{r.status}</strong>
                {r.transaction_reference && <> · ref: {r.transaction_reference}</>}
              </div>
              {r.status === 'confirmed' && (
                <div className="chapter-row__skills">
                  Access {r.pilot_start_date} → {r.pilot_end_date}
                </div>
              )}
              {r.status === 'pending' && <AdminPaymentActions paymentId={r.id} />}
              {r.status === 'confirmed' && <AdminPaymentActions paymentId={r.id} status="confirmed" />}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
