import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { AdminSignIn } from '@/components/AdminSignIn';
import { SignOutButton } from '@/components/SignOutButton';
import { AdminStudents, type AdminStudentRow } from '@/components/AdminStudents';

// Founder-only (ADMIN_EMAILS): create student accounts, assign plans, reset passwords.
export default async function AdminStudentsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isAllowed = !!user?.email && allowed.includes(user.email.toLowerCase());

  if (!isAllowed) {
    return (
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
    );
  }

  const service = createServiceClient();
  const { data } = await service
    .from('students')
    .select('id, display_name, must_complete_profile, created_at, users(email), student_access(plan_code, subject_limit, access_until, notes), learning_goals(status, subjects(name))')
    .order('created_at', { ascending: false })
    .limit(500);

  const rows: AdminStudentRow[] = (data ?? []).map((s: any) => {
    const acc = Array.isArray(s.student_access) ? s.student_access[0] : s.student_access;
    return {
      id: s.id,
      displayName: s.display_name,
      email: s.users?.email ?? '',
      planCode: acc?.plan_code ?? null,
      subjectLimit: acc?.subject_limit ?? null,
      accessUntil: acc?.access_until ?? null,
      notes: acc?.notes ?? null,
      subjects: (s.learning_goals ?? []).filter((g: any) => g.status === 'active').map((g: any) => g.subjects?.name).filter(Boolean),
      mustCompleteProfile: !!s.must_complete_profile,
    };
  });

  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Students and plans</h1>
          <p style={{ color: 'var(--slate)' }}>
            Signed in as {user!.email}. <a href="/admin/payments">Payments</a> · <a href="/admin/teachers">Teachers</a> · <a href="/admin/reviews">Question reviews</a> · <a href="/admin/feedback">Feedback</a>
          </p>
        </div>
        <AdminStudents students={rows} />
      </div>
    </main>
  );
}
