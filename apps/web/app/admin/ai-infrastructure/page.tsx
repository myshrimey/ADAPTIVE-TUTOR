import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadAiInfrastructure, activationBlocker, freeCapacity, CLASSIFICATIONS, TASKS, FREE_CORE_NOTICE, type ProviderRow } from '@adaptive-tutor/core';
import { GatewayControls, ProviderEditor, AddProvider, BenchmarkPanel } from '@/components/ai/AiControls';

export const dynamic = 'force-dynamic';

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const m = (x: { value: number | null; label: string }, money = true) => (x.value === null ? 'Insufficient data' : `${money ? inr(x.value) : x.value.toLocaleString('en-IN')} (${x.label})`);
const COLOR: Record<string, string> = { critical: '#d03a2f', warning: '#b07a00', info: '#4a6b8a', ok: '#1f9d55', exhausted: '#d03a2f', unknown: '#888', healthy: '#1f9d55', degraded: '#b07a00', unreliable: '#d03a2f' };
const Pill = ({ k, text }: { k: string; text?: string }) => <span style={{ color: COLOR[k] ?? '#444', fontWeight: 600 }}>{text ?? k}</span>;
const H = ({ children }: { children: React.ReactNode }) => <h2 style={{ fontSize: 'var(--step-1)', margin: 'var(--space-4) 0 0.2rem' }}>{children}</h2>;
const Tbl = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => (
  <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
    <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>{head.map((h) => <th key={h} style={{ padding: '0.25rem 0.4rem' }}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>{r.map((c, j) => <td key={j} style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>{c}</td>)}</tr>)}</tbody></table></div>
);

