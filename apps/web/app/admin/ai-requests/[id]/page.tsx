import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadAiRequest, rowEconomic, rowBilled, rowList } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 5 })}`;
const KV = ({ k, v }: { k: string; v: React.ReactNode }) => <tr><td style={{ padding: '0.2rem 0.8rem 0.2rem 0', color: 'var(--slate)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{k}</td><td style={{ padding: '0.2rem 0' }}>{v}</td></tr>;

// ADMIN ONLY. One AI request, start to finish. The routing explanation never leaves this page.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const { id } = await params;
  const r = await loadAiRequest(createServiceClient(), decodeURIComponent(id));
  if (!r) return <main className="page"><div className="shell"><p>Request not found.</p><p><a href="/admin/ai-requests">← AI requests</a></p></div></main>;
  const fin = r.finalAttempt ?? r.attempts[r.attempts.length - 1];
  const expl: any = (r.finalAttempt as any)?.route_explanation ?? (r.attempts.find((a: any) => a.route_explanation) as any)?.route_explanation ?? null;
  const snap: any = (r.finalAttempt as any)?.pricing_snapshot ?? null;
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <p style={{ margin: 0, color: 'var(--slate)', letterSpacing: '0.08em', fontSize: '0.8rem' }}>SAHAYAK · ADMIN</p>
        <h1 style={{ fontSize: 'var(--step-2)', margin: 0 }}>AI request <code style={{ fontSize: '0.8em' }}>{r.requestId.slice(0, 18)}</code></h1>
        <AdminNav />
        <table style={{ fontSize: '0.9rem', borderCollapse: 'collapse' }}><tbody>
          <KV k="Result" v={<strong style={{ color: r.ok ? '#1f9d55' : '#d03a2f' }}>{r.ok ? (r.fallbackUsed ? 'Succeeded after a fallback' : 'Succeeded') : 'Failed'}</strong>} />
          <KV k="When" v={new Date(r.startedAt).toLocaleString('en-IN')} />
          <KV k="Feature / task" v={`${r.feature} / ${r.task}`} />
          <KV k="Student" v={r.studentId ? <>{r.studentName ?? 'unnamed'} <code style={{ fontSize: '0.75rem' }}>{r.studentId}</code></> : 'none (admin or system call)'} />
          <KV k="Account (user id)" v={r.userId ? <code style={{ fontSize: '0.75rem' }}>{r.userId}</code> : 'not recorded'} />
          <KV k="Organisation (linked tutor/centre)" v={r.organisationId ? <code style={{ fontSize: '0.75rem' }}>{r.organisationId}</code> : 'none'} />
          <KV k="Provider and exact model" v={fin ? `${fin.provider} · ${fin.model ?? 'model not recorded'}${fin.model_version ? ` · version ${fin.model_version}` : ' · version not recorded'}` : '—'} />
          <KV k="Quota type" v={fin?.quota_type ?? 'not recorded (before v59)'} />
          <KV k="Resources" v={`${r.inputTokens} input tokens · ${r.outputTokens} output tokens · ${r.images} image(s)${fin?.audio_seconds ? ` · ${fin.audio_seconds}s audio` : ''}`} />
          <KV k="Latency (final attempt)" v={fin?.latency_ms ? `${fin.latency_ms} ms` : '—'} />
          <KV k="Quality check" v={fin?.quality_result ?? 'not recorded'} />
          <KV k="Estimated (list) cost" v={inr(r.attempts.reduce((s, a) => s + rowList(a), 0))} />
          <KV k="Billed (expected)" v={inr(r.billedInr)} />
          <KV k="Economic cost" v={inr(r.economicInr)} />
          <KV k="Actual provider charge" v={r.attempts.some((a) => a.actual_cost_inr != null) ? inr(r.attempts.reduce((s, a) => s + Number(a.actual_cost_inr ?? 0), 0)) : 'not available per request (enter the monthly invoice on the AI Economics page)'} />
        </tbody></table>

        <h2 style={{ fontSize: 'var(--step-1)', margin: 'var(--space-3) 0 0.2rem' }}>Attempts ({r.attempts.length})</h2>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>{['#', 'Provider · model', 'Result', 'Latency', 'Retry / fallback', 'Why the next one was needed', 'Billed', 'Economic'].map((h) => <th key={h} style={{ padding: '0.25rem 0.4rem' }}>{h}</th>)}</tr></thead>
          <tbody>{r.attempts.map((a, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '0.25rem 0.4rem' }}>{a.attempt_no ?? i + 1}</td><td style={{ padding: '0.25rem 0.4rem' }}>{a.provider} · {a.model ?? '—'}</td>
              <td style={{ padding: '0.25rem 0.4rem', color: a.ok ? '#1f9d55' : '#d03a2f' }}>{a.ok ? 'OK' : `FAILED ${a.status_code ?? ''} ${a.error ?? ''}`.slice(0, 110)}</td>
              <td style={{ padding: '0.25rem 0.4rem' }}>{a.latency_ms ?? '—'} ms</td><td style={{ padding: '0.25rem 0.4rem' }}>{a.retry_count ?? 0} / {a.fallback_count ?? 0}</td>
              <td style={{ padding: '0.25rem 0.4rem' }}>{a.fallback_reason ?? '—'}</td><td style={{ padding: '0.25rem 0.4rem' }}>{inr(rowBilled(a))}</td><td style={{ padding: '0.25rem 0.4rem' }}>{inr(rowEconomic(a))}</td>
            </tr>))}</tbody></table></div>

        <h2 style={{ fontSize: 'var(--step-1)', margin: 'var(--space-3) 0 0.2rem' }}>Why this model was chosen (admin only)</h2>
        {!expl ? <p>No routing explanation was stored for this request (it was made before v59, or migration 0036 was not run).</p> : (
          <div style={{ fontSize: '0.9rem' }}>
            <p style={{ margin: '0.2rem 0' }}>Selected <strong>{expl.selected}</strong> ({expl.model ?? 'model not recorded'}) for task <strong>{expl.task}</strong> (tier {expl.task_tier}), objective: {String(expl.objective).replace(/_/g, ' ')}. Position in the route: {expl.position_in_chain} of {expl.chain?.length ?? '?'}.</p>
            <ul style={{ margin: '0.2rem 0', paddingLeft: '1.1rem' }}>{(expl.reasons ?? []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
            {expl.needs?.length > 0 && <p style={{ margin: '0.2rem 0' }}>Capabilities this task needed: {expl.needs.join(', ')}.</p>}
            {expl.fallback_because && <p style={{ margin: '0.2rem 0' }}>Tried because the earlier attempt failed: {expl.fallback_because}</p>}
            {expl.spend_levels?.length > 0 && <p style={{ margin: '0.2rem 0' }}>Spend levels at the time: {expl.spend_levels.join('; ')}</p>}
            {expl.skipped?.length > 0 && <details><summary style={{ cursor: 'pointer' }}>Models not used ({expl.skipped.length})</summary><ul>{expl.skipped.map((s: any, i: number) => <li key={i}>{s.id}: {s.reason}</li>)}</ul></details>}
          </div>)}

        <h2 style={{ fontSize: 'var(--step-1)', margin: 'var(--space-3) 0 0.2rem' }}>Pricing used at the time</h2>
        {!snap ? <p>Not recorded for this request.</p> : <><table style={{ fontSize: '0.88rem' }}><tbody>
          <KV k="Input price (US$ per 1M tokens)" v={snap.input_price_usd_m ?? 'not recorded'} /><KV k="Output price (US$ per 1M tokens)" v={snap.output_price_usd_m ?? 'not recorded'} /><KV k="Image price (US$)" v={snap.image_price_usd ?? 'not recorded'} />
          <KV k="US$ → ₹ rate" v={snap.fx_usd_inr} /><KV k="Price last verified" v={snap.price_last_verified ?? 'never'} /><KV k="Priced on" v={snap.priced_on} /></tbody></table>
          <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>These are the rates in force when the call was made. Changing a price later does not change this request&apos;s recorded cost.</p></>}
        <p><a href="/admin/ai-requests">← AI requests</a> · <a href="/admin/ai-economics">AI Economics</a></p>
      </div>
    </div></main>
  );
}
