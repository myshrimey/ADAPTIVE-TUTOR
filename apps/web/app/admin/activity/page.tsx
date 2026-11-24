import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadActivityAnalytics, cleanWindow, WINDOWS, type Section } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';

function Tile({ value, label }: { value: string | number; label: string }) {
  return <div className="stat-tile"><span className="stat-tile__value">{value}</span><span className="stat-tile__label">{label}</span></div>;
}
function Unavailable({ s }: { s: Section<unknown> }) { return <p style={{ color: 'var(--slate)' }}>Not available: {s.reason}</p>; }
// A small bar strip, one bar per day; the numbers are also in the title of each bar.
function Bars({ values, days }: { values: number[]; days: string[] }) {
  const max = Math.max(1, ...values);
  return (
    <div role="img" aria-label={`Daily counts, highest ${max}`} style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56, margin: '6px 0' }}>
      {values.map((v, i) => <div key={days[i]} title={`${days[i]}: ${v}`} style={{ flex: 1, minWidth: 2, height: `${Math.max(v ? 6 : 1, (v / max) * 100)}%`, background: 'var(--saffron, #d97706)', opacity: v ? 1 : 0.25 }} />)}
    </div>
  );
}

// v139: Activity analytics (Super Admin). Counts only. Every panel says when it is unavailable and why. Times are UTC days.
export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const sp = (await searchParams) ?? {};
  const w = cleanWindow(typeof sp.days === 'string' ? sp.days : undefined);
  const r = await loadActivityAnalytics(createServiceClient(), w);
  const pc = (v: number | null) => (v === null ? 'n/a' : `${v}%`);
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Activity analytics</h1>
        <p style={{ color: 'var(--slate)' }}>Counts only: no names, messages or answers. Days are UTC. Signed in as {g.email}.</p>
        <AdminNav />
        <p>Window: {WINDOWS.map((d) => d === w ? <strong key={d} style={{ marginRight: 10 }}>{d} days</strong> : <a key={d} href={`/admin/activity?days=${d}`} style={{ marginRight: 10 }}>{d} days</a>)}</p>

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 20 }}>Sign-ins</h2>
        {r.signins.available && r.signins.data ? <>
          <div className="stat-tile-row"><Tile value={r.signins.data.total} label="sign-ins" /><Tile value={r.signins.data.distinctUsers} label="different people" /><Tile value={r.signins.data.failed} label="failed attempts" /><Tile value={r.signins.data.wrongPortal} label="wrong portal" /><Tile value={r.signins.data.logouts} label="sign-outs" /></div>
          <Bars values={r.signins.data.perDay} days={r.days} />
          <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>The log started on {r.signins.data.logStartedOn ?? 'no event yet'}; nothing earlier is counted.{r.signins.data.truncated ? ' Showing the latest 20,000 events only.' : ''}</p>
        </> : <Unavailable s={r.signins} />}

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 20 }}>Coming back</h2>
        {r.returning.available && r.returning.data ? <p>{r.returning.data.cameBack} of {r.returning.data.lastWeekUsers} people who signed in in the {w} days before came back in the last {w} days ({pc(r.returning.data.ratePct)}).</p> : <Unavailable s={r.returning} />}

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 20 }}>New accounts</h2>
        {r.registrations.available && r.registrations.data ? <>
          <p>{r.registrations.data.total} new accounts{Object.keys(r.registrations.data.byRole).length ? ': ' + Object.entries(r.registrations.data.byRole).map(([k, v]) => `${k} ${v}`).join(', ') : ''}.</p>
          <Bars values={r.registrations.data.perDay} days={r.days} />
        </> : <Unavailable s={r.registrations} />}

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 20 }}>Lessons</h2>
        {r.lessons.available && r.lessons.data ? <div className="stat-tile-row"><Tile value={r.lessons.data.started} label="lessons started" /><Tile value={r.lessons.data.completed} label="completed" /><Tile value={r.lessons.data.abandoned} label="abandoned" /><Tile value={pc(r.lessons.data.completionPct)} label="finished of those that ended" /><Tile value={r.lessons.data.distinctStudents} label="different students" /></div> : <Unavailable s={r.lessons} />}

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 20 }}>AI reliability</h2>
        {r.ai.available && r.ai.data ? <>
          <p>{r.ai.data.total} AI calls, {r.ai.data.failed} failed.{r.ai.data.truncated ? ' (Latest 20,000 only.)' : ''} Speed is for calls that worked.</p>
          {r.ai.data.providers.length ? <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem' }}><thead><tr style={{ textAlign: 'left' }}>{['Provider', 'Calls', 'Failed', 'Fail %', 'Typical (ms)', 'Slow 1 in 20 (ms)'].map((h) => <th key={h} style={{ paddingRight: 12 }}>{h}</th>)}</tr></thead>
            <tbody>{r.ai.data.providers.map((p) => <tr key={p.provider}><td style={{ paddingRight: 12 }}>{p.provider}</td><td style={{ paddingRight: 12 }}>{p.calls}</td><td style={{ paddingRight: 12 }}>{p.failed}</td><td style={{ paddingRight: 12 }}>{pc(p.failPct)}</td><td style={{ paddingRight: 12 }}>{p.p50 ?? 'n/a'}</td><td>{p.p95 ?? 'n/a'}</td></tr>)}</tbody></table> : <p>No AI calls in this window.</p>}
          {r.ai.data.errorClasses.length > 0 && <p>Why calls failed: {r.ai.data.errorClasses.map((e) => `${e.label} ${e.count}`).join(' · ')}.</p>}
        </> : <Unavailable s={r.ai} />}
      </div>
    </div></main>
  );
}
