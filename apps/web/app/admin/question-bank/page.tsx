import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { AdminQuestionBank, type BankRow } from '@/components/AdminQuestionBank';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const service = createServiceClient();
  const [{ data: subjects }, { data: growth }] = await Promise.all([
    service.from('subjects').select('id, name').order('name'),
    service.from('question_bank_growth').select('*'),
  ]);
  const gm = new Map((growth ?? []).map((x: any) => [x.subject_id, x]));
  const rows: BankRow[] = [];
  for (const s of (subjects ?? []) as any[]) {
    const cnt = async (table: string, extra?: (q: any) => any) => {
      const sel = table === 'questions' ? 'id, skills!inner(topics!inner(chapters!inner(subject_id)))' : 'id, skills!inner(topics!inner(chapters!inner(subject_id)))';
      let q = service.from(table).select(sel, { count: 'exact', head: true }).eq('skills.topics.chapters.subject_id', s.id).neq('content_status', 'rejected');
      if (extra) q = extra(q);
      const { count } = await q;
      return count ?? 0;
    };
    const [practice, diagnostic, rp, rd] = await Promise.all([
      cnt('questions'), cnt('diagnostic_questions'),
      cnt('questions', (q) => q.eq('source', 'generated').eq('content_status', 'needs_review')),
      cnt('diagnostic_questions', (q) => q.eq('source', 'generated').eq('content_status', 'needs_review')),
    ]);
    const x: any = gm.get(s.id);
    rows.push({ subjectId: s.id, name: s.name, practice, diagnostic, needsReview: rp + rd, owed: x?.pending ?? 0, produced: x?.produced_total ?? 0, rejected: x?.rejected_total ?? 0, lastRun: x?.last_run_at ?? null });
  }
  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Question bank growth</h1>
          <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. Every time a student starts a learning session or diagnostic, that subject is owed 50 more questions (about 20 diagnostic, 30 practice) and they are written in the background. Each new question is written by the AI and then solved again independently; only questions where both agree are saved. They are marked &quot;needs review&quot; until a teacher checks them. On the free AI tier one run may not finish all 50 &mdash; what is left stays &quot;owed&quot; and carries on at the next start, or press the button below.</p>
          <AdminNav />
        </div>
        <AdminQuestionBank rows={rows} />
      </div>
    </main>
  );
}
