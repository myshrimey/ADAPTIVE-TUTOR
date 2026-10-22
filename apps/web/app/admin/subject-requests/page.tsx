import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { tallyRequests } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
// ADMIN ONLY. How many families asked for each subject / board / class. No names or contact details are read here.
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const { data, error } = await createServiceClient().from('subject_requests').select('board, class_level, subject_text, language').order('created_at', { ascending: false }).limit(20000);
  const rows = tallyRequests((data ?? []) as any[]);
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Subject requests</h1>
        <AdminNav />
        {error && <p className="alert">Migration 0033 has not been run yet, so requests cannot be shown.</p>}
        <p style={{ color: 'var(--slate)' }}>{(data ?? []).length} request(s). Counted exactly as typed (case ignored); similar spellings are separate lines.</p>
        {rows.length === 0 ? <p>No requests yet.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}><th>Subject</th><th>Board</th><th>Class</th><th>Requests</th><th>Languages</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}><td>{r.subject}</td><td>{r.board}</td><td>{r.classLevel}</td><td><strong>{r.count}</strong></td><td>{Object.entries(r.languages).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div></main>
  );
}
