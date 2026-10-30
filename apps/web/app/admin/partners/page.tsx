import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { AdminPartners, type PartnerRow } from '@/components/AdminPartners';

export const dynamic = 'force-dynamic';
export default async function AdminPartnersPage() {
  const g = await adminPageGate('users');
  if ('gate' in g) return g.gate;
  const service = createServiceClient();
  const [{ data: profiles }, { data: links }, { data: plans }] = await Promise.all([
    service.from('adult_profiles').select('user_id, role, display_name, city, qualification, subjects, status, created_at, users(email, contact_email)').order('created_at', { ascending: false }).limit(500),
    service.from('student_links').select('adult_user_id').eq('status', 'active').limit(20000),
    service.from('org_plans').select('user_id, student_limit, access_until, status'),
  ]);
  const planBy = new Map(((plans ?? []) as any[]).map((x) => [x.user_id, `${x.status}, up to ${x.student_limit} students, until ${x.access_until ?? 'no end'}`]));
  const n = new Map<string, number>();
  for (const l of (links ?? []) as any[]) n.set(l.adult_user_id, (n.get(l.adult_user_id) ?? 0) + 1);
  const rows: PartnerRow[] = ((profiles ?? []) as any[]).map((p) => ({
    userId: p.user_id, role: p.role, displayName: p.display_name, email: p.users?.contact_email || '(username only)', city: p.city,
    details: [p.qualification, p.subjects].filter(Boolean).join(' · '), status: p.status, students: n.get(p.user_id) ?? 0, plan: planBy.get(p.user_id),
    created: new Date(p.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
  }));
  // Pending first
  rows.sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'));
  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Parents, tutors and coaching centres</h1>
          <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. Tutors and centres must be approved before they can follow any student; they still need a code from the student&apos;s family. Check who they are before you approve.</p>
          <AdminNav />
        </div>
        <AdminPartners rows={rows} />
      </div>
    </main>
  );
}
