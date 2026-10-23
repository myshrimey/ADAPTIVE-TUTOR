import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadAiRequests, FEATURE_CATALOG } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 4 })}`;

// ADMIN ONLY. Recent AI requests (one line per request; attempts of one request are grouped). No prompt or answer text is stored or shown.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const q = await searchParams;
  const status = q.status === 'ok' || q.status === 'failed' || q.status === 'fallback' ? q.status : undefined;
  const feature = q.feature && /^[a-z_]{2,40}$/.test(q.feature) ? q.feature : undefined;
  const days = Math.min(30, Math.max(1, Number(q.days) || 3));
  const d = await loadAiRequests(createServiceClient(), { status, feature, days, studentId: q.student && /^[0-9a-f-]{36}$/i.test(q.student) ? q.student : undefined });
  const tasks = [...new Set(FEATURE_CATALOG.flatMap((f) => f.tasks))];
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <p style={{ margin: 0, color: 'var(--slate)', letterSpacing: '0.08em', fontSize: '0.8rem' }}>SAHAYAK · ADMIN</p>
        <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>AI requests</h1>
        <AdminNav />
        {!d.migrated && <p className="alert">Migration 0036 has not been run, so requests are not grouped and the routing explanation is not stored. Run <code>npm run db:migrate</code>.</p>}
        <form method="get" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.6rem 0' }}>
          <select className="field__input" name="status" defaultValue={status ?? ''}><option value="">Any result</option><option value="ok">Succeeded</option><option value="failed">Failed</option><option value="fallback">Used a fallback</option></select>
          <select className="field__input" name="feature" defaultValue={feature ?? ''}><option value="">Any feature</option>{tasks.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <select className="field__input" name="days" defaultValue={String(days)}>{[1, 3, 7, 30].map((n) => <option key={n} value={n}>Last {n} day{n > 1 ? 's' : ''}</option>)}</select>
          <button className="btn btn--ghost btn--small" type="submit">Filter</button>
        </form>
        <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>{d.requests.length} request(s) shown (newest first, at most 200). Click a time to see the exact model, why it was chosen, what it consumed and what it cost.</p>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>{['When', 'Feature', 'Result', 'Model', 'Attempts', 'Tokens in / out', 'Images', 'Billed', 'Economic'].map((h) => <th key={h} style={{ padding: '0.25rem 0.4rem' }}>{h}</th>)}</tr></thead>
          <tbody>{d.requests.map((r) => (
            <tr key={r.requestId} style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '0.25rem 0.4rem' }}><a href={`/admin/ai-requests/${encodeURIComponent(r.requestId)}`}>{new Date(r.startedAt).toLocaleString('en-IN')}</a></td>
              <td style={{ padding: '0.25rem 0.4rem' }}>{r.task}</td>
              <td style={{ padding: '0.25rem 0.4rem', color: r.ok ? '#1f9d55' : '#d03a2f', fontWeight: 600 }}>{r.ok ? (r.fallbackUsed ? 'OK (fallback)' : 'OK') : 'FAILED'}</td>
              <td style={{ padding: '0.25rem 0.4rem' }}>{r.finalProvider ? `${r.finalProvider} · ${r.finalModel ?? '—'}` : '—'}</td>
              <td style={{ padding: '0.25rem 0.4rem' }}>{r.attemptCount}</td>
              <td style={{ padding: '0.25rem 0.4rem' }}>{r.inputTokens} / {r.outputTokens}</td>
              <td style={{ padding: '0.25rem 0.4rem' }}>{r.images}</td>
              <td style={{ padding: '0.25rem 0.4rem' }}>{inr(r.billedInr)}</td>
              <td style={{ padding: '0.25rem 0.4rem' }}>{inr(r.economicInr)}</td>
            </tr>))}</tbody></table></div>
        <p><a href="/admin/ai-economics">← AI Economics</a></p>
      </div>
    </div></main>
  );
}
