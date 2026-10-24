import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadStretchSettings, STRETCH_STYLES, STYLE_LABEL } from '@adaptive-tutor/core';
import { AdminChallengeTier } from '@/components/AdminChallengeTier';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const service = createServiceClient();
  const settings = await loadStretchSettings(service);
  const { data: subs } = await service.from('subjects').select('id, name').order('name');
  const subjects = ((subs ?? []) as any[]).map((s) => ({ id: s.id, name: s.name }));
  const { data: qs } = await service.from('questions').select('content_status, exam_style, stretch_level, origin, contributed_role, skills(topics(chapters(subject_id)))').eq('tier', 'stretch').limit(20000);
  const rows = (qs ?? []) as any[];
  const bySubject = new Map<string, { total: number; verified: number }>();
  for (const r of rows) { const id = r.skills?.topics?.chapters?.subject_id ?? 'unknown'; const c = bySubject.get(id) ?? { total: 0, verified: 0 }; c.total++; if (r.content_status === 'verified') c.verified++; bySubject.set(id, c); }
  const { data: at } = await service.from('stretch_attempts').select('student_id, correct').limit(50000);
  const att = (at ?? []) as any[];
  const students = new Set(att.map((a) => a.student_id)).size;
  const enough = att.length >= 5;
  const nameOf = (id: string) => subjects.find((s) => s.id === id)?.name ?? 'Unknown';
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-1)' }}>Challenge zone (olympiad and competitive-exam style)</h1>
        <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. Strong students unlock harder questions topic by topic. Answers here never change marks, mastery or readiness, and badges give no XP, money or discount. Questions are original and written in the style of the named exams, never copies of real papers. Review them at <a href="/admin/question-register">the question register</a>.</p>
        <AdminNav />
      </div>
      <AdminChallengeTier initial={settings} subjects={subjects} styles={STRETCH_STYLES.map((s) => ({ id: s, label: STYLE_LABEL[s] }))} />
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Challenge questions in the bank</h2>
      {bySubject.size === 0 ? <p style={{ color: 'var(--slate)' }}>None yet. Use &quot;Write questions&quot; above, or let teachers upload them.</p> :
        <ul>{[...bySubject.entries()].map(([id, c]) => <li key={id}>{nameOf(id)}: {c.total} questions, {c.verified} checked by a teacher</li>)}</ul>}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Use so far (counts)</h2>
      <ul>
        <li>Answers given: {att.length}; students who tried: {enough ? students : 'Insufficient data'}</li>
        <li>Share answered correctly: {enough ? Math.round((att.filter((a) => a.correct).length / att.length) * 100) + '%' : 'Insufficient data'} (a low share is expected; these questions are meant to be hard)</li>
      </ul>
    </div></main>
  );
}
