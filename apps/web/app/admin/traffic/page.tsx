import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { trafficReport, changePct, type Count } from '@adaptive-tutor/core';
import { TrafficChart } from '@/components/TrafficChart';
import { TrafficCheck } from '@/components/TrafficCheck';

export const dynamic = 'force-dynamic';
const RANGES: Array<[string, string]> = [['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['90d', 'Last 90 days']];
const mmss = (s: number | null) => (s == null ? 'Insufficient data' : s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

function Delta({ now, before }: { now: number | null; before: number | null }) {
  const c = changePct(now, before);
  if (c === null) return <small style={{ color: 'var(--slate)' }}>no comparison yet</small>;
  return <small style={{ color: c >= 0 ? '#1f7a4d' : '#a33' }}>{c >= 0 ? '▲' : '▼'} {Math.abs(c)}% vs previous period</small>;
}
function Tile({ label, value, now, before, note }: { label: string; value: string; now?: number | null; before?: number | null; note?: string }) {
  return <div className="tip-card" style={{ margin: 0 }}><div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{label}</div><div style={{ fontSize: '1.7rem', fontWeight: 700 }}>{value}</div>{now !== undefined && <Delta now={now ?? null} before={before ?? null} />}{note && <div style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>{note}</div>}</div>;
}
function Table({ title, rows, head = 'Sessions' }: { title: string; rows: Count[]; head?: string }) {
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  return (
    <section className="tip-card" style={{ margin: 0 }}>
      <h3 style={{ fontSize: '1rem', marginTop: 0 }}>{title}</h3>
      {rows.length === 0 ? <p style={{ color: 'var(--slate)', margin: 0 }}>No data yet.</p> :
        <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse' }}><thead><tr style={{ textAlign: 'left', color: 'var(--slate)' }}><th>Name</th><th style={{ textAlign: 'right' }}>{head}</th><th style={{ textAlign: 'right' }}>Share</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.name} style={{ borderTop: '1px solid var(--line)' }}><td style={{ padding: '0.25rem 0' }}>{r.name}</td><td style={{ textAlign: 'right' }}>{r.count}</td><td style={{ textAlign: 'right' }}>{Math.round((r.count / total) * 100)}%</td></tr>)}</tbody></table>}
    </section>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const sp = await searchParams;
  const range = RANGES.some(([k]) => k === sp.range) ? (sp.range as string) : '30d';
  const rep = await trafficReport(createServiceClient(), range);
  const s = rep.summary; const t = s.totals; const p = s.previous;
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Website traffic</h1>
        <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. Counts of real visits recorded by Sahayak itself: no cookies, no IP addresses and no names are stored, and bots, admin pages and visitors who send &quot;Do Not Track&quot; are not counted. Dates are Indian time ({rep.from} to {rep.to}).</p>
        <AdminNav />
        <p style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {RANGES.map(([k, label]) => <a key={k} href={`/admin/traffic?range=${k}`} className={k === range ? 'btn btn--accent' : 'btn btn--ghost'}>{label}</a>)}
          <span style={{ marginLeft: 'auto' }} role="status">● <strong>{rep.realtime}</strong> on the site in the last 5 minutes</span>
        </p>
      </div>
      {rep.loadError && <p className="alert"><strong>The traffic table could not be read:</strong> {rep.loadError}. Press &quot;Check the counter&quot; below.</p>}
      {!s.enough && <p className="alert">Not much traffic recorded yet ({t.pageviews} page views). Figures fill in as people visit. If this stays at zero after visitors have been on the site, press &quot;Check the counter&quot; at the bottom of this page: it says exactly what is stopping visits from being saved.</p>}
      {rep.truncated && <p className="alert">This range has more than 200,000 page views; only the first 200,000 are shown.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.7rem' }}>
        <Tile label="Visitors" value={String(t.visitors)} now={t.visitors} before={p?.visitors ?? null} note="unique per day, added up" />
        <Tile label="Sessions" value={String(t.sessions)} now={t.sessions} before={p?.sessions ?? null} />
        <Tile label="Page views" value={String(t.pageviews)} now={t.pageviews} before={p?.pageviews ?? null} />
        <Tile label="Pages per session" value={t.pagesPerSession === null ? 'Insufficient data' : String(t.pagesPerSession)} />
        <Tile label="Bounce rate" value={t.bounceRate === null ? 'Insufficient data' : t.bounceRate + '%'} note="sessions with one page only" />
        <Tile label="Avg. session length" value={mmss(t.avgSessionSeconds)} note="multi-page sessions; an estimate" />
      </div>
      <section className="tip-card" style={{ marginTop: 'var(--space-3)' }}>
        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 0 }}>Visits over time</h2>
        <TrafficChart daily={s.daily} />
        <p style={{ fontSize: '0.8rem', color: 'var(--slate)', margin: 0 }}>Bars: page views. Line: visitors. A &quot;visitor&quot; is one browser on one day; someone who comes back tomorrow counts again, so this is not a count of different people.</p>
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.8rem', marginTop: 'var(--space-3)' }}>
        <section className="tip-card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '1rem', marginTop: 0 }}>Top pages</h3>
          {s.topPages.length === 0 ? <p style={{ color: 'var(--slate)', margin: 0 }}>No data yet.</p> :
            <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse' }}><thead><tr style={{ textAlign: 'left', color: 'var(--slate)' }}><th>Page</th><th style={{ textAlign: 'right' }}>Views</th><th style={{ textAlign: 'right' }}>Visitors</th></tr></thead>
              <tbody>{s.topPages.map((r) => <tr key={r.path} style={{ borderTop: '1px solid var(--line)' }}><td style={{ padding: '0.25rem 0', wordBreak: 'break-all' }}>{r.path}</td><td style={{ textAlign: 'right' }}>{r.views}</td><td style={{ textAlign: 'right' }}>{r.visitors}</td></tr>)}</tbody></table>}
        </section>
        <Table title="Landing pages (where visits start)" rows={s.entryPages} />
        <Table title="How people arrive (channels)" rows={s.channels} />
        <Table title="Sources (not direct)" rows={s.sources} />
        <Table title="Devices" rows={s.devices} />
        <Table title="Browsers" rows={s.browsers} />
        <Table title="Operating systems" rows={s.os} />
        <Table title="Countries" rows={s.countries} />
        <Table title="Signed in or not" rows={[{ name: 'Signed in', count: s.signedIn.signedIn }, { name: 'Not signed in', count: s.signedIn.anonymous }]} />
        <section className="tip-card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '1rem', marginTop: 0 }}>From visit to learning (same period)</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            <li>Sessions: {t.sessions}</li>
            <li>New accounts created: {rep.signups ?? 'not available'}</li>
            <li>Diagnostics finished: {rep.diagnostics ?? 'not available'}</li>
          </ul>
          <p style={{ fontSize: '0.78rem', color: 'var(--slate)', marginBottom: 0 }}>Counts the database holds. Visitors and accounts are not matched person by person, so no &quot;conversion rate&quot; is shown.</p>
        </section>
      </div>
      <TrafficCheck />
      <p style={{ fontSize: '0.8rem', color: 'var(--slate)', marginTop: 'var(--space-3)' }}>Countries come from the hosting network and are approximate. Page views before this feature was switched on are not available. Add <code>?utm_source=whatsapp</code> (or any name) to a link you share to see it as a source here.</p>
    </div></main>
  );
}
