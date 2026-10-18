import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import { type PortalUser, isLinked } from '@/lib/portal';
import { AdultReportView } from '@/components/reports/AdultReportView';

export async function LinkedReportView({ me, studentId, reportId }: { me: PortalUser; studentId: string; reportId: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(studentId) || !/^[0-9a-f-]{36}$/i.test(reportId) || !(await isLinked(me, studentId))) notFound();
  const service = createServiceClient();
  const [{ data: r }, { data: st }] = await Promise.all([
    service.from('test_reports').select('*').eq('id', reportId).eq('student_id', studentId).eq('audience', 'adult').maybeSingle(),
    service.from('students').select('display_name').eq('id', studentId).maybeSingle(),
  ]);
  if (!r || !st) notFound();
  return <AdultReportView studentName={st.display_name} title={r.title} takenAt={r.taken_at} score={r.score} total={r.total} inMarks={r.in_marks} data={r.data} back={`/${me.role}/student/${studentId}`} />;
}
