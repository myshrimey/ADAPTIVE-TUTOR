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
      <a href="/admin/command-centre"><strong>Founder Command Centre</strong></a> · <a href="/admin/crm">Customers &amp; leads</a> · <a href="/admin/crm?group=institutions">Schools</a> · <a href="/admin/funding">Funding &amp; investors</a> · <a href="/admin/expenses">Money in / out</a> · <a href="/admin/tasks">Founder tasks</a> · <a href="/admin/changelog">Change log</a> · <a href="/admin/memory">Project memory</a> · <a href="/admin/overview">Product dashboard</a> · <a href="/admin/students">Students and plans</a> · <a href="/admin/pricing">Pricing and offers</a> · <a href="/admin/commercial">Commercial dashboard</a> · <a href="/admin/interest">Applications and requests</a> · <a href="/admin/engagement">Student engagement</a> · <a href="/admin/engagement-settings">Engagement settings</a> · <a href="/admin/engagement/ab">Engagement experiments</a> · <a href="/admin/engagement/referrals">Referrals (old)</a> · <a href="/admin/referral-rewards"><strong>Referral links and rewards</strong></a> · <a href="/admin/payments">Payments</a> · <a href="/admin/teachers">Teachers</a> · <a href="/admin/partners">Parents, tutors, centres</a> · <a href="/admin/translations">Hindi questions</a> · <a href="/admin/translations/review">Check Hindi translations</a> · <a href="/admin/subject-requests">Subject requests</a> · <a href="/admin/question-bank">Question bank growth</a> · <a href="/admin/reviews">Question reviews</a> · <a href="/admin/quality">Quality gates</a> · <a href="/admin/metrics">Metrics</a> · <a href="/admin/funnel">Funnel</a> · <a href="/admin/devices">Devices</a> · <a href="/admin/data-requests">Data requests</a> · <a href="/admin/handwriting">Handwriting marking</a> · <a href="/admin/questions">Question statistics</a> · <a href="/admin/ai-infrastructure"><strong>AI Infrastructure</strong></a> · <a href="/admin/ai-economics"><strong>AI Economics</strong></a> · <a href="/admin/ai-requests">AI requests</a> · <a href="/admin/ai-costs">AI cost</a> · <a href="/admin/feedback">Feedback</a>
    </p>
  );
}
