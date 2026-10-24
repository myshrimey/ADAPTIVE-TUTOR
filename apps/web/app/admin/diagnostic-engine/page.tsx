import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadEngineSettings } from '@adaptive-tutor/core';
import { AdminDiagnosticEngine } from '@/components/AdminDiagnosticEngine';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const service = createServiceClient();
  const settings = await loadEngineSettings(service);
  const { data: sessions } = await service.from('baseline_sessions').select('status, kind, questions_answered, started_at, finished_at, ai_calls').limit(5000);
  const rows = (sessions ?? []) as any[];
  const done = rows.filter((r) => r.status === 'completed');
  const avgQ = done.length ? Math.round(done.reduce((s, r) => s + (r.questions_answered ?? 0), 0) / done.length * 10) / 10 : null;
  const mins = done.filter((r) => r.finished_at).map((r) => (Date.parse(r.finished_at) - Date.parse(r.started_at)) / 60000).filter((m) => m > 0 && m < 240);
  const avgMin = mins.length ? Math.round(mins.reduce((s, m) => s + m, 0) / mins.length) : null;
  const { data: bs } = await service.from('student_baselines').select('gaps').limit(3000);
  const gapCount = new Map<string, number>();
  for (const b of (bs ?? []) as any[]) for (const id of new Set(((b.gaps ?? []) as any[]).map((x) => x.rootName))) gapCount.set(id, (gapCount.get(id) ?? 0) + 1);
  const common = [...gapCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const { count: dec } = await service.from('adaptive_decisions').select('id', { count: 'exact', head: true });
  const enough = (n: number) => (done.length >= 5 ? String(n) : 'Insufficient data');
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Adaptive diagnostic engine</h1>
        <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. The check has no fixed length: it keeps asking while it still needs evidence and stops when enough target topics are settled. These numbers are only limits. The engine chooses each next question by rules, and writes down why.</p>
        <AdminNav />
      </div>
      <AdminDiagnosticEngine initial={settings} />
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>What has happened so far (counts from real checks)</h2>
      <ul>
        <li>Checks started: {rows.length}; finished: {done.length}; completion: {rows.length >= 5 ? Math.round((done.length / rows.length) * 100) + '%' : 'Insufficient data'}</li>
        <li>Average questions in a finished check: {avgQ !== null && done.length >= 5 ? avgQ : 'Insufficient data'}</li>
        <li>Average time to finish: {avgMin !== null && done.length >= 5 ? avgMin + ' minutes (includes breaks)' : 'Insufficient data'}</li>
        <li>Decisions recorded with a reason: {dec ?? 0}</li>
        <li>AI calls made by the engine: {enough(rows.reduce((s, r) => s + (r.ai_calls ?? 0), 0))}. The engine itself uses no AI: questions come from the bank or are written by code. AI cost per check is therefore zero for the engine; question writing is counted in AI economics.</li>
      </ul>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Most common starting gaps</h2>
      {common.length === 0 || done.length < 5 ? <p style={{ color: 'var(--slate)' }}>Insufficient data (needs at least 5 finished checks).</p> : <ol>{common.map(([n, c]) => <li key={n}>{n}: {c} students</li>)}</ol>}
    </div></main>
  );
}
