import { redirect } from 'next/navigation';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { ReportList, type ReportRow } from '@/components/reports/ReportList';

export const dynamic = 'force-dynamic';
// The student's own saved test reports (newest first). Read through the signed-in session: the database only ever
// returns this student's own 'student' reports; the adult versions are not readable from here at all.
export default async function ReportsPage() {
  let studentId: string;
  try { studentId = await getCurrentStudentId(); } catch (e: any) { redirect(e?.message === 'device_limit' ? '/device-limit' : '/'); }
  const supabase = await createServerClient();
  const { data } = await supabase.from('test_reports').select('id, title, kind, taken_at, score, total, in_marks').eq('student_id', studentId).eq('audience', 'student').order('taken_at', { ascending: false }).limit(200);
  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>My test reports</h1>
        <p style={{ color: 'var(--slate)' }}>Every diagnostic, quick quiz and mock you finish is saved here with its date and time, so you can read it again.</p>
        <ReportList rows={(data ?? []) as ReportRow[]} hrefBase="/reports" empty="No test reports yet. Finish a diagnostic, quiz or mock and it will appear here." />
      </div>
    </main>
  );
}
