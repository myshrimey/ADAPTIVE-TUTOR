import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadDirectory, cleanFilter, auditDirectoryView, countBy, ACCOUNT_KINDS, KIND_LABEL } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : 'Never recorded');

// Super Admin only (decision D6 about who else may see accounts is still open). READ ONLY: nothing on this page can change an account.
export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const f = cleanFilter((await searchParams) ?? {});
  const service = createServiceClient();
  const dir = await loadDirectory(service, f);
  await auditDirectoryView(service, g.email, f, dir.shown);
  const byKind = countBy(dir.rows, (r) => r.kind);
  const box = { padding: '4px 8px', marginRight: 8, marginBottom: 6 } as const;
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Account directory</h1>
        <p style={{ color: 'var(--slate)' }}>Read only. Emails are masked and only initials are shown. Opening this page and opening an account are recorded in the Audit log. Nothing here can change an account, and nothing here signs you in as someone else. Signed in as {g.email}.</p>
        <AdminNav />
        <form method="get" style={{ margin: '12px 0' }}>
          <input name="q" defaultValue={f.q} placeholder="Search id or email" style={box} aria-label="Search" />
          <select name="kind" defaultValue={f.kind} style={box} aria-label="Type"><option value="">Any type</option>{ACCOUNT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
          <input name="plan" defaultValue={f.plan} placeholder="Plan code" style={box} aria-label="Plan" />
          <select name="status" defaultValue={f.status} style={box} aria-label="Status"><option value="">Any status</option>{['active', 'expired', 'no_access', 'pending', 'approved', 'suspended'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
          <label style={box}>Registered from <input type="date" name="from" defaultValue={f.from} /></label>
          <label style={box}>to <input type="date" name="to" defaultValue={f.to} /></label>
          <select name="activity" defaultValue={f.activity} style={box} aria-label="Learning activity"><option value="">Any activity</option><option value="7d">Active in last 7 days</option><option value="30d">Active in last 30 days</option><option value="stale">Quiet for over 30 days</option><option value="never">No learning recorded</option></select>
          <button type="submit" style={box}>Filter</button> <a href="/admin/accounts">Clear</a>
        </form>
        <p>{dir.shown} shown of {dir.total} accounts{dir.truncated ? ' (list is capped; narrow the filters)' : ''}. {Object.entries(byKind).map(([k, n]) => `${KIND_LABEL[k as keyof typeof KIND_LABEL] ?? k}: ${n}`).join(' · ')}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>&quot;Last learning activity&quot; comes from the learning events table only (students). Teachers, parents, tutors and centres show &quot;Never recorded&quot; because sign-in and page activity are not recorded yet.</p>
      </div>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem' }}>
        <thead><tr style={{ textAlign: 'left' }}>{['Account', 'Type', 'Initials', 'Email (masked)', 'Plan', 'Status', 'Registered', 'Last learning activity', 'First source'].map((h) => <th key={h} style={{ paddingRight: 12 }}>{h}</th>)}</tr></thead>
        <tbody>{dir.rows.map((r) => <tr key={r.id} style={{ verticalAlign: 'top' }}>
          <td style={{ paddingRight: 12 }}><a href={`/admin/accounts/${r.id}`}>{r.shortId}</a></td><td style={{ paddingRight: 12 }}>{KIND_LABEL[r.kind]}</td><td style={{ paddingRight: 12 }}>{r.initials}</td><td style={{ paddingRight: 12 }}>{r.maskedEmail}</td><td style={{ paddingRight: 12 }}>{r.plan ?? ''}</td><td style={{ paddingRight: 12 }}>{r.status.replace('_', ' ')}</td><td style={{ paddingRight: 12 }}>{day(r.registered)}</td><td style={{ paddingRight: 12 }}>{day(r.lastActivity)}</td><td>{r.source ?? ''}</td></tr>)}
          {!dir.rows.length && <tr><td colSpan={9}>No accounts match.</td></tr>}</tbody>
      </table>
    </div></main>
  );
}
