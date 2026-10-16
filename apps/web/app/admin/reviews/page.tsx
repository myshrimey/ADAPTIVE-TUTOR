import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { AdminReviewActions } from '@/components/AdminReviewActions';

// Teacher feedback on questions, grouped per question. A teacher's verdict is feedback only:
// the founder decides here whether the question becomes verified, rejected, or stays in review.
export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const { filter = 'objections' } = await searchParams;

  const service = createServiceClient();
  const { data: reviews } = await service
    .from('content_reviews')
    .select('teacher_user_id, item_table, item_id, verdict, comment, suggested_answer, suggested_explanation, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1500);

  const teacherIds = [...new Set((reviews ?? []).map((r: any) => r.teacher_user_id))];
  const { data: tps } = teacherIds.length ? await service.from('teacher_profiles').select('user_id, display_name').in('user_id', teacherIds) : { data: [] as any[] };
  const teacherName = new Map((tps ?? []).map((t: any) => [t.user_id, t.display_name]));

  const groups = new Map<string, { table: string; id: string; items: any[] }>();
  for (const r of (reviews ?? []) as any[]) {
    const key = `${r.item_table}:${r.item_id}`;
    if (!groups.has(key)) groups.set(key, { table: r.item_table, id: r.item_id, items: [] });
    groups.get(key)!.items.push(r);
  }
  let list = [...groups.values()];
  const hasObjection = (g2: { items: any[] }) => g2.items.some((i) => i.verdict !== 'approve');
  if (filter === 'objections') list = list.filter(hasObjection);
  else if (filter === 'approved') list = list.filter((g2) => !hasObjection(g2));
  list = list.slice(0, 60);

  const fetchItems = async (table: 'questions' | 'diagnostic_questions') => {
    const ids = list.filter((x) => x.table === table).map((x) => x.id);
    if (!ids.length) return new Map<string, any>();
    const { data } = await service.from(table).select('id, prompt, options, expected_answer, explanation, difficulty, source, content_status').in('id', ids);
    return new Map((data ?? []).map((d: any) => [d.id, d]));
  };
  const [qMap, dMap] = await Promise.all([fetchItems('questions'), fetchItems('diagnostic_questions')]);

  const tab = (f: string, label: string) => (
    <a href={`/admin/reviews?filter=${f}`} style={{ fontWeight: filter === f ? 700 : 400, marginRight: '1rem' }}>{label}</a>
  );

  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Question reviews</h1>
          <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. Teachers give feedback; you decide.</p>
          <AdminNav />
          <p>{tab('objections', 'Has a problem flagged')} {tab('approved', 'Approved by teachers, no problems')} {tab('all', 'All')}</p>
        </div>
        {list.length === 0 && <p style={{ color: 'var(--slate)' }}>Nothing here yet.</p>}
        {list.map((grp) => {
          const item: any = (grp.table === 'questions' ? qMap : dMap).get(grp.id);
          if (!item) return null;
          const ans = typeof item.expected_answer === 'object' && item.expected_answer && 'value' in item.expected_answer ? item.expected_answer.value : item.expected_answer;
          return (
            <article key={`${grp.table}:${grp.id}`} className="chapter-row" style={{ display: 'block', marginTop: '0.8rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>
                {grp.table === 'questions' ? 'practice question' : 'diagnostic/quiz question'} · difficulty {item.difficulty} · {item.source}
              </div>
              <p><strong>{item.prompt}</strong></p>
              {item.options && <p style={{ margin: 0 }}>Options: {(item.options as string[]).join(' | ')}</p>}
              <p style={{ margin: '0.2rem 0' }}>Answer key: <strong>{String(ans)}</strong></p>
              {item.explanation && <p style={{ margin: '0.2rem 0', color: 'var(--slate)' }}>Explanation: {item.explanation}</p>}
              <ul style={{ paddingLeft: '1.1rem', margin: '0.4rem 0' }}>
                {grp.items.map((r) => (
                  <li key={r.teacher_user_id}>
                    <strong>{teacherName.get(r.teacher_user_id) ?? 'Teacher'}</strong>: {r.verdict === 'approve' ? 'looks correct' : r.verdict === 'needs_fix' ? 'needs a fix' : 'reject'}
                    {r.comment ? ` — ${r.comment}` : ''}
                    {r.suggested_answer ? ` (suggested answer: ${r.suggested_answer})` : ''}
                    {r.suggested_explanation ? ` (suggested explanation: ${r.suggested_explanation})` : ''}
                  </li>
                ))}
              </ul>
              <AdminReviewActions table={grp.table} itemId={grp.id} status={item.content_status} />
            </article>
          );
        })}
      </div>
    </main>
  );
}
