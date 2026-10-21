import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { AdminTranslations, type TranslationRow } from '@/components/AdminTranslations';
import { HINDI_MEDIUM_EXCLUDED_SUBJECTS } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
export default async function AdminTranslationsPage() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const service = createServiceClient();
  const [{ data: subjects }, { data: done }] = await Promise.all([
    service.from('subjects').select('id, name, slug').order('name'),
    service.from('question_translations').select('question_id').eq('lang', 'hi').limit(50000),
  ]);
  const have = new Set((done ?? []).map((r: any) => r.question_id));
  const rows: TranslationRow[] = [];
  for (const s of (subjects ?? []) as any[]) {
    if (HINDI_MEDIUM_EXCLUDED_SUBJECTS.includes(s.slug)) continue;
    const { data: qs } = await service.from('diagnostic_questions').select('id, diagnostic_tests!inner(subject_id, is_active)').eq('diagnostic_tests.subject_id', s.id).eq('diagnostic_tests.is_active', true).neq('content_status', 'rejected').limit(5000);
    const ids = (qs ?? []).map((q: any) => q.id as string);
    if (ids.length) rows.push({ subjectId: s.id, name: s.name, total: ids.length, translated: ids.filter((i) => have.has(i)).length });
  }
  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Hindi questions</h1>
          <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. Hindi-medium mock papers use these translations. A paper started before a question has Hindi shows that question in English (and says so). Translating ahead means students do not wait. The translations are written by AI and rejected by code if a number goes missing, but they are NOT yet checked by a teacher.</p>
          <AdminNav />
        </div>
        <AdminTranslations rows={rows} />
      </div>
    </main>
  );
}
