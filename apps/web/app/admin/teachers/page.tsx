import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { AdminTeachers, type AdminTeacherRow } from '@/components/AdminTeachers';

export default async function AdminTeachersPage() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;

  const service = createServiceClient();
  const [{ data: profiles }, { data: reviews }] = await Promise.all([
    service.from('teacher_profiles').select('user_id, display_name, qualification, school, subjects, status, created_at, users(email)').order('created_at', { ascending: false }),
    service.from('content_reviews').select('teacher_user_id, created_at').limit(20000),
  ]);
  const since = Date.now() - 30 * 24 * 3600 * 1000;
  const total = new Map<string, number>();
  const recent = new Map<string, number>();
  for (const r of (reviews ?? []) as any[]) {
    total.set(r.teacher_user_id, (total.get(r.teacher_user_id) ?? 0) + 1);
    if (Date.parse(r.created_at) >= since) recent.set(r.teacher_user_id, (recent.get(r.teacher_user_id) ?? 0) + 1);
  }
  const rows: AdminTeacherRow[] = ((profiles ?? []) as any[]).map((p) => ({
    userId: p.user_id,
    displayName: p.display_name,
    email: p.users?.email ?? '',
    qualification: p.qualification,
    school: p.school,
    subjects: p.subjects,
    status: p.status,
    reviewsTotal: total.get(p.user_id) ?? 0,
    reviews30: recent.get(p.user_id) ?? 0,
  }));

  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Teachers</h1>
          <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. Review counts show each teacher&apos;s work, which you can use if you decide to pay for it.</p>
          <AdminNav />
        </div>
        <AdminTeachers teachers={rows} />
      </div>
    </main>
  );
}
