import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadTimeline, cleanTimelineFilter, writeAudit, ACTIVITY_CATEGORIES, ACTIVITY_TYPES, ACTIVITY_LABEL, type ActivityType } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';

// v138: Super Admin only. Per-account activity timeline from the central activity log. Events only: no message text, answers or contact details.
// Opening it is written to the Audit log. The lawyer review (D7) is deferred by the founder's decision (FD-16); this is not a compliance claim.
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const { id } = await params;
  const f = cleanTimelineFilter((await searchParams) ?? {});
  const service = createServiceClient();
  const valid = /^[0-9a-f-]{36}$/i.test(id);
  const rows = valid ? await loadTimeline(service, id, f) : [];
  if (valid) await writeAudit(service, { actorEmail: g.email, actorRole: 'super_admin', action: 'activity.timeline_view', entity: 'user', entityId: id, targetAccount: id, outcome: 'success', detail: { shown: rows?.length ?? 0, filtered: !!(f.from || f.to || f.category || f.type) } });
  const box = { padding: '4px 8px', marginRight: 8, marginBottom: 6 } as const;
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <p><a href={`/admin/accounts/${id}`}>← Account</a></p>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Activity timeline</h1>
        <p style={{ color: 'var(--slate)' }}>Events only (what happened and when): no message text, answers or contact details. Starts from when the activity log was switched on; nothing earlier is filled in. Opening this page is recorded in the Audit log.</p>
        <AdminNav />
        <form method="get" style={{ margin: '12px 0' }}>
          <label style={box}>From <input type="date" name="from" defaultValue={f.from} /></label>
          <label style={box}>to <input type="date" name="to" defaultValue={f.to} /></label>
          <select name="category" defaultValue={f.category ?? ''} style={box} aria-label="Category"><option value="">Any category</option>{ACTIVITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select name="type" defaultValue={f.type ?? ''} style={box} aria-label="Event"><option value="">Any event</option>{(Object.keys(ACTIVITY_TYPES) as ActivityType[]).map((t) => <option key={t} value={t}>{ACTIVITY_LABEL[t]}</option>)}</select>
          <button type="submit" style={box}>Filter</button> <a href={`/admin/accounts/${id}/timeline`}>Clear</a>
        </form>
        {rows === null ? <p>The activity log is not set up yet. Run the latest database update (0068).</p>
          : rows.length === 0 ? <p>No events recorded for this account{f.from || f.to || f.category || f.type ? ' with these filters' : ' yet'}.</p>
          : <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem' }}><thead><tr style={{ textAlign: 'left' }}>{['When (UTC)', 'Event', 'Category', 'Result', 'Detail'].map((h) => <th key={h} style={{ paddingRight: 12 }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id} style={{ verticalAlign: 'top' }}><td style={{ paddingRight: 12 }}>{r.at.slice(0, 16).replace('T', ' ')}</td><td style={{ paddingRight: 12 }}>{ACTIVITY_LABEL[r.type as ActivityType] ?? r.type}</td><td style={{ paddingRight: 12 }}>{r.category}</td><td style={{ paddingRight: 12 }}>{r.status}</td><td>{Object.entries(r.meta).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</td></tr>)}</tbody></table>}
        {rows && rows.length >= f.limit && <p style={{ fontSize: '0.85rem' }}>Showing the latest {f.limit}. Narrow the dates to see older events.</p>}
      </div>
    </div></main>
  );
}
