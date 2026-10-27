'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Opt = Record<string, string>;
export interface BoardProps {
  email: string; labels: { platforms: Opt; audiences: Opt; objectives: Opt; types: Opt; scopes: Opt; languages: Opt; status: Opt; refine: Opt };
  pillars: { id: string | null; name: string; active: boolean }[]; settings: any; publishers: { platform: string; connected: boolean; note: string }[]; imageNote: string; installed: boolean; futureChannels: string[];
}
const ago = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : '');
const LV: Record<string, string> = { ok: '#3f7a5c', warn: '#e0a100', risk: '#d03a2f' };
const STAT_COLOR: Record<string, string> = { IDEA: '#8a8a8a', DRAFT: '#5b6b8c', REVIEW: '#e0a100', APPROVED: '#3f7a5c', PUBLISHED: '#1f6fb2', REJECTED: '#d03a2f', ARCHIVED: '#8a8a8a' };
const num = (v: any) => (v === null || v === undefined ? 'Not available' : new Intl.NumberFormat('en-IN').format(v));
const pct = (v: any) => (v === null || v === undefined ? 'Not available' : `${(v * 100).toFixed(1)}%`);
const inr = (v: any) => (v === null || v === undefined ? 'Not available' : `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)}`);

async function call(section: string, body: any) {
  try { const r = await fetch(`/api/admin/social-growth/${section}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); return j as { data: any; error: string | null }; }
  catch { return { data: null, error: 'Could not reach the server. Check your internet connection and press the button again.' }; }
}
async function get(section: string, qs = '') {
  try { const r = await fetch(`/api/admin/social-growth/${section}${qs}`, { cache: 'no-store' }); return (await r.json()) as { data: any; error: string | null }; }
  catch { return { data: null, error: 'Could not reach the server. Check your internet connection and try again.' }; }
}
const Sel = ({ value, onChange, opts, all }: { value: string; onChange: (v: string) => void; opts: Opt; all?: string }) => (
  <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>{all !== undefined && <option value="">{all}</option>}{Object.entries(opts).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
);
const copy = async (t: string, say: (m: string) => void, what: string) => { try { await navigator.clipboard.writeText(t); say(`${what} copied.`); } catch { say('Copy did not work on this browser. Select the text and copy it by hand.'); } };

export function SocialGrowthBoard(p: BoardProps) {
  const [tab, setTab] = useState<'today' | 'calendar' | 'library' | 'campaigns' | 'results' | 'settings'>('today');
  const [data, setData] = useState<{ content: any[]; campaigns: any[]; metrics: any[]; base: string } | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean; retry?: () => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pillars, setPillars] = useState(p.pillars);
  const [settings, setSettings] = useState<any>(p.settings);
  const [lib, setLib] = useState({ platform: '', audience: '', pillar: '', campaign: '', status: '', language: '', q: '', archived: false });
  const say = (t: string, bad = false, retry?: () => void) => setMsg({ t, bad, retry });
  const activePillars = useMemo(() => pillars.filter((x) => x.active).map((x) => x.name), [pillars]);

  const load = useCallback(async () => {
    const qs = new URLSearchParams(); Object.entries(lib).forEach(([k, v]) => { if (v) qs.set(k, v === true ? '1' : String(v)); });
    const [c, o] = await Promise.all([get('content', `?${qs}`), get('overview')]);
    if (c.error) say(c.error, true, load); else setData(c.data); if (!o.error) setOverview(o.data);
  }, [lib]);
  useEffect(() => { if (p.installed) load(); }, [load, p.installed]);
  useEffect(() => { if (p.installed && (tab === 'results' || tab === 'campaigns') && !analytics) get('analytics').then((a) => { if (a.error) say(a.error, true); else setAnalytics(a.data); }); }, [tab, analytics, p.installed]);

  async function act(section: string, body: any, ok?: string): Promise<any> {
    setBusy(true); setMsg(null); const r = await call(section, body); setBusy(false);
    if (r.error) { say(r.error, true, () => act(section, body, ok)); return null; }
    if (ok) say(ok); await load(); setAnalytics(null); return r.data;
  }
  if (!p.installed) return <p className="alert">The Social Growth tables are not installed yet. Run the database update (npm run db:migrate, file 0046) and reload this page.</p>;

  const content = data?.content ?? []; const campaigns = data?.campaigns ?? [];
  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  const cName = (id: string | null) => campaigns.find((c: any) => c.id === id)?.name ?? '';
  const by = (s: string) => content.filter((c) => c.status === s).length;
  const tabs: [typeof tab, string][] = [['today', 'Today'], ['calendar', 'Calendar'], ['library', 'Library'], ['campaigns', 'Campaigns & tests'], ['results', 'Results & insights'], ['settings', 'Settings']];

  return (
    <div className="sg">
      <p style={{ fontSize: '0.88rem' }}><strong>How this works:</strong> Sahayak writes drafts (ready-made templates, or AI if you tick it). You review, approve, post it yourself on the platform, then press &ldquo;Mark as published&rdquo; and paste the post address. <strong>No Facebook, Instagram or LinkedIn account is connected, so nothing is ever posted automatically and no results are fetched; you type results in.</strong></p>
      <div className="sg-tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`btn btn--small ${tab === k ? 'btn--accent' : 'btn--ghost'}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {msg && <div className={msg.bad ? 'alert' : 'sg-ok'} role="status">{msg.t} {msg.retry && <button className="btn btn--small btn--ghost" onClick={msg.retry}>Try again</button>}</div>}
      {busy && <p style={{ color: 'var(--slate)' }}>Working&hellip;</p>}

      {tab === 'today' && <TodayTab p={p} content={content} campaigns={campaigns} overview={overview} today={today} busy={busy} act={act} activePillars={activePillars} settings={settings}
        cards={content.filter((c) => c.planned_date === today || c.status === 'REVIEW').map((c) => <PostCard key={c.id} c={c} p={p} cName={cName} act={act} say={say} base={data?.base ?? ''} campaigns={campaigns} />)} />}

      {tab === 'calendar' && <CalendarTab content={content} act={act} busy={busy} p={p} campaigns={campaigns} today={today} cards={(c: any) => <PostCard key={c.id} c={c} p={p} cName={cName} act={act} say={say} base={data?.base ?? ''} campaigns={campaigns} />} />}

      {tab === 'library' && (
        <section>
          <div className="sg-grid">
            <Sel value={lib.platform} onChange={(v) => setLib({ ...lib, platform: v })} opts={p.labels.platforms} all="All platforms" />
            <Sel value={lib.audience} onChange={(v) => setLib({ ...lib, audience: v })} opts={p.labels.audiences} all="All audiences" />
            <select className="field" value={lib.pillar} onChange={(e) => setLib({ ...lib, pillar: e.target.value })}><option value="">All pillars</option>{pillars.map((x) => <option key={x.name}>{x.name}</option>)}</select>
            <select className="field" value={lib.campaign} onChange={(e) => setLib({ ...lib, campaign: e.target.value })}><option value="">All campaigns</option>{campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <Sel value={lib.status} onChange={(v) => setLib({ ...lib, status: v })} opts={p.labels.status} all="Any status" />
            <Sel value={lib.language} onChange={(v) => setLib({ ...lib, language: v })} opts={p.labels.languages} all="Any language" />
            <input className="field" placeholder="Search words" value={lib.q} onChange={(e) => setLib({ ...lib, q: e.target.value })} />
            <label style={{ fontSize: '0.9rem' }}><input type="checkbox" checked={lib.archived} onChange={(e) => setLib({ ...lib, archived: e.target.checked })} /> Show archived</label>
          </div>
          <p><a className="btn btn--small btn--ghost" href="/api/admin/social-growth/export?kind=library">Download library (CSV)</a> {content.length} post{content.length === 1 ? '' : 's'}</p>
          {content.length === 0 && <p style={{ color: 'var(--slate)' }}>Nothing matches. Generate content on the Today tab.</p>}
          {content.map((c) => <PostCard key={c.id} c={c} p={p} cName={cName} act={act} say={say} base={data?.base ?? ''} campaigns={campaigns} />)}
        </section>
      )}

      {tab === 'campaigns' && <CampaignTab campaigns={campaigns} content={content} analytics={analytics} act={act} p={p} />}
      {tab === 'results' && <ResultsTab analytics={analytics} p={p} overview={overview} act={act} />}
      {tab === 'settings' && <SettingsTab p={p} settings={settings} setSettings={setSettings} pillars={pillars} setPillars={setPillars} act={act} say={say} />}
      <p style={{ fontSize: '0.8rem', color: 'var(--slate)', marginTop: 'var(--space-4)' }}>Signed in as {p.email}. Counts: {by('DRAFT')} draft &middot; {by('REVIEW')} awaiting approval &middot; {by('APPROVED')} approved &middot; {by('PUBLISHED')} published.</p>
    </div>
  );
}

function TodayTab({ p, content, campaigns, overview, today, busy, act, activePillars, settings, cards }: any) {
  const [f, setF] = useState<any>({ platform: settings.defaultPlatform, audience: settings.defaultAudience, objective: 'education', contentType: 'tip', scope: 'cbse', pillar: activePillars[0] ?? 'Learning Gaps', topic: '', campaignId: '', useAi: false });
  const [idea, setIdea] = useState('');
  const o = overview;
  const tiles: [string, any][] = [['Today', o?.today], ['This week', o?.week], ['Drafts', o?.byStatus?.DRAFT ?? 0], ['Awaiting approval', o?.pending], ['Approved', o?.byStatus?.APPROVED ?? 0], ['Published', o?.byStatus?.PUBLISHED ?? 0], ['Failed', null], ['Leads (entered)', o?.leads ?? null], ['Sign-ups (entered)', o?.registrations ?? null], ['Customers (entered)', o?.conversions ?? null], ['Revenue (entered)', null]];
  return (
    <section>
      <div className="sg-tiles">{tiles.map(([l, v]) => <div key={l} className="sg-tile"><span>{l}</span><strong>{l === 'Revenue (entered)' ? inr(o?.revenue ?? null) : l === 'Failed' ? 'Not available' : num(v)}</strong></div>)}</div>
      <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Best platform: {o?.bestPlatform ? p.labels.platforms[o.bestPlatform] : 'Not enough data yet'} &middot; Best topic: {o?.bestTopic ?? 'Not enough data yet'} &middot; Best content type: {o?.bestType ? p.labels.types[o.bestType] ?? o.bestType : 'Not enough data yet'}. &ldquo;Failed&rdquo; stays Not available because nothing is posted by the app. &ldquo;Entered&rdquo; numbers are typed in by you.</p>
      <div className="sg-box">
        <h3>Generate today&rsquo;s content</h3>
        <p style={{ fontSize: '0.88rem' }}>Makes one Facebook, one Instagram and one LinkedIn draft for today, each with text, call to action, hashtags and an image brief. You can rewrite any one of them afterwards.</p>
        <label style={{ fontSize: '0.9rem' }}><input type="checkbox" checked={f.useAi} onChange={(e) => setF({ ...f, useAi: e.target.checked })} /> Let AI write them (uses a little AI budget; the ready-made template is free)</label>
        <div className="hero__actions"><button className="btn btn--accent" disabled={busy} onClick={() => act('generate', { mode: 'daily', useAi: f.useAi }, 'Today’s drafts are ready below.')}>Generate Today&rsquo;s Content</button>
          <button className="btn btn--ghost btn--small" disabled={busy} onClick={() => act('generate', { mode: 'daily', useAi: f.useAi, force: true }, 'Another set was added.')}>Make another set</button></div>
      </div>
      <details className="sg-box"><summary><strong>Make one post (choose everything)</strong></summary>
        <div className="sg-grid">
          <Sel value={f.platform} onChange={(v) => setF({ ...f, platform: v })} opts={{ ...p.labels.platforms, all: 'All platforms' }} />
          <Sel value={f.audience} onChange={(v) => setF({ ...f, audience: v })} opts={p.labels.audiences} />
          <Sel value={f.objective} onChange={(v) => setF({ ...f, objective: v })} opts={p.labels.objectives} />
          <Sel value={f.contentType} onChange={(v) => setF({ ...f, contentType: v })} opts={p.labels.types} />
          <Sel value={f.scope} onChange={(v) => setF({ ...f, scope: v })} opts={p.labels.scopes} />
          <select className="field" value={f.pillar} onChange={(e) => setF({ ...f, pillar: e.target.value })}>{activePillars.map((x: string) => <option key={x}>{x}</option>)}</select>
          <select className="field" value={f.campaignId} onChange={(e) => setF({ ...f, campaignId: e.target.value })}><option value="">No campaign</option>{campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input className="field" placeholder="Topic (optional)" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} />
        </div>
        <label style={{ fontSize: '0.9rem' }}><input type="checkbox" checked={f.useAi} onChange={(e) => setF({ ...f, useAi: e.target.checked })} /> Let AI write it</label>
        <div className="hero__actions"><button className="btn btn--primary" disabled={busy} onClick={() => act('generate', { mode: 'single', ...f, plannedDate: today }, 'Draft created below.')}>Create draft</button></div>
      </details>
      <details className="sg-box"><summary><strong>One idea &rarr; every format (repurpose)</strong></summary>
        <p style={{ fontSize: '0.88rem' }}>Write one idea. You get a Facebook post, Instagram caption, carousel, Reel script, LinkedIn post, WhatsApp message, email and blog outline, each written for its own format. They go to the Library as drafts.</p>
        <textarea className="field" rows={2} placeholder="e.g. Why one missed basic idea lowers later chapters" value={idea} onChange={(e) => setIdea(e.target.value)} />
        <div className="hero__actions"><button className="btn btn--primary" disabled={busy} onClick={() => act('generate', { mode: 'repurpose', topic: idea, pillar: f.pillar, audience: f.audience, objective: f.objective, scope: f.scope }, 'Eight drafts were added to the Library.')}>Repurpose</button></div>
      </details>
      <details className="sg-box"><summary><strong>Write my own post</strong></summary><ManualForm p={p} f={f} act={act} today={today} campaigns={campaigns} /></details>
      <h3>Today and waiting for approval</h3>
      {cards.length === 0 ? <p style={{ color: 'var(--slate)' }}>Nothing for today yet. Press &ldquo;Generate Today&rsquo;s Content&rdquo;.</p> : cards}
    </section>
  );
}
function ManualForm({ p, f, act, today, campaigns }: any) {
  const [m, setM] = useState({ platform: 'facebook', hook: '', body: '', cta: '', hashtags: '', topic: '' });
  return (<div>
    <Sel value={m.platform} onChange={(v) => setM({ ...m, platform: v })} opts={p.labels.platforms} />
    <input className="field" placeholder="Hook (first line)" value={m.hook} onChange={(e) => setM({ ...m, hook: e.target.value })} />
    <textarea className="field" rows={5} placeholder="Post text" value={m.body} onChange={(e) => setM({ ...m, body: e.target.value })} />
    <input className="field" placeholder="Call to action" value={m.cta} onChange={(e) => setM({ ...m, cta: e.target.value })} />
    <input className="field" placeholder="Hashtags" value={m.hashtags} onChange={(e) => setM({ ...m, hashtags: e.target.value })} />
    <button className="btn btn--primary" onClick={() => act('content', { action: 'create', ...f, ...m, plannedDate: today }, 'Saved as a draft.')}>Save draft</button>
  </div>);
}

function PostCard({ c, p, cName, act, say, base, campaigns }: any) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState({ hook: c.hook ?? '', body: c.body, cta: c.cta ?? '', hashtags: (c.hashtags ?? []).join(' ') });
  const [det, setDet] = useState<any>(null);
  const [ack, setAck] = useState(false); const [reason, setReason] = useState(''); const [url, setUrl] = useState(c.external_url ?? '');
  const [how, setHow] = useState(''); const [ai, setAi] = useState(false);
  const [mv, setMv] = useState<any>({ metric_date: '' });
  useEffect(() => { setEdit({ hook: c.hook ?? '', body: c.body, cta: c.cta ?? '', hashtags: (c.hashtags ?? []).join(' ') }); setDet(null); }, [c.updated_at]);
  const loadDet = async () => { const r = await call('content', { action: 'detail', id: c.id }); if (r.error) say(r.error, true); else setDet(r.data); };
  useEffect(() => { if (open && !det) loadDet(); }, [open]);
  const dirty = edit.hook !== (c.hook ?? '') || edit.body !== c.body || edit.cta !== (c.cta ?? '') || edit.hashtags !== (c.hashtags ?? []).join(' ');
  const locked = c.status === 'PUBLISHED';
  const full = [edit.body, edit.hashtags].filter(Boolean).join('\n\n');
  const moves: Record<string, [string, string][]> = { IDEA: [['DRAFT', 'Make draft']], DRAFT: [['REVIEW', 'Send for approval']], REVIEW: [['APPROVED', 'Approve'], ['REJECTED', 'Reject'], ['DRAFT', 'Back to draft']], APPROVED: [['DRAFT', 'Back to draft']], REJECTED: [['DRAFT', 'Back to draft']], ARCHIVED: [['DRAFT', 'Restore']], PUBLISHED: [] };
  const sc = (c.quality as any)?.score;
  const metrics = (k: string, l: string) => <label key={k} className="sg-m"><span>{l}</span><input className="field" inputMode="numeric" value={mv[k] ?? ''} onChange={(e) => setMv({ ...mv, [k]: e.target.value })} placeholder="blank = unknown" /></label>;
  return (
    <div className="sg-card" style={{ borderLeft: `5px solid ${STAT_COLOR[c.status]}` }}>
      <div className="sg-head" onClick={() => setOpen(!open)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(!open)}>
        <strong>{p.labels.platforms[c.platform] ?? c.platform}</strong>
        <span className="sg-pill" style={{ background: STAT_COLOR[c.status] }}>{p.labels.status[c.status]}</span>
        <span style={{ fontSize: '0.85rem' }}>{p.labels.audiences[c.audience] ?? c.audience} &middot; {p.labels.types[c.content_type] ?? c.content_type}{c.planned_date ? ` · ${ago(c.planned_date)}` : ''}{cName(c.campaign_id) ? ` · ${cName(c.campaign_id)}` : ''}{c.source === 'ai' ? ' · AI-written' : c.source === 'manual' ? ' · written by you' : ' · template'}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>{open ? 'Close' : 'Open'}</span>
      </div>
      {!open && <p className="sg-peek">{c.hook || c.body.slice(0, 140)}</p>}
      {open && (
        <div>
          <input className="field" disabled={locked} aria-label="Hook" placeholder="Hook" value={edit.hook} onChange={(e) => setEdit({ ...edit, hook: e.target.value })} />
          <textarea className="field" disabled={locked} aria-label="Post text" rows={Math.min(14, Math.max(5, edit.body.split('\n').length + 1))} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
          <input className="field" disabled={locked} aria-label="Call to action" placeholder="Call to action" value={edit.cta} onChange={(e) => setEdit({ ...edit, cta: e.target.value })} />
          <input className="field" disabled={locked} aria-label="Hashtags" placeholder="Hashtags" value={edit.hashtags} onChange={(e) => setEdit({ ...edit, hashtags: e.target.value })} />
          {!locked && <div className="hero__actions">
            <button className="btn btn--small btn--primary" disabled={!dirty} onClick={() => act('content', { action: 'edit', id: c.id, patch: { hook: edit.hook, body: edit.body, cta: edit.cta, hashtags: edit.hashtags } }, c.status === 'APPROVED' || c.status === 'REVIEW' ? 'Saved. Because the words changed, it went back to Draft and needs approving again.' : 'Saved.')}>Save changes</button>
            <button className="btn btn--small btn--ghost" onClick={() => act('content', { action: 'hashtags', id: c.id }, 'New hashtags.')}>New hashtags</button>
            <button className="btn btn--small btn--ghost" onClick={() => act('content', { action: 'hook', id: c.id }, 'New hook.')}>New hook</button>
            <button className="btn btn--small btn--ghost" onClick={() => act('content', { action: 'cta', id: c.id }, 'New call to action.')}>New call to action</button>
          </div>}
          {!locked && <div className="sg-grid">
            <select className="field" aria-label="Change the post" value={how} onChange={(e) => setHow(e.target.value)}><option value="">Change this post&hellip;</option>{Object.entries(p.labels.refine).map(([k, l]) => <option key={k} value={k}>{l as string}</option>)}<option value="regenerate">Write a new version</option><option value="_aud">Change audience&hellip;</option><option value="_plat">Change platform&hellip;</option></select>
            <label style={{ fontSize: '0.85rem' }}><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} /> Use AI (the changes above always need AI; a new version can use the free template)</label>
            {how === '_aud' && <Sel value="" onChange={(v) => v && act('content', { action: 'regenerate', id: c.id, audience: v, useAi: ai }, 'Rewritten for the new audience.')} opts={p.labels.audiences} all="Choose audience" />}
            {how === '_plat' && <Sel value="" onChange={(v) => v && act('content', { action: 'regenerate', id: c.id, platform: v, useAi: ai }, 'Rewritten for the new platform.')} opts={p.labels.platforms} all="Choose platform" />}
            {how && !how.startsWith('_') && <button className="btn btn--small btn--accent" onClick={() => act('content', how === 'regenerate' ? { action: 'regenerate', id: c.id, useAi: ai } : { action: 'refine', how, id: c.id }, 'Done.')}>Apply</button>}
          </div>}
          <div className="hero__actions">
            <button className="btn btn--small btn--ghost" onClick={() => copy(full, (m) => say(m), 'Text and hashtags')}>Copy text</button>
            <button className="btn btn--small btn--ghost" onClick={() => copy(edit.hashtags, (m) => say(m), 'Hashtags')}>Copy hashtags</button>
            {c.image_spec?.prompt && <button className="btn btn--small btn--ghost" onClick={() => copy(c.image_spec.prompt, (m) => say(m), 'Image prompt')}>Copy image prompt</button>}
            <button className="btn btn--small btn--ghost" onClick={() => act('content', { action: 'duplicate', id: c.id }, 'Duplicated as a new draft.')}>Duplicate</button>
            {c.status !== 'ARCHIVED' && <button className="btn btn--small btn--ghost" onClick={() => act('approve', { id: c.id, to: 'ARCHIVED' }, 'Archived.')}>Archive</button>}
          </div>
          {c.image_spec && <details><summary>Image brief ({c.image_spec.ratio})</summary><div className="sg-sub"><p><strong>Idea:</strong> {c.image_spec.concept}</p><p><strong>Look:</strong> {c.image_spec.visual}</p><p><strong>Headline on the image:</strong> {c.image_spec.headline}<br /><strong>Small text:</strong> {c.image_spec.support}<br /><strong>Call to action:</strong> {c.image_spec.cta}</p><p><strong>Prompt for an image tool:</strong> {c.image_spec.prompt}</p><p style={{ color: 'var(--slate)' }}>{p.imageNote}</p></div></details>}
          {det && (<>
            <div className="sg-checks">{det.checks.map((k: any) => <details key={k.id} open={k.level !== 'ok'}><summary><span className="sg-dot" style={{ background: LV[k.level] }} /> {k.label}: {k.level === 'ok' ? 'no problems found' : k.level === 'warn' ? 'check this' : 'serious'}</summary>{k.notes.map((n: string, i: number) => <p key={i} className="sg-note">{n}</p>)}</details>)}</div>
            <p style={{ fontSize: '0.82rem' }}>{det.quality.label}: <strong>{det.quality.score}/100</strong>. It is a guide only; it can be wrong and does not replace your judgement.</p>
            <p style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}><strong>Tracked link:</strong> {det.utm ? <>{det.utm} <button className="btn btn--small btn--ghost" onClick={() => copy(det.utm, (m) => say(m), 'Link')}>Copy link</button></> : 'Not available: enter your website address in Settings first.'}</p>
            <details><summary>Publishing checklist (manual workflow)</summary><ol>{det.checklist.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol></details>
          </>)}
          {!locked && moves[c.status]?.length > 0 && det && (<div className="sg-box">
            {c.status === 'REVIEW' && det.checks.some((k: any) => k.level !== 'ok') && <><label style={{ fontSize: '0.88rem' }}><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I have read the warnings</label><input className="field" placeholder="Reason (needed to approve a serious warning, or to reject)" value={reason} onChange={(e) => setReason(e.target.value)} /></>}
            {c.status === 'REVIEW' && !det.checks.some((k: any) => k.level !== 'ok') && <input className="field" placeholder="Reason (needed only to reject)" value={reason} onChange={(e) => setReason(e.target.value)} />}
            <div className="hero__actions">{moves[c.status].map(([to, l]) => <button key={to} className={`btn btn--small ${to === 'APPROVED' ? 'btn--accent' : 'btn--ghost'}`} disabled={dirty} onClick={() => act('approve', { id: c.id, to, reason, acknowledged: ack }, `${l} done.`)}>{l}</button>)}</div>
            {dirty && <p className="sg-note">Save your changes first.</p>}
          </div>)}
          {c.status === 'APPROVED' && (<div className="sg-box"><strong>Posted it yourself?</strong><p style={{ fontSize: '0.85rem' }}>{p.publishers.find((x: any) => x.platform.toLowerCase() === c.platform)?.note}</p><input className="field" placeholder="Address of the post (https://...)" value={url} onChange={(e) => setUrl(e.target.value)} /><button className="btn btn--small btn--primary" onClick={() => act('publish', { id: c.id, externalUrl: url }, 'Recorded as published (by you).')}>Mark as published</button></div>)}
          {c.status === 'PUBLISHED' && (<div className="sg-box"><p style={{ fontSize: '0.88rem' }}>Published (recorded by you) {ago(c.published_at)}{c.external_url ? <> &middot; <a href={c.external_url} target="_blank" rel="noopener noreferrer">open post</a></> : ' · no address saved'}.</p>
            <strong>Enter results</strong><p style={{ fontSize: '0.82rem' }}>Copy the numbers from the platform. Leave blank what you do not know (it will show as &ldquo;Not available&rdquo;, never 0).</p>
            <div className="sg-grid"><label className="sg-m"><span>Date of these numbers</span><input type="date" className="field" value={mv.metric_date} onChange={(e) => setMv({ ...mv, metric_date: e.target.value })} /></label>{[['impressions', 'Impressions'], ['reach', 'Reach'], ['likes', 'Likes / reactions'], ['comments', 'Comments'], ['shares', 'Shares / reposts'], ['saves', 'Saves'], ['clicks', 'Link clicks'], ['profile_visits', 'Profile visits'], ['followers_gained', 'Followers gained'], ['leads', 'Leads'], ['registrations', 'Sign-ups'], ['conversions', 'Customers'], ['revenue_inr', 'Revenue (₹)']].map(([k, l]) => metrics(k, l))}</div>
            <button className="btn btn--small btn--primary" onClick={() => act('metrics', { id: c.id, values: mv }, 'Results saved.').then((r: any) => r && setMv({ metric_date: '' }))}>Save results</button></div>)}
          {c.status !== 'PUBLISHED' && <ExperimentLink c={c} act={act} />}
          {det && det.log.length > 0 && <details><summary>History ({det.log.length})</summary>{det.log.map((l: any, i: number) => <p key={i} className="sg-note">{new Date(l.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} &middot; {l.actor} &middot; {l.action}{l.metadata?.previous ? ` ${l.metadata.previous} → ${l.metadata.next}` : ''}{l.metadata?.reason ? ` (${l.metadata.reason})` : ''}</p>)}</details>}
          {c.ai_meta && <p className="sg-note">AI record: {c.ai_meta.provider ?? 'provider not recorded'}{c.ai_meta.model ? ` / ${c.ai_meta.model}` : ''} &middot; prompt {c.ai_meta.promptVersion} &middot; {ago(c.ai_meta.at)}. Cost is in the AI usage pages.</p>}
        </div>
      )}
    </div>
  );
}
function ExperimentLink({ c, act }: any) {
  const [exps, setExps] = useState<any[] | null>(null); const [e, setE] = useState(c.experiment_id ?? ''); const [v, setV] = useState(c.variant ?? '');
  useEffect(() => { get('experiments').then((r: any) => !r.error && setExps(r.data)); }, []);
  if (!exps || exps.length === 0) return null;
  return (<details><summary>A/B test</summary><div className="sg-grid"><select className="field" value={e} onChange={(x) => setE(x.target.value)}><option value="">Not in a test</option>{exps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><input className="field" placeholder="Variant name (A, B...)" value={v} onChange={(x) => setV(x.target.value)} /><button className="btn btn--small btn--ghost" onClick={() => act('experiments', { action: 'variant', contentId: c.id, experimentId: e, variant: v }, 'Saved.')}>Save</button></div></details>);
}

function CalendarTab({ content, act, busy, p, campaigns, today, cards }: any) {
  const [days, setDays] = useState(7); const [start, setStart] = useState(today); const [camp, setCamp] = useState('');
  const dated = content.filter((c: any) => c.planned_date).sort((a: any, b: any) => (a.planned_date + a.platform).localeCompare(b.planned_date + b.platform));
  const groups: Record<string, any[]> = {}; dated.forEach((c: any) => (groups[c.planned_date] ??= []).push(c));
  const shift = (c: any, d: number) => { const t = new Date(`${c.planned_date}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + d); return act('content', { action: 'edit', id: c.id, patch: { planned_date: t.toISOString().slice(0, 10) } }, 'Moved.'); };
  return (<section>
    <div className="sg-box"><h3>Make a calendar</h3><p style={{ fontSize: '0.88rem' }}>One draft a day, platforms taking turns, topics and audiences rotating. Days that already have a post for that platform are skipped, so nothing is overwritten. It uses templates, so it costs nothing.</p>
      <div className="sg-grid"><select className="field" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select><input type="date" className="field" value={start} onChange={(e) => setStart(e.target.value)} /><select className="field" value={camp} onChange={(e) => setCamp(e.target.value)}><option value="">No campaign</option>{campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <button className="btn btn--accent" disabled={busy} onClick={() => act('calendar', { days, start, campaignId: camp }, 'Calendar drafts added.')}>Generate {days}-day calendar</button> <a className="btn btn--small btn--ghost" href="/api/admin/social-growth/export?kind=calendar">Download calendar (CSV)</a></div>
    <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Use the arrows on a post&rsquo;s date line to move it a day earlier or later (drag and drop is not built).</p>
    {Object.keys(groups).length === 0 && <p style={{ color: 'var(--slate)' }}>No dated posts yet.</p>}
    {Object.entries(groups).map(([d, list]) => (<div key={d}><h4 style={{ margin: '1rem 0 0.3rem' }}>{new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}{d === today ? ' (today)' : ''}</h4>
      {list.map((c) => (<div key={c.id}><div className="sg-shift"><button className="btn btn--small btn--ghost" aria-label="One day earlier" onClick={() => shift(c, -1)} disabled={c.status === 'PUBLISHED'}>&larr;</button><button className="btn btn--small btn--ghost" aria-label="One day later" onClick={() => shift(c, 1)} disabled={c.status === 'PUBLISHED'}>&rarr;</button></div>{cards(c)}</div>))}</div>))}
  </section>);
}

function CampaignTab({ campaigns, analytics, act, p }: any) {
  const [c, setC] = useState<any>({ name: '', objective: '', audience: '', start_date: '', end_date: '', budget_inr: '', notes: '' });
  const [x, setX] = useState({ name: '', hypothesis: '', campaignId: '' }); const [exps, setExps] = useState<any[]>([]);
  useEffect(() => { get('experiments').then((r: any) => !r.error && setExps(r.data)); }, [campaigns.length]);
  const a = analytics?.attribution;
  return (<section>
    <div className="sg-box"><h3>New campaign</h3>
      <p style={{ fontSize: '0.85rem' }}>Ideas: CBSE 2027, Free Core, Founding Family, Founding Tutor, Founding Coaching Centre, Baseline Assessment, Handwritten Mock Evaluation, Student Engagement, Parent Awareness, Tutor Partnership, Coaching Centre Partnership, International CBSE, Referral Campaign.</p>
      <div className="sg-grid"><input className="field" placeholder="Name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /><input className="field" placeholder="Objective" value={c.objective} onChange={(e) => setC({ ...c, objective: e.target.value })} /><Sel value={c.audience} onChange={(v) => setC({ ...c, audience: v })} opts={p.labels.audiences} all="Target audience" />
        <label className="sg-m"><span>Start</span><input type="date" className="field" value={c.start_date} onChange={(e) => setC({ ...c, start_date: e.target.value })} /></label><label className="sg-m"><span>End</span><input type="date" className="field" value={c.end_date} onChange={(e) => setC({ ...c, end_date: e.target.value })} /></label><input className="field" inputMode="numeric" placeholder="Budget in rupees (if any)" value={c.budget_inr} onChange={(e) => setC({ ...c, budget_inr: e.target.value })} /></div>
      <button className="btn btn--primary" onClick={() => act('campaigns', { campaign: c }, 'Campaign saved.').then((r: any) => r && setC({ name: '', objective: '', audience: '', start_date: '', end_date: '', budget_inr: '', notes: '' }))}>Save campaign</button></div>
    <h3>Campaigns</h3>{campaigns.length === 0 && <p style={{ color: 'var(--slate)' }}>None yet.</p>}
    <div className="sg-table">{campaigns.map((k: any) => { const r = a?.campaigns?.find((z: any) => z.slug === k.slug); return (<div key={k.id} className="sg-card"><strong>{k.name}</strong> <span style={{ fontSize: '0.82rem' }}>({k.slug}) {k.start_date ? `· ${k.start_date}` : ''}{k.end_date ? ` to ${k.end_date}` : ''}</span>
      <p style={{ fontSize: '0.88rem', margin: '0.3rem 0' }}>Posts: {r ? `${r.posts} (${r.published} published)` : '…'} &middot; Visits from tracked links: {r ? num(r.visits) : '…'} &middot; Sign-ups from links: {r ? num(r.registrations) : '…'} &middot; Leads (entered): {r ? num(r.leads) : '…'} &middot; Customers (entered): {r ? num(r.customers) : '…'} &middot; Revenue (entered): {r ? inr(r.revenue) : '…'} &middot; Budget: {inr(k.budget_inr)} &middot; Cost per lead: {r ? inr(r.cpl) : '…'} &middot; Cost per customer: {r ? inr(r.cpa) : '…'}</p></div>); })}</div>
    {a && <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>{a.note}</p>}
    <a className="btn btn--small btn--ghost" href="/api/admin/social-growth/export?kind=campaigns">Download campaign data (CSV)</a>
    <div className="sg-box"><h3>A/B tests</h3><p style={{ fontSize: '0.85rem' }}>Make an experiment, then open a draft post and choose the experiment and a variant name (A, B). After both are published and results entered, compare them below and declare a winner.</p>
      <div className="sg-grid"><input className="field" placeholder="Name e.g. Baseline: problem hook vs parent hook" value={x.name} onChange={(e) => setX({ ...x, name: e.target.value })} /><input className="field" placeholder="What are you testing?" value={x.hypothesis} onChange={(e) => setX({ ...x, hypothesis: e.target.value })} /><select className="field" value={x.campaignId} onChange={(e) => setX({ ...x, campaignId: e.target.value })}><option value="">No campaign</option>{campaigns.map((k: any) => <option key={k.id} value={k.id}>{k.name}</option>)}</select></div>
      <button className="btn btn--primary" onClick={() => act('experiments', { action: 'create', ...x }, 'Experiment created.').then((r: any) => r && setX({ name: '', hypothesis: '', campaignId: '' }))}>Create experiment</button>
      {exps.map((e) => <ExperimentRow key={e.id} e={e} act={act} />)}</div>
  </section>);
}
function ExperimentRow({ e, act }: any) {
  const [d, setD] = useState<any>(null); const [note, setNote] = useState('');
  useEffect(() => { get('content', '?limit=500').then(async (r) => { if (r.error) return; setD({ posts: r.data.content.filter((c: any) => c.experiment_id === e.id), metrics: r.data.metrics }); }); }, [e.id, e.status]);
  const tot = (id: string) => { const rows = (d?.metrics ?? []).filter((m: any) => m.content_id === id); const s = (k: string) => { const v = rows.map((r: any) => r[k]).filter((x: any) => x !== null && x !== undefined); return v.length ? v.reduce((a: number, b: number) => a + Number(b), 0) : null; }; return { imp: s('impressions'), clicks: s('clicks'), leads: s('leads'), reg: s('registrations'), conv: s('conversions'), eng: s('likes') === null && s('comments') === null && s('shares') === null ? null : (s('likes') ?? 0) + (s('comments') ?? 0) + (s('shares') ?? 0) }; };
  return (<div className="sg-card"><strong>{e.name}</strong> <span style={{ fontSize: '0.82rem' }}>({e.status}{e.winner_content_id ? ', winner chosen' : ''})</span>{e.hypothesis && <p style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}>{e.hypothesis}</p>}
    {(d?.posts ?? []).map((c: any) => { const t = tot(c.id); return (<p key={c.id} style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}><strong>Variant {c.variant ?? '?'}</strong> ({c.platform}, {c.status.toLowerCase()}) &middot; impressions {num(t.imp)} &middot; engagement {num(t.eng)} &middot; clicks {num(t.clicks)} &middot; leads {num(t.leads)} &middot; sign-ups {num(t.reg)} &middot; customers {num(t.conv)} {e.winner_content_id === c.id ? <strong>&middot; WINNER</strong> : e.status !== 'finished' && c.status === 'PUBLISHED' ? <button className="btn btn--small btn--ghost" onClick={() => act('experiments', { action: 'winner', experimentId: e.id, contentId: c.id, note }, 'Winner recorded.')}>Declare winner</button> : null}</p>); })}
    {e.status !== 'finished' && <input className="field" placeholder="Why did it win? (optional)" value={note} onChange={(x) => setNote(x.target.value)} />}<p className="sg-note">Small tests rarely prove anything. Treat a result as a hint until it repeats.</p></div>);
}

function ResultsTab({ analytics, p, overview, act }: any) {
  const [obs, setObs] = useState<any>({ competitor: '', platform: '', topic: '', content_type: '', observation: '', url: '', observed_on: '', notes: '' });
  const a = analytics; if (!a) return <p style={{ color: 'var(--slate)' }}>Loading&hellip;</p>;
  const i = a.insights; const c = a.costs; const al = a.allowance;
  const Top = ({ l, g }: any) => <p style={{ margin: '0.2rem 0' }}><strong>{l}:</strong> {g ? `${p.labels.platforms[g.key] ?? p.labels.audiences[g.key] ?? p.labels.types[g.key] ?? g.key} (${g.posts} post${g.posts === 1 ? '' : 's'})` : 'Not enough data yet'}</p>;
  return (<section>
    <div className="sg-box"><h3>What the numbers say so far</h3>
      {!i.enoughData && <p className="alert">Only {i.measuredPosts} published post(s) have results. Below 5, any pattern is likely chance, so the lines below are hints, not findings.</p>}
      <Top l="Top platform" g={i.topPlatform} /><Top l="Top topic" g={i.topTopic} /><Top l="Top audience" g={i.topAudience} /><Top l="Top content type" g={i.topType} /><Top l="Top call to action" g={i.topCta} />
      <p style={{ margin: '0.2rem 0' }}><strong>Posting frequency:</strong> {i.perWeek === null ? 'Not available (need 2 published posts)' : `${i.perWeek} per week`}</p>
      {i.repeat.length > 0 && <p style={{ margin: '0.2rem 0' }}><strong>Worth repeating:</strong> {i.repeat.join(', ')}</p>}{i.stop.length > 0 && <p style={{ margin: '0.2rem 0' }}><strong>Consider stopping or changing:</strong> {i.stop.join(', ')}</p>}
      <h4>Recommendations</h4><ul>{i.recommendations.map((r: string, k: number) => <li key={k}>{r}</li>)}{i.recommendations.length === 0 && <li>No specific recommendation yet.</li>}</ul>
      <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Ranking puts leads, sign-ups and customers first and likes last. Nothing is guessed: a number nobody entered shows as &ldquo;Not available&rdquo;.</p>
      <a className="btn btn--small btn--ghost" href="/api/admin/social-growth/export?kind=metrics">Download results (CSV)</a> <a className="btn btn--small btn--ghost" href="/api/admin/social-growth/export?kind=leads">Download leads and conversions (CSV)</a></div>
    <div className="sg-box"><h3>AI cost for social content</h3>
      <p>This month: {c.month.calls} AI writes{c.month.failed ? `, ${c.month.failed} failed` : ''} &middot; cost {c.month.inr === null ? 'Not available (no cost recorded)' : inr(c.month.inr)}. Today: {al.today} of {p.settings.dailyAiLimit} allowed.</p>
      {c.byPlatform.length > 0 && <p style={{ fontSize: '0.88rem' }}>By platform: {c.byPlatform.map((x: any) => `${p.labels.platforms[x.key] ?? x.key}: ${x.calls} (${x.inr === null ? 'cost n/a' : inr(x.inr)})`).join(' · ')}</p>}
      {c.byCampaign.length > 0 && <p style={{ fontSize: '0.88rem' }}>By campaign: {c.byCampaign.map((x: any) => `${x.key}: ${x.calls} (${x.inr === null ? 'cost n/a' : inr(x.inr)})`).join(' · ')}</p>}
      <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Costs come from the same AI usage log as everything else. Per-post cost is shown on each post&rsquo;s AI record. Full detail: <a href="/admin/ai-economics">AI economics</a> and <a href="/admin/ai-requests">AI requests</a> (feature &ldquo;social_content&rdquo;).</p></div>
    <div className="sg-box"><h3>Competitor and market notes</h3><p style={{ fontSize: '0.85rem' }}>Type what you saw yourself. Sahayak does not scrape any website or social platform.</p>
      <div className="sg-grid"><input className="field" placeholder="Who" value={obs.competitor} onChange={(e) => setObs({ ...obs, competitor: e.target.value })} /><Sel value={obs.platform} onChange={(v) => setObs({ ...obs, platform: v })} opts={p.labels.platforms} all="Platform" /><input className="field" placeholder="Topic" value={obs.topic} onChange={(e) => setObs({ ...obs, topic: e.target.value })} /><input className="field" placeholder="Content type" value={obs.content_type} onChange={(e) => setObs({ ...obs, content_type: e.target.value })} /><input className="field" placeholder="Address (https://...)" value={obs.url} onChange={(e) => setObs({ ...obs, url: e.target.value })} /><input type="date" className="field" value={obs.observed_on} onChange={(e) => setObs({ ...obs, observed_on: e.target.value })} /></div>
      <textarea className="field" rows={2} placeholder="What did you notice?" value={obs.observation} onChange={(e) => setObs({ ...obs, observation: e.target.value })} />
      <button className="btn btn--small btn--primary" onClick={() => act('settings', { observation: obs }, 'Saved.').then((r: any) => r && setObs({ competitor: '', platform: '', topic: '', content_type: '', observation: '', url: '', observed_on: '', notes: '' }))}>Save note</button></div>
  </section>);
}

function SettingsTab({ p, settings, setSettings, pillars, setPillars, act, say }: any) {
  const [s, setS] = useState<any>(settings); const [np, setNp] = useState('');
  const save = async () => { const r = await act('settings', { settings: s }, 'Settings saved.'); if (r) setSettings(r); };
  return (<section>
    <div className="sg-box"><h3>Controls</h3>
      <label><input type="checkbox" checked={s.aiEnabled} onChange={(e) => setS({ ...s, aiEnabled: e.target.checked })} /> AI writing allowed (templates always work)</label>
      <div className="sg-grid"><label className="sg-m"><span>AI writes per day</span><input className="field" inputMode="numeric" value={s.dailyAiLimit} onChange={(e) => setS({ ...s, dailyAiLimit: e.target.value })} /></label><label className="sg-m"><span>AI writes per month</span><input className="field" inputMode="numeric" value={s.monthlyAiLimit} onChange={(e) => setS({ ...s, monthlyAiLimit: e.target.value })} /></label><label className="sg-m"><span>Stop AI after this monthly spend (&#8377;, blank = no cap)</span><input className="field" inputMode="decimal" value={s.maxMonthlyAiSpendInr ?? ''} onChange={(e) => setS({ ...s, maxMonthlyAiSpendInr: e.target.value })} /></label>
        <label className="sg-m"><span>Default language</span><Sel value={s.defaultLanguage} onChange={(v) => setS({ ...s, defaultLanguage: v })} opts={p.labels.languages} /></label><label className="sg-m"><span>Default audience</span><Sel value={s.defaultAudience} onChange={(v) => setS({ ...s, defaultAudience: v })} opts={p.labels.audiences} /></label><label className="sg-m"><span>Default platform</span><Sel value={s.defaultPlatform} onChange={(v) => setS({ ...s, defaultPlatform: v })} opts={p.labels.platforms} /></label></div>
      <input className="field" placeholder="Default call to action (optional)" value={s.defaultCta} onChange={(e) => setS({ ...s, defaultCta: e.target.value })} />
      <label className="sg-m"><span>Your website address for tracked links (https://...)</span><input className="field" placeholder="https://your-site.example" value={s.siteUrl} onChange={(e) => setS({ ...s, siteUrl: e.target.value })} /></label>
      <label className="sg-m"><span>Landing page path</span><input className="field" value={s.landingPath} onChange={(e) => setS({ ...s, landingPath: e.target.value })} /></label>
      <p style={{ fontSize: '0.85rem' }}>Which AI model writes the post is decided by the app&rsquo;s AI gateway (turn providers on or off at <a href="/admin/ai-infrastructure">AI infrastructure</a>); nothing here assumes any provider is free. Automatic publishing: <strong>off, and not possible</strong> because no platform is connected. Automatic daily generation: <strong>not built</strong> (you press the button).</p>
      <button className="btn btn--primary" onClick={save}>Save settings</button></div>
    <div className="sg-box"><h3>Content pillars</h3>
      {pillars.map((x: any) => <PillarRow key={x.id ?? x.name} x={x} act={act} setPillars={setPillars} />)}
      <div className="sg-grid"><input className="field" placeholder="New pillar" value={np} onChange={(e) => setNp(e.target.value)} /><button className="btn btn--small btn--primary" onClick={() => act('settings', { pillar: { name: np } }, 'Pillar added.').then((r: any) => { if (r) { setPillars(r); setNp(''); } })}>Add pillar</button></div></div>
    <div className="sg-box"><h3>Platform connections</h3>{p.publishers.map((x: any) => <p key={x.platform} style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>{x.platform}:</strong> {x.connected ? 'Connected' : 'Integration not connected'}. {x.note}</p>)}<p style={{ fontSize: '0.88rem' }}><strong>Image generator:</strong> {p.imageNote}</p><p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Ready for later, not built: {p.futureChannels.join(', ')}. Adding one means adding one adapter; the rest of the engine stays as it is.</p></div>
  </section>);
}
function PillarRow({ x, act, setPillars }: any) {
  const [n, setN] = useState(x.name);
  return (<div className="sg-grid" style={{ alignItems: 'center' }}><input className="field" value={n} disabled={!x.id} onChange={(e) => setN(e.target.value)} /><label style={{ fontSize: '0.88rem' }}><input type="checkbox" checked={x.active} disabled={!x.id} onChange={(e) => act('settings', { pillar: { id: x.id, name: n, active: e.target.checked } }).then((r: any) => r && setPillars(r))} /> Active</label>{x.id && n !== x.name && <button className="btn btn--small btn--ghost" onClick={() => act('settings', { pillar: { id: x.id, name: n, active: x.active } }, 'Renamed.').then((r: any) => r && setPillars(r))}>Rename</button>}</div>);
}
