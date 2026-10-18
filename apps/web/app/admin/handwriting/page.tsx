import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadAgreement, ANSWER_BANK_ENABLED, TEACHER_SAMPLE_RATE } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';

const pct = (v: number | null) => (v === null ? '—' : `${v}%`);

export default async function AdminHandwritingPage() {
  const gate = await adminPageGate();
  if ('gate' in gate) return gate.gate;
  const a = await loadAgreement(createServiceClient());
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--step-3)' }}>Handwritten marking: AI vs teacher</h1>
        <AdminNav />
        <p style={{ color: 'var(--slate)' }}>
          Only answers a teacher has also marked are compared. Do not tell families the AI marking is reliable until this table has enough teacher-checked answers (start with about 100 per subject) and the agreement is good. About {Math.round(TEACHER_SAMPLE_RATE * 100)}% of confident AI marks are sent to teachers on purpose so this keeps being measured.
        </p>
        <p>Waiting for a teacher: <strong>{a.queue}</strong> · Could not be read: <strong>{a.unreadable}</strong> · Question/answer bank after deletion: <strong>{ANSWER_BANK_ENABLED ? 'ON' : 'OFF (switch in packages/core/handwriting/config.ts after legal advice)'}</strong></p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}><th>Subject</th><th>Answers compared</th><th>Exact same marks</th><th>Within 1 mark</th><th>Average gap</th><th>AI higher</th><th>AI lower</th></tr></thead>
        <tbody>
          {[{ subject: 'All subjects', stats: a.overall }, ...a.bySubject].map((r) => (
            <tr key={r.subject} style={{ borderBottom: '1px solid var(--line)' }}>
              <td>{r.subject}</td><td>{r.stats.n}</td><td>{pct(r.stats.exactPercent)}</td><td>{pct(r.stats.withinOnePercent)}</td><td>{r.stats.meanAbsDiff ?? '—'}</td><td>{r.stats.aiHigher}</td><td>{r.stats.aiLower}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div></main>
  );
}
