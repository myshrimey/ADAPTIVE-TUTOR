import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { createServiceClient } from '@/lib/supabase-server';
import { listAssignments, assignmentChoices } from '@adaptive-tutor/core';
import { AssignmentManager } from '@/components/invite/AssignmentManager';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate('academic'); if ('gate' in g) return g.gate;
  const service = createServiceClient();
  const [rows, ch] = await Promise.all([listAssignments(service), assignmentChoices(service)]);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><AdminNav />
      <h1 style={{ fontSize: 'var(--step-2)' }}>Teacher and student assignments</h1>
      <p style={{ color: 'var(--slate)', maxWidth: '62ch' }}>This is a record of who teaches whom. It does <strong>not</strong> let the teacher see the student&apos;s learning: that is still shared only by the student&apos;s own one-time code.</p>
      <AssignmentManager teachers={ch.teachers} students={ch.students} rows={rows} />
    </div></main>
  );
}
