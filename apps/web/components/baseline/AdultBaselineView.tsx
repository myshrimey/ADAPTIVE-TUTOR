import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import { loadStoredBaseline, asBaseline, parentReport, tutorReport, PARENT_EXPLANATION } from '@adaptive-tutor/core';
import { type PortalUser, isLinked } from '@/lib/portal';

const STAGE: Record<string, string> = { prerequisite_repair: 'Prerequisite repair', foundation: 'Foundation', core: 'Core', application: 'Application', reasoning: 'Reasoning' };

// One linked student's adaptive baseline, written for the adult who is looking. Access = an ACTIVE link row, checked on the server.
export async function AdultBaselineView({ me, studentId }: { me: PortalUser; studentId: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(studentId) || !(await isLinked(me, studentId))) notFound();
  const service = createServiceClient();
  const { data: st } = await service.from('students').select('display_name').eq('id', studentId).maybeSingle();
  if (!st) notFound();
  const { data: subs } = await service.from('baseline_sessions').select('subject_id, subjects(name)').eq('student_id', studentId).eq('status', 'completed').order('started_at', { ascending: false });
  const seen = new Map<string, string>();
  for (const r of (subs ?? []) as any[]) if (!seen.has(r.subject_id)) seen.set(r.subject_id, r.subjects?.name ?? 'Subject');
  const cards = [] as Array<{ name: string; lines: string[]; path: any[]; gaps: any[]; version: number; at: string; changes: any[] }>;
  for (const [sid, name] of seen) {
    const sb = await loadStoredBaseline(service, studentId, sid);
    if (!sb) continue;
    const b = asBaseline(sb);
    cards.push({ name, lines: me.role === 'parent' ? parentReport(b, name) : tutorReport(b, name), path: sb.path, gaps: sb.gaps, version: sb.version, at: sb.createdAt, changes: sb.changes });
  }
  const home = `/${me.role}`;
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-4)' }}>
        <p><a href={`${home}/student/${studentId}`}>← Back to {st.display_name}</a></p>
        <h1 style={{ fontSize: 'var(--step-3)' }}>{st.display_name}: starting point and gaps</h1>
        <p style={{ color: 'var(--slate)' }}>{PARENT_EXPLANATION}</p>
        <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>Read-only. Based on the questions answered in the adaptive check; it describes demonstrated skills, not the child, and is never a prediction of marks.</p>
      </div>
      {cards.length === 0 && <p>No adaptive check has been finished yet.</p>}
      {cards.map((c) => (
        <section key={c.name} className="tip-card" style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)', marginTop: 0 }}>{c.name} <span style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>(version {c.version}, {new Date(c.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })})</span></h2>
          {c.lines.map((l, i) => <p key={i} style={{ margin: '0.25rem 0' }}>{l}</p>)}
          {me.role !== 'parent' && c.path.length > 0 && <>
            <h3 style={{ fontSize: '1rem' }}>Learning path ({c.path.length} steps)</h3>
            <ol>{c.path.slice(0, 15).map((n) => <li key={n.seq}>{n.name} <span style={{ color: 'var(--slate)' }}>({STAGE[n.stage] ?? n.stage}, Class {n.classLevel}, {n.status})</span></li>)}</ol>
          </>}
          {c.changes.length > 0 && <><h3 style={{ fontSize: '1rem' }}>Changes since the previous check</h3><ul>{c.changes.slice(0, 8).map((x: any, i: number) => <li key={i}>{x.text}</li>)}</ul></>}
        </section>))}
    </div></main>
  );
}
