'use client';
import { useState } from 'react';

// Two quick tests for the admin: (1) can the server save a visit? (2) does THIS browser send a visit, and if not, why?
export function TrafficCheck() {
  const [out, setOut] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); const lines: string[] = [];
    try {
      const counter = document.documentElement.getAttribute('data-sahayak-counter') === 'on';
      lines.push(counter ? '✓ The page counter is installed on this page.' : '✗ The page counter is NOT installed on this page. The file apps/web/app/layout.tsx was probably not replaced when you copied v64. Copy it again from the v64 zip and redeploy.');
      lines.push(navigator.doNotTrack === '1' ? '! This browser sends "Do Not Track": your own visits are not counted (that is by design).' : '✓ This browser does not send "Do Not Track".');
      const j = await (await fetch('/api/admin/traffic-check', { method: 'POST' })).json();
      if (j.error) lines.push('✗ Server check failed: ' + j.error);
      else {
        const d = j.data;
        lines.push(d.serviceKeyPresent ? '✓ The server has its database key.' : '✗ The server has no SUPABASE_SERVICE_ROLE_KEY.');
        lines.push(d.tableReadable ? `✓ Table page_views can be read (${d.totalRows} rows saved so far${d.newest ? ', newest ' + new Date(d.newest).toLocaleString('en-IN') : ''}).` : '✗ Table page_views cannot be read.');
        lines.push(d.canWrite ? '✓ The server can save a visit (a test row was saved and removed).' : '✗ The server could NOT save a visit.');
        if (d.error) lines.push('Database message: ' + d.error);
      }
      const t = await fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-track-debug': '1' }, body: JSON.stringify({ path: '/traffic-self-test', referrerHost: '', utmSource: '', utmMedium: '', utmCampaign: '' }) });
      if (t.status === 204) lines.push('! The visit route answered without details (are you signed in as admin on this browser?).');
      else { const tj = await t.json(); lines.push(tj.counted ? '✓ A test visit from this browser was counted (it appears as the page /traffic-self-test).' : '✗ A test visit from this browser was NOT counted: ' + tj.reason); }
    } catch (e: any) { lines.push('✗ Check could not finish: ' + (e?.message ?? e)); }
    setOut(lines); setBusy(false);
  }
  return (
    <section className="tip-card" style={{ marginTop: 'var(--space-3)' }}>
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 0 }}>Counter check</h2>
      <p style={{ color: 'var(--slate)', marginTop: 0 }}>If the numbers stay at zero, press this. It tells you in plain words what is stopping visits from being saved.</p>
      <button className="btn btn--accent" onClick={run} disabled={busy}>{busy ? 'Checking…' : 'Check the counter'}</button>
      {out && <ul style={{ marginTop: '0.8rem', paddingLeft: '1.1rem' }}>{out.map((l, i) => <li key={i} style={{ marginBottom: '0.3rem' }}>{l}</li>)}</ul>}
    </section>
  );
}
