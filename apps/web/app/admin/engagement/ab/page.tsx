import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadEngagementSettings, loadAbResults, VERDICT_TEXT } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
// ADMIN ONLY. Compares students who have a feature with students who do not (when you set a share below 100 in Engagement settings).
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const s = createServiceClient(); const settings = await loadEngagementSettings(s); const res = await loadAbResults(s, settings);
  return (
    <main className="page"><div className="shell shell--narrow"><div style={{ paddingTop: 'var(--space-3)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Engagement experiments</h1><AdminNav />
      <p style={{ color: 'var(--slate)' }}>To start one, open Engagement settings and give a feature a share of students between 1 and 99. The same students always stay in the same group. These numbers are an <strong>association, not proof</strong>: the groups are not a controlled trial, and small groups are shown as &quot;Insufficient data&quot;. Last 14 days.</p>
      {res.length === 0 && <p>No experiment is running. Nothing to compare.</p>}
      {res.map((r) => (
        <section key={r.feature} className="tip-card" style={{ marginTop: 'var(--space-3)' }}>
          <span className="tip-card__eyebrow">{r.feature.replace(/_/g, ' ')} · {r.pct}% of students have it{r.featureSwitchOn ? '' : ' (switch is OFF: nobody has it)'}</span>
          <p className="tip-card__body">With the feature: {r.nOn} students · Without: {r.nOff} students{r.sampled ? ' · compared on the first 1,500 of each group' : ''}</p>
          <table style={{ width: '100%', fontSize: '0.9rem' }}><thead><tr><th align="left">Measure</th><th align="right">With</th><th align="right">Without</th><th align="right">Gap</th><th align="left">Reading</th></tr></thead><tbody>
            {r.metrics.map((m) => <tr key={m.metric}><td>{m.metric}</td><td align="right">{m.on.mean ?? '—'}</td><td align="right">{m.off.mean ?? '—'}</td><td align="right">{m.diff ?? '—'}</td><td>{VERDICT_TEXT[m.verdict]}</td></tr>)}
          </tbody></table>
          <p style={{ color: 'var(--slate)', fontSize: '0.8rem' }}>{r.note}</p>
        </section>
      ))}
    </div></div></main>
  );
}
