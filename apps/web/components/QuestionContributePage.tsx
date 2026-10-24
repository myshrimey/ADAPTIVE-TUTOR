import { getContributor } from '@/lib/contributor';
import { createServiceClient } from '@/lib/supabase-server';
import { QuestionContribute } from '@/components/QuestionContribute';

// Shared page body for /teacher/questions, /tutor/questions and /centre/questions.
export async function QuestionContributePage({ back }: { back: string }) {
  const who = await getContributor();
  if (!who || who.role === 'admin') return <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><p className="alert">This page is for approved teachers, active tutors and coaching centres. <a href="/">Home</a></p></div></main>;
  const service = createServiceClient();
  const { data: mine } = await service.from('questions').select('id, prompt, content_status, created_at').eq('contributed_by', who.userId!).order('created_at', { ascending: false }).limit(20);
  const { data: reqs } = await service.from('question_requests').select('id, topic_text, wanted_count, fulfilled_count, status, created_at').eq('requested_by', who.userId!).order('created_at', { ascending: false }).limit(10);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <p><a href={back}>← Back</a></p>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Questions: add and ask</h1>
      <p style={{ color: 'var(--slate)' }}>Signed in as {who.name}. Every question you add is saved with your name, checked by the founder before students see it, and kept in the Sahayak question bank.</p>
      <QuestionContribute />
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Your recent questions</h2>
      {(mine ?? []).length === 0 ? <p style={{ color: 'var(--slate)' }}>None yet.</p> : <ul>{(mine ?? []).map((q: any) => <li key={q.id}>{String(q.prompt).slice(0, 90)} <span style={{ color: 'var(--slate)' }}>({q.content_status === 'verified' ? 'approved' : q.content_status === 'rejected' ? 'not accepted' : 'waiting for review'})</span></li>)}</ul>}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Your requests</h2>
      {(reqs ?? []).length === 0 ? <p style={{ color: 'var(--slate)' }}>None yet.</p> : <ul>{(reqs ?? []).map((r: any) => <li key={r.id}>{r.topic_text || 'Selected skill/subject'}: {r.fulfilled_count} of {r.wanted_count} ({r.status.replace('_', ' ')})</li>)}</ul>}
    </div></main>
  );
}
