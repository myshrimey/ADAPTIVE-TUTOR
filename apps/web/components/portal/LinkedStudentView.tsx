import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import { buildParentReport, weeklySummary, errorPatternFor, planText } from '@adaptive-tutor/core';
import { engineCtx } from '@/lib/engagement';
import { ReportExtras } from '@/components/ReportExtras';
import { type PortalUser, isLinked } from '@/lib/portal';
import { UnlinkButton } from './UnlinkButton';
import { ReportList, type ReportRow } from '@/components/reports/ReportList';

// One linked student, seen by an adult. Access = an ACTIVE link row, checked here on the server every time.
export async function LinkedStudentView({ me, studentId }: { me: PortalUser; studentId: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(studentId) || !(await isLinked(me, studentId))) notFound();
  const service = createServiceClient();
  const { data: st } = await service.from('students').select('display_name').eq('id', studentId).maybeSingle();
  if (!st) notFound();
  let report = null;
  try { report = await buildParentReport(service, studentId); } catch { report = null; }
  // Saved ADULT reports for this student: read with the service key only after the link check above.
  const { data: reports } = await service.from('test_reports').select('id, title, kind, taken_at, score, total, in_marks').eq('student_id', studentId).eq('audience', 'adult').order('taken_at', { ascending: false }).limit(100);
  let weekly: { sentence: string; facts: string[] } | null = null;
  try { const ctx = await engineCtx(service); weekly = await weeklySummary(service, studentId, st.display_name, ctx.idx); } catch { weekly = null; }
  let pattern: Awaited<ReturnType<typeof errorPatternFor>> = null;
  try { pattern = await errorPatternFor(service, studentId); } catch { pattern = null; }
  const home = `/${me.role}`;
  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <p><a href={home}>← Back to your dashboard</a></p>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{st.display_name}</h1>
          <p style={{ color: 'var(--slate)' }}>Read-only view. Only counts and dates from the student&apos;s own practice. Never a prediction of marks or rank.</p>
        </div>
        {weekly && <section className="tip-card" style={{ marginTop: 'var(--space-3)' }}><span className="tip-card__eyebrow">This week</span><p className="tip-card__body">{weekly.sentence}</p>{weekly.facts.length > 0 && <ul style={{ margin: 0 }}>{weekly.facts.map((f) => <li key={f}>{f}</li>)}</ul>}<p style={{ color: 'var(--slate)', fontSize: '0.8rem', margin: '0.4rem 0 0' }}>A weekly summary of counts, not every action. It is never a prediction of marks.</p></section>}
        {pattern && (
          <section className="tip-card" style={{ marginTop: 'var(--space-3)' }}>
            <span className="tip-card__eyebrow">What may help</span>
            <p className="tip-card__body"><strong>{pattern.recipe.title}.</strong> {pattern.recipe.likelyCause} This is a pattern seen in recent mistakes ({pattern.count} times), not a judgement of {st.display_name}.</p>
            <p className="tip-card__body">{me.role === 'parent' ? <><strong>At home:</strong> {pattern.recipe.parentTip}</> : <><strong>Suggested plan:</strong> {planText(pattern.recipe)} <em>{pattern.recipe.tutorTip}</em></>}</p>
          </section>
        )}
        <p style={{ marginTop: 'var(--space-3)' }}><a className="btn btn--ghost" href={`${home}/student/${studentId}/baseline`}>Starting point, gaps and learning path</a></p>
        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>Saved test reports</h2>
        <ReportList rows={(reports ?? []) as ReportRow[]} hrefBase={`${home}/student/${studentId}/report`} empty="No tests finished yet. Each diagnostic, quiz and mock the student finishes will be saved here with its date and time." />
        {report ? <ReportExtras report={report} /> : <p style={{ color: 'var(--slate)' }}>No practice recorded yet.</p>}
        <div style={{ marginTop: 'var(--space-4)' }}><UnlinkButton studentId={studentId} home={home} /></div>
      </div>
    </main>
  );
}
