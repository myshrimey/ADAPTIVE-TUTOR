import { createServerClient } from '@/lib/supabase-server';
import { AdminSignIn } from '@/components/AdminSignIn';
import { SignOutButton } from '@/components/SignOutButton';

// Shared gate for server-rendered admin pages: returns the admin's email, or the sign-in UI to render.
export async function adminPageGate(): Promise<{ email: string } | { gate: React.ReactNode }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (user?.email && allowed.includes(user.email.toLowerCase())) return { email: user.email };
  return {
    gate: (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Admin sign in</h1>
          {user ? (
            <>
              <p className="alert">Signed in as {user.email}, but this account isn&apos;t in ADMIN_EMAILS.</p>
              <SignOutButton label="Sign out" />
            </>
          ) : (
            <AdminSignIn />
          )}
        </div>
      </main>
    ),
  };
}

export function AdminNav() {
  return (
    <p style={{ color: 'var(--slate)' }}>
      <a href="/admin/students">Students and plans</a> · <a href="/admin/payments">Payments</a> · <a href="/admin/teachers">Teachers</a> · <a href="/admin/reviews">Question reviews</a> · <a href="/admin/quality">Quality gates</a> · <a href="/admin/metrics">Metrics</a> · <a href="/admin/ai-costs">AI cost</a> · <a href="/admin/feedback">Feedback</a>
    </p>
  );
}
