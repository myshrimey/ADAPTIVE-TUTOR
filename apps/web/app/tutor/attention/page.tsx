import { requirePortalPage } from '@/lib/portal';
import { createServiceClient } from '@/lib/supabase-server';
import { attentionBoard, listBatches, measureInterventions } from '@adaptive-tutor/core';
import { AttentionBoard } from '@/components/portal/AttentionBoard';

export const dynamic = 'force-dynamic';

// tutor area: who needs attention, batches and intervention tracking. Only students linked to this account (by their own code) appear.
// Advisory: a person decides. Numbers are what was practised, never a prediction of marks or a rank.
export default async function Page() {
  const me = await requirePortalPage('tutor');
  if (me.status !== 'active') return <main className="page"><div className="shell"><p className="alert">Your account is waiting for approval.</p></div></main>;
  const service = createServiceClient();
  const [board, batches, interventions] = await Promise.all([attentionBoard(service, me.userId), listBatches(service, me.userId), measureInterventions(service, me.userId)]);
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <p><a href="/tutor">← Back to your area</a></p>
        <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>Who needs my attention</h1>
        <p style={{ color: 'var(--slate)' }}>Suggestions come from fixed rules over what each student practised. They are advice for you, not a judgement of any child; you stay in charge.</p>
      </div>
      <AttentionBoard attention={board.attention} summary={board.summary} batches={batches} interventions={interventions} students={board.signals.map((s) => ({ id: s.studentId, name: s.name }))} />
    </div></main>
  );
}