// ADMIN ONLY. The founder's view of every AI provider, its free quota, what AI costs, and the switches that control routing. No student text or names appear here.
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const d = await loadAiInfrastructure(createServiceClient());
  const cfg = d.config;
  const tasks = Object.entries(TASKS).filter(([k]) => !['provider_test'].includes(k)).map(([key, t]) => ({ key, label: t.label, tier: t.tier }));
  const testable = d.providers.filter((p) => ['testing', 'active'].includes(p.status) && p.keySet).map((p) => ({ id: p.id, name: p.provider_name }));
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <p style={{ margin: 0, color: 'var(--slate)', letterSpacing: '0.08em', fontSize: '0.8rem' }}>SAHAYAK · ADMIN</p>
        <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>AI Infrastructure</h1>
        <AdminNav />
        {!d.migrated && <p className="alert">Migration 0032 has not been run yet, so cost columns, benchmark tables and the editable provider list are not available. Run <code>npm run db:migrate</code>.</p>}
        <p style={{ fontSize: '0.88rem', color: 'var(--slate)' }}>{FREE_CORE_NOTICE.line} Mode now: <strong>{cfg.free_only_mode ? 'FREE ONLY (no paid provider is ever used)' : cfg.allow_paid_fallback ? 'Paid backup allowed for paid students, within the limits below' : 'Free providers only; paid backup not allowed'}</strong>.</p>

        <H>Alerts</H>
        {d.alerts.length === 0 ? <p style={{ color: 'var(--slate)' }}>No alerts.</p> : <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>{d.alerts.map((a, i) => <li key={i}><Pill k={a.level} text={a.level.toUpperCase()} /> {a.text}</li>)}</ul>}

        <H>Provider overview</H>
        <p>Active: <strong>{d.counts.active}</strong> · Paused / retired: <strong>{d.counts.disabled}</strong> · Candidates / testing: <strong>{d.counts.candidates}</strong> · Active on a free route: <strong>{d.counts.free}</strong> · Active paid: <strong>{d.counts.paid}</strong></p>

        <H>Free quota</H>
        <p style={{ fontSize: '0.82rem', color: 'var(--slate)', margin: 0 }}>Counted by Sahayak since India midnight (ESTIMATED: the provider&apos;s own counter may reset at a different time). A limit you have not entered shows &ldquo;UNKNOWN&rdquo;; nothing is guessed. At {cfg.quota_warn_pct}% warning, {cfg.quota_critical_pct}% critical, 100% the free route switches off and the next approved provider is used. Sahayak never moves from free to paid on its own.</p>
        <Tbl head={['Provider', 'Model', 'Free route', 'Used today', 'Quota used', 'Requests left', 'Est. students left', 'Reset', 'Expiry', 'Billed today', 'Fallback']}
          rows={d.lines.filter((l) => ['active', 'testing'].includes(l.status)).map((l) => [
            <strong key="n">{l.name}</strong>, l.model ?? '—', l.free ? 'yes' : 'no', `${l.requestsToday} calls · ${l.tokensToday.toLocaleString('en-IN')} tok`,
            l.quota.pct === null ? 'UNKNOWN — VERIFY' : <span key="q"><Pill k={l.quota.level} text={`${l.quota.pct}%`} /> of {l.quota.dimension}</span>,
            l.quota.remainingRequests ?? 'UNKNOWN', m(l.estimatedRemainingStudents, false), l.reset, l.expiry ?? '—', inr(l.billedToday), l.fallback ?? '—'])} />

        <H>Cost</H>
        <Tbl head={['Period', 'AI calls', 'Failed / refused', 'Free-route calls', 'Billed (₹)', 'List price (₹)']}
          rows={[['Today', d.cost.day], ['Last 7 days', d.cost.week], ['This month', d.cost.month]].map(([label, c]: any) => [label, c.calls, c.failures, c.freeCalls, inr(c.billedInr), inr(c.listInr)])} />
        <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Billed = what you actually pay (0 on a free route). List price = what the same calls would cost at the rates in the provider list (ESTIMATED; only as good as the prices you entered).</p>
        <p>Cost per active student (this month, {d.cost.perStudentMonth.activeStudents} students used AI): billed <strong>{m(d.cost.perStudentMonth.billedPerStudent)}</strong> · at list price <strong>{m(d.cost.perStudentMonth.listPerStudent)}</strong><br />
          Cost per 1,000 such students (straight-line): billed <strong>{m(d.cost.perStudentMonth.billedPer1000)}</strong> · at list price <strong>{m(d.cost.perStudentMonth.listPer1000)}</strong><br />
          Cost per handwritten evaluation (this month, {d.cost.handwritten.evaluations} evaluations with a recorded id): billed <strong>{m(d.cost.handwritten.billedAvg)}</strong> · at list price <strong>{m(d.cost.handwritten.listAvg)}</strong></p>
        <Tbl head={['Feature', 'Tier', 'Calls', 'Failed', 'Billed', 'List price']} rows={d.cost.features.map((f) => [f.label, f.tier, f.calls, f.failures, inr(f.billedInr), inr(f.listInr)])} />
        <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Tier 0 work (marks, percentages, XP, streaks, leaderboards, badges, attendance, progress, counts, rankings) never calls an AI model; the gateway refuses it.</p>

        <H>Free capacity (what students on the free plan can use today)</H>
        {(() => {
          const keyOf: Record<string, boolean> = Object.fromEntries(d.lines.map((l) => [l.id, l.keySet]));
          const used: Record<string, number> = Object.fromEntries(d.lines.map((l) => [l.id, l.requestsToday]));
          const fc = freeCapacity(d.providers as ProviderRow[], used, (p) => !!keyOf[p.id]);
          return (
            <div style={{ fontSize: '0.9rem' }}>
              <p style={{ margin: '0.2rem 0' }}><strong>{fc.routes.length}</strong> free route(s) are live. {fc.knownDailyRequests !== null ? <>Daily requests you entered across them: <strong>{fc.knownDailyRequests.toLocaleString('en-IN')}</strong>{fc.routesWithoutLimit > 0 ? ` (${fc.routesWithoutLimit} route(s) have no daily limit entered, so they are not counted)` : ''}.</> : 'No daily limit has been entered for any live free route, so total capacity is not known.'} Free routes are used before any other; nothing becomes paid unless you set an explicit budget rule.</p>
              <Tbl head={['Live free route', 'Model', 'Daily limit', 'Used today', 'Left today']} rows={fc.routes.map((r) => [<strong key="n">{r.name}</strong>, r.model ?? '—', r.dailyRequests === null ? 'not entered' : r.dailyRequests, r.usedToday, r.remaining === null ? '—' : r.remaining])} />
              {fc.candidates.length > 0 && (<>
                <p style={{ margin: '0.6rem 0 0.2rem' }}><strong>To add more free capacity</strong>: each provider below is NOT live yet. Nothing here costs money until it is live, and it only goes live after you verify its current official terms.</p>
                <Tbl head={['Provider', 'What is still needed']} rows={fc.candidates.map((c) => [<strong key="n">{c.name}</strong>, c.needs])} />
              </>)}
            </div>
          );
        })()}

        <H>Provider health and routing</H>
        <Tbl head={['Provider', 'Status', 'Health (last hour)', 'Failed %', '429 / rate limits', 'Calls today', 'Class', 'Key on server', 'Data policy']}
          rows={d.lines.map((l) => [<strong key="n">{l.name}</strong>, l.status, <Pill key="h" k={l.health} />, l.failureRate === null ? '—' : `${l.failureRate}%`, l.rate429, l.requestsToday, l.classification, l.keySet ? 'yes' : 'no', l.policy])} />
        <p style={{ fontSize: '0.85rem' }}>Current primary: <strong>{cfg.primary_provider ?? '—'}</strong>{cfg.primary_model ? ` (${cfg.primary_model})` : ''} → fallback: <strong>{cfg.fallback_provider ?? '—'}</strong>{cfg.fallback_model ? ` (${cfg.fallback_model})` : ''} → then the remaining approved providers by priority. Share of calls today: {d.routingShare.length ? d.routingShare.map((r) => `${r.id} ${r.requests}`).join(' · ') : 'no calls yet'}. A provider that fails half its calls in an hour is moved to the back automatically.</p>

        <H>Controls (change providers and limits without touching code)</H>
        <GatewayControls config={cfg} providerIds={d.providers.map((p) => p.id)} tasks={tasks} />

        <H>Quality: benchmark</H>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate)' }}>The starter set is only a handful of plain-fact questions. It is NOT the Class IX–XII benchmark: grow it with your teachers. Results are stored by model, version and date. A free model that answers wrongly is not cheaper.</p>
        <BenchmarkPanel providers={testable} runs={d.benchmarkRuns} cases={d.benchmarkCases} />

        <H>Provider list (registry)</H>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Classes: {Object.entries(CLASSIFICATIONS).map(([k, v]) => `${k} = ${v}`).join(' · ')}. Anything you have not verified stays blank or &ldquo;UNKNOWN — VERIFY&rdquo;. A provider cannot be switched on until all nine checks are ticked, a verified date and the official documentation URL are entered (existing providers are exempt but still show NOT VERIFIED). Consumer free access is not API free access: ChatGPT Free, Claude Free and Grok Free do not give free API use.</p>
        <AddProvider />
        {d.providers.map((p) => <ProviderEditor key={p.id} p={p} blocker={activationBlocker(p as ProviderRow)} />)}
      </div>
    </div></main>
  );
}
