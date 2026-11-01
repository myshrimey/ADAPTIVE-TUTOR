import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { APP_VERSION, DB_VERSION_EXPECTED, MANUAL_CHECKS, envReport, latestChangelogVersion, runProbes, writeAudit } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
const WORD = { applied: 'Applied', not_applied: 'NOT applied: run npm run db:migrate', unknown: 'Could not check' } as const;
const COLOUR = { applied: '#1b6b3a', not_applied: '#b3261e', unknown: '#8a5a00' } as const;

// Super Admin only. READ ONLY: asks whether tables exist, reports settings as present or missing (never their values).
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const service = createServiceClient();
  const [probes, latest] = await Promise.all([runProbes(service), latestChangelogVersion(service)]);
  const env = envReport(process.env);
  await writeAudit(service, { actorEmail: g.email, actorRole: 'super_admin', action: 'deploy_check.view', entity: 'deploy_check', outcome: 'success' });
  const missing = probes.filter((p) => p.result === 'not_applied').length;
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Deployment check</h1>
        <p style={{ color: 'var(--slate)' }}>Open this after you deploy. It only reads: it never changes the database and never shows a secret value.</p>
        <AdminNav />
      </div>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Version</h2>
      <p>This website is running <strong>{APP_VERSION}</strong>. Newest database change recorded in the database: <strong>{latest ?? 'not available'}</strong>. This website expects the database to be at least at <strong>{DB_VERSION_EXPECTED}</strong> (later versions changed no table).</p>
      {latest && parseInt(latest.slice(1)) < parseInt(DB_VERSION_EXPECTED.slice(1)) ? <p className="alert">The database is behind this website. Run <code>npm run db:migrate</code>.</p> : null}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Database changes seen from the website</h2>
      <p>{missing ? <span style={{ color: COLOUR.not_applied }}><strong>{missing} change(s) are missing.</strong></span> : <span style={{ color: COLOUR.applied }}>Every change this page can see is applied.</span>}</p>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem' }}><thead><tr style={{ textAlign: 'left' }}>{['Migration', 'From', 'What', 'Result'].map((h) => <th key={h} style={{ paddingRight: 12 }}>{h}</th>)}</tr></thead>
        <tbody>{probes.map((p) => <tr key={p.migration}><td style={{ paddingRight: 12 }}>{p.migration}</td><td style={{ paddingRight: 12 }}>{p.version}</td><td style={{ paddingRight: 12 }}>{p.what}</td><td style={{ color: COLOUR[p.result] }}>{WORD[p.result]}</td></tr>)}</tbody></table>
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 20 }}>Settings on the server (present or missing only)</h2>
      <ul>{env.map((e) => <li key={e.name}><code>{e.name}</code>: <strong style={{ color: e.present ? COLOUR.applied : e.required ? COLOUR.not_applied : COLOUR.unknown }}>{e.present ? 'present' : e.required ? 'MISSING' : 'not set (optional)'}</strong> <span style={{ color: 'var(--slate)', fontSize: '0.84rem' }}>{e.why}</span></li>)}</ul>
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 20 }}>Three things the website cannot see</h2>
      <p style={{ color: 'var(--slate)' }}>Paste each line into the Supabase SQL editor. They only read.</p>
      {MANUAL_CHECKS.map((c) => <div key={c.what} style={{ margin: '10px 0' }}><strong>{c.migration}: {c.what}</strong><pre style={{ background: '#f3f3f3', padding: 8, overflowX: 'auto' }}>{c.sql}</pre><span style={{ color: 'var(--slate)', fontSize: '0.86rem' }}>Expected: {c.expect}</span></div>)}
      <p style={{ color: 'var(--slate)', fontSize: '0.86rem' }}>Not checked here: the leaked-password protection switch in Supabase Authentication (a setting, not a table).</p>
    </div></main>
  );
}
