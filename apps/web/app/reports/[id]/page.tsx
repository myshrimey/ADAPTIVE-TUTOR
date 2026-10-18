import { notFound, redirect } from 'next/navigation';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { StudentReportView } from '@/components/reports/StudentReportView';

export const dynamic = 'force-dynamic';
export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  let studentId: string;
  try { studentId = await getCurrentStudentId(); } catch (e: any) { redirect(e?.message === 'device_limit' ? '/device-limit' : '/'); }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createServerClient();
  const { data: r } = await supabase.from('test_reports').select('*').eq('id', id).eq('student_id', studentId).eq('audience', 'student').maybeSingle();
  if (!r) notFound();
  return <StudentReportView title={r.title} takenAt={r.taken_at} score={r.score} total={r.total} inMarks={r.in_marks} data={r.data} back="/reports" />;
}
