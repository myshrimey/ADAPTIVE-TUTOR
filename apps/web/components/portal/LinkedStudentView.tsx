import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import { buildParentReport } from '@adaptive-tutor/core';
import { ReportExtras } from '@/components/ReportExtras';
import { type PortalUser, isLinked } from '@/lib/portal';
import { UnlinkButton } from './UnlinkButton';

// One linked student, seen by an adult. Access = an ACTIVE link row, checked here on the server every time.
export async function LinkedStudentView({ me, studentId }: { me: PortalUser; studentId: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(studentId) || !(await isLinked(me, studentId))) notFound();
  const service = createServiceClient();
  const { data: st } = await service.from('students').select('display_name').eq('id', studentId).maybeSingle();
  if (!st) notFound();
  let report = null;
  try { report = await buildParentReport(service, studentId); } catch { report = null; }
  const home = `/${me.role}`;
  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <p><a href={home}>← Back to your dashboard</a></p>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{st.display_name}</h1>
          <p style={{ color: 'var(--slate)' }}>Read-only view. Only counts and dates from the student&apos;s own practice. Never a prediction of marks or rank.</p>
        </div>
        {report ? <ReportExtras report={report} /> : <p style={{ color: 'var(--slate)' }}>No practice recorded yet.</p>}
        <div style={{ marginTop: 'var(--space-4)' }}><UnlinkButton studentId={studentId} home={home} /></div>
      </div>
    </main>
  );
}
