import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { sampleForReview, translationCounts, HINDI_MEDIUM_EXCLUDED_SUBJECTS } from '@adaptive-tutor/core';
import { TranslationReview } from '@/components/TranslationReview';

export const dynamic = 'force-dynamic';
// ADMIN ONLY. A person (teacher or the founder with a Hindi reader) checks a sample of the AI's Hindi questions side by side with the English.
export default async function Page({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const sp = await searchParams; const s = createServiceClient();
  const { data: subs } = await s.from('subjects').select('id, name, slug').order('name');
  const subjects = ((subs ?? []) as any[]).filter((x) => !HINDI_MEDIUM_EXCLUDED_SUBJECTS.includes(x.slug));
  const current = subjects.find((x) => x.id === sp.subject);
  const [counts, items] = current ? await Promise.all([translationCounts(s, current.id), sampleForReview(s, current.id, 10)]) : [null, []];
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Check Hindi translations</h1>
        <AdminNav />
        <p style={{ color: 'var(--slate)' }}>Automatic checks catch lost numbers, signs and options. Only a person can say whether the Hindi is correct and natural. Until a version is checked, students are told it is an AI translation. A rejected version is never shown.</p>
        <p>{subjects.map((x) => <a key={x.id} href={`/admin/translations/review?subject=${x.id}`} style={{ marginRight: '0.8rem', fontWeight: x.id === sp.subject ? 700 : 400 }}>{x.name}</a>)}</p>
        {counts && <p>Hindi versions: <strong>{counts.translated}</strong> of {counts.total} questions · checked by a person <strong>{counts.teacherChecked}</strong> · AI, passed automatic checks <strong>{counts.aiValidated}</strong> · AI, not yet auto-checked <strong>{counts.aiNotValidated}</strong> · failed automatic checks <strong>{counts.failedChecks}</strong> · rejected <strong>{counts.rejected}</strong></p>}
        {current && <TranslationReview items={items} subjectId={current.id} />}
      </div>
    </div></main>
  );
}
