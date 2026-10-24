import { createServiceClient } from '@/lib/supabase-server';
import { aggregateGaps } from '@adaptive-tutor/core';
import { type PortalUser, linkedStudentIds } from '@/lib/portal';

// Tutor / centre: which prerequisite gaps are common across the students linked to this account. Shown only for 3+ students
// per subject, as shares and counts with no names, so one child is never singled out.
export async function GroupBaselineView({ me }: { me: PortalUser }) {
  const ids = await linkedStudentIds(me);
  const service = createServiceClient();
  const bySubject = new Map<string, { name: string; rows: Array<{ gaps: any[] }>; ready: number; total: number }>();
  if (ids.length) {
    const { data } = await service.from('student_baselines').select('student_id, subject_id, version, gaps, subjects(name)').in('student_id', ids).order('version', { ascending: false });
    const latest = new Map<string, any>();
    for (const r of (data ?? []) as any[]) { const k = r.student_id + ':' + r.subject_id; if (!latest.has(k)) latest.set(k, r); }
    for (const r of latest.values()) {
      const e: { name: string; rows: Array<{ gaps: any[] }>; ready: number; total: number } = bySubject.get(r.subject_id) ?? { name: r.subjects?.name ?? 'Subject', rows: [], ready: 0, total: 0 };
      e.rows.push({ gaps: r.gaps ?? [] }); e.total++;
      if (!(r.gaps ?? []).some((g: any) => g.severity === 'CRITICAL' || g.severity === 'HIGH')) e.ready++;
      bySubject.set(r.subject_id, e);
    }
  }
  const label = me.role === 'centre' ? 'students in your centre' : 'your students';
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-4)' }}>
        <p><a href={`/${me.role}`}>← Back to your dashboard</a></p>
        <h1 style={{ fontSize: 'var(--step-3)' }}>Common gaps across {label}</h1>
        <p style={{ color: 'var(--slate)' }}>From each student&apos;s latest adaptive check. Shown only when at least 3 students have one, with no names. When most students share a gap, a group lesson saves time.</p>
      </div>
      {bySubject.size === 0 && <p>No adaptive checks finished yet by linked students.</p>}
      {[...bySubject.values()].map((s) => {
        const agg = aggregateGaps(s.rows, label);
        return (
          <section key={s.name} className="tip-card" style={{ marginTop: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 'var(--step-1)', marginTop: 0 }}>{s.name}</h2>
            <p>{s.total} student{s.total === 1 ? '' : 's'} checked; {s.ready} show no critical or high gap and look ready for target-level work.</p>
            {agg === 'insufficient_data' ? <p style={{ color: 'var(--slate)' }}>Insufficient data: at least 3 students are needed before common gaps are shown.</p>
              : agg.length === 0 ? <p>No gaps recorded.</p>
              : <ul>{agg.slice(0, 10).map((g) => <li key={g.competencyId}>{g.text}</li>)}</ul>}
          </section>);
      })}
    </div></main>
  );
}
