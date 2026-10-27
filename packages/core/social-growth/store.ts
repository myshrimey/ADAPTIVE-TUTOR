import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_PILLARS, type DraftInput, type SocialContent, type SocialStatus, type AiMeta, type ImageSpec } from './constants';
import { moveProblem } from './status';
import { runChecks, hasRisk, hasWarnings, socialQuality } from './checks';
import { slugify } from './utm';
import { istToday, socialAddDays } from './plan';
import { socialTotals, buildInsights, outcomeScore, type MetricRow, type ContentLite } from './insights';
import type { HashtagPool } from './hashtags';
import type { SocialSettings } from './settings';

const friendly = (e: any, what: string) => new Error(`Could not ${what}. ${e?.message && /not_authorized/.test(e.message) ? '' : 'Please try again; if it keeps failing, run the latest database update (0046).'}`.trim());
export async function audit(service: SupabaseClient, entityType: string, entityId: string | null, action: string, actor: string, metadata: Record<string, unknown> = {}) {
  try { await service.from('social_audit_log').insert({ entity_type: entityType, entity_id: entityId, action, actor, metadata }); } catch { /* the audit write must never block the work */ }
}
const ACTOR_NOTE = 'Recorded with the signed-in admin\'s email.';
export { ACTOR_NOTE };

// ---------- pillars, hashtags ----------
export async function listPillars(service: SupabaseClient): Promise<{ id: string | null; name: string; active: boolean; sort: number }[]> {
  try { const { data, error } = await service.from('social_pillars').select('id, name, active, sort').order('sort', { ascending: true }); if (error) throw error; if (data?.length) return data as any; } catch { /* fall through */ }
  return DEFAULT_PILLARS.map((name, i) => ({ id: null, name, active: true, sort: i + 1 }));
}
export async function savePillar(service: SupabaseClient, actor: string, p: { id?: string; name: string; active?: boolean }) {
  const name = String(p.name ?? '').trim().slice(0, 60); if (name.length < 2) throw new Error('Give the pillar a name.');
  if (p.id) { const { error } = await service.from('social_pillars').update({ name, active: p.active !== false }).eq('id', p.id); if (error) throw friendly(error, 'save the pillar'); }
  else { const { data: last } = await service.from('social_pillars').select('sort').order('sort', { ascending: false }).limit(1); const sort = ((last as any)?.[0]?.sort ?? 0) + 1; const { error } = await service.from('social_pillars').insert({ name, active: true, sort }); if (error) throw friendly(error, 'add the pillar'); }
  await audit(service, 'pillar', p.id ?? null, p.id ? 'update' : 'create', actor, { name, active: p.active !== false });
}
export async function loadHashtagPool(service: SupabaseClient): Promise<HashtagPool> {
  try { const { data } = await service.from('social_hashtags').select('kind, tag').eq('active', true); const pool: HashtagPool = {}; for (const r of (data ?? []) as any[]) (pool[r.kind as keyof HashtagPool] ??= []).push(r.tag); return pool; } catch { return {}; }
}

// ---------- campaigns ----------
export interface Campaign { id: string; slug: string; name: string; objective: string | null; audience: string | null; start_date: string | null; end_date: string | null; budget_inr: number | null; status: string; notes: string | null }
export async function listCampaigns(service: SupabaseClient): Promise<Campaign[]> {
  const { data } = await service.from('social_campaigns').select('*').order('created_at', { ascending: false }); return (data ?? []) as Campaign[];
}
const dOrNull = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
export async function saveCampaign(service: SupabaseClient, actor: string, c: Partial<Campaign> & { name: string }) {
  const name = String(c.name ?? '').trim().slice(0, 80); if (name.length < 2) throw new Error('Give the campaign a name.');
  const row: any = { name, objective: String(c.objective ?? '').slice(0, 300) || null, audience: String(c.audience ?? '').slice(0, 60) || null, start_date: dOrNull(c.start_date), end_date: dOrNull(c.end_date), notes: String(c.notes ?? '').slice(0, 1000) || null, status: ['active', 'paused', 'finished'].includes(String(c.status)) ? c.status : 'active' };
  const b = c.budget_inr === null || c.budget_inr === undefined || (c.budget_inr as any) === '' ? null : Number(c.budget_inr); row.budget_inr = b !== null && Number.isFinite(b) && b >= 0 ? b : null;
  if (row.start_date && row.end_date && row.end_date < row.start_date) throw new Error('The end date is before the start date.');
  if (c.id) { const { error } = await service.from('social_campaigns').update(row).eq('id', c.id); if (error) throw friendly(error, 'save the campaign'); await audit(service, 'campaign', c.id, 'update', actor, { name }); return c.id; }
  let slug = slugify(name); const { data: ex } = await service.from('social_campaigns').select('slug').like('slug', `${slug}%`); const taken = new Set((ex ?? []).map((r: any) => r.slug)); let n = 2; const base = slug; while (taken.has(slug)) slug = `${base}-${n++}`;
  const { data, error } = await service.from('social_campaigns').insert({ ...row, slug, created_by: actor }).select('id').single(); if (error) throw friendly(error, 'create the campaign');
  await audit(service, 'campaign', (data as any).id, 'create', actor, { name, slug }); return (data as any).id as string;
}

// ---------- content ----------
export interface ContentFilter { platform?: string; audience?: string; pillar?: string; campaignId?: string; status?: string; language?: string; q?: string; from?: string; to?: string; archived?: boolean; limit?: number }
export async function listContent(service: SupabaseClient, f: ContentFilter = {}): Promise<SocialContent[]> {
  let q = service.from('social_content').select('*');
  if (f.platform) q = q.eq('platform', f.platform); if (f.audience) q = q.eq('audience', f.audience); if (f.pillar) q = q.eq('pillar', f.pillar);
  if (f.campaignId) q = q.eq('campaign_id', f.campaignId); if (f.status) q = q.eq('status', f.status); if (f.language) q = q.eq('language', f.language);
  if (f.from) q = q.gte('planned_date', f.from); if (f.to) q = q.lte('planned_date', f.to);
  q = q.eq('archived', f.archived === true);
  const { data, error } = await q.order('planned_date', { ascending: true, nullsFirst: false }).limit(f.limit ?? 300); if (error) throw friendly(error, 'load the posts');
  let rows = (data ?? []) as SocialContent[];
  if (f.q) { const s = f.q.toLowerCase(); rows = rows.filter((r) => [r.topic, r.hook, r.body, r.cta].some((t) => String(t ?? '').toLowerCase().includes(s))); }
  return rows;
}
export async function getContent(service: SupabaseClient, id: string): Promise<SocialContent> {
  const { data, error } = await service.from('social_content').select('*').eq('id', id).maybeSingle(); if (error || !data) throw new Error('That post was not found.'); return data as SocialContent;
}
export interface NewContent { input: DraftInput; hook: string; body: string; cta: string; hashtags: string[]; image: ImageSpec; topic: string; plannedDate?: string | null; campaignId?: string | null; source: 'template' | 'ai' | 'manual'; aiMeta?: AiMeta | null; status?: SocialStatus; parentId?: string | null; experimentId?: string | null; variant?: string | null }
export async function insertContent(service: SupabaseClient, actor: string, n: NewContent): Promise<SocialContent> {
  const date = (n.plannedDate ?? istToday()).replace(/-/g, ''); let slug = '';
  slug = `${n.input.platform.slice(0, 2)}-${date}-${Math.random().toString(36).slice(2, 6)}`;
  const base = { platform: n.input.platform, body: n.body, hook: n.hook, cta: n.cta, hashtags: n.hashtags, image: n.image, source: n.source, topic: n.topic };
  const quality = socialQuality(base as any);
  const { data, error } = await service.from('social_content').insert({
    slug, campaign_id: n.campaignId ?? null, experiment_id: n.experimentId ?? null, variant: n.variant ?? null, parent_id: n.parentId ?? null,
    platform: n.input.platform, audience: n.input.audience, objective: n.input.objective, pillar: n.input.pillar, content_type: n.input.contentType, scope: n.input.scope, topic: n.topic,
    hook: n.hook, body: n.body, cta: n.cta, hashtags: n.hashtags, image_spec: n.image, language: n.input.language ?? 'en', status: n.status ?? 'DRAFT', planned_date: n.plannedDate ?? null,
    source: n.source, ai_meta: n.aiMeta ?? null, quality, created_by: actor,
  }).select('*').single();
  if (error) throw friendly(error, 'save the post');
  await audit(service, 'content', (data as any).id, 'create', actor, { source: n.source, platform: n.input.platform, status: n.status ?? 'DRAFT' });
  return data as SocialContent;
}
const EDITABLE = ['hook', 'body', 'cta', 'topic', 'pillar', 'audience', 'objective', 'content_type', 'scope', 'language', 'planned_date', 'campaign_id', 'platform'] as const;
export async function editContent(service: SupabaseClient, actor: string, id: string, patch: Record<string, any>): Promise<SocialContent> {
  const cur = await getContent(service, id);
  if (cur.status === 'PUBLISHED') throw new Error('A published post cannot be edited. Duplicate it to make a new version.');
  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const k of EDITABLE) if (patch[k] !== undefined) row[k] = patch[k] === '' ? null : typeof patch[k] === 'string' ? patch[k].slice(0, k === 'body' ? 4000 : 300) : patch[k];
  if (patch.hashtags !== undefined) row.hashtags = (Array.isArray(patch.hashtags) ? patch.hashtags : String(patch.hashtags).split(/[\s,]+/)).map((t: any) => String(t).trim()).filter(Boolean).map((t: string) => (t.startsWith('#') ? t : `#${t}`)).slice(0, 30);
  if (patch.image_spec !== undefined && patch.image_spec && typeof patch.image_spec === 'object') row.image_spec = patch.image_spec;
  if (patch.aiMeta) row.ai_meta = patch.aiMeta; if (patch.source) row.source = patch.source;
  // Editing approved text sends it back to DRAFT: the founder approved those exact words.
  let reverted = false;
  if ((cur.status === 'APPROVED' || cur.status === 'REVIEW') && ['hook', 'body', 'cta', 'hashtags'].some((k) => row[k] !== undefined && JSON.stringify(row[k]) !== JSON.stringify((cur as any)[k]))) { row.status = 'DRAFT'; row.approved_by = null; row.approved_at = null; reverted = true; }
  const merged = { ...cur, ...row } as SocialContent; row.quality = socialQuality({ platform: merged.platform, body: merged.body, hook: merged.hook, cta: merged.cta, hashtags: merged.hashtags, topic: merged.topic, source: merged.source, image: merged.image_spec });
  const { data, error } = await service.from('social_content').update(row).eq('id', id).select('*').single(); if (error) throw friendly(error, 'save your changes');
  await audit(service, 'content', id, 'edit', actor, { fields: Object.keys(row).filter((k) => !['updated_at', 'quality'].includes(k)), revertedToDraft: reverted });
  if (reverted) await audit(service, 'content', id, 'status', actor, { previous: cur.status, next: 'DRAFT', reason: 'Text changed after it was sent for approval' });
  return data as SocialContent;
}
export interface MoveOpts { reason?: string; acknowledged?: boolean; externalUrl?: string; notes?: string }
export async function moveContent(service: SupabaseClient, actor: string, id: string, to: SocialStatus, o: MoveOpts = {}): Promise<SocialContent> {
  const cur = await getContent(service, id);
  const checks = runChecks({ platform: cur.platform, body: cur.body, hook: cur.hook, cta: cur.cta, hashtags: cur.hashtags, image: cur.image_spec, isTestimonial: cur.content_type === 'testimonial' });
  const problem = moveProblem({ from: cur.status, to, reason: o.reason, externalUrl: o.externalUrl, acknowledgedWarnings: o.acknowledged, hasWarnings: hasWarnings(checks.filter((c) => c.id !== 'safety' || c.level !== 'ok')), hasRisk: hasRisk(checks), body: cur.body });
  if (problem) throw new Error(problem);
  const now = new Date().toISOString(); const row: Record<string, any> = { status: to, updated_at: now };
  if (to === 'APPROVED') { row.approved_by = actor; row.approved_at = now; }
  if (to === 'DRAFT') { row.approved_by = null; row.approved_at = null; }
  if (to === 'PUBLISHED') { row.published_at = now; row.external_url = o.externalUrl?.trim() || null; }
  if (to === 'ARCHIVED') row.archived = true; if (cur.status === 'ARCHIVED') row.archived = false;
  const { data, error } = await service.from('social_content').update(row).eq('id', id).select('*').single(); if (error) throw friendly(error, 'change the status');
  await audit(service, 'content', id, 'status', actor, { previous: cur.status, next: to, reason: o.reason ?? null, warningsAcknowledged: o.acknowledged === true });
  if (to === 'PUBLISHED') {
    // A manual record: the founder says it was posted. No platform confirmed it.
    try { await service.from('social_publications').insert({ content_id: id, platform: cur.platform, publication_status: 'published_manually', published_at: now, external_url: o.externalUrl?.trim() || null, notes: o.notes ?? null, recorded_by: actor }); } catch { /* the content row already holds the facts */ }
  }
  return data as SocialContent;
}
export async function duplicateContent(service: SupabaseClient, actor: string, id: string): Promise<SocialContent> {
  const c = await getContent(service, id);
  return insertContent(service, actor, { input: { platform: c.platform as any, audience: c.audience, objective: c.objective, contentType: c.content_type, scope: c.scope, pillar: c.pillar ?? '', language: c.language, topic: c.topic ?? undefined }, hook: c.hook ?? '', body: c.body, cta: c.cta ?? '', hashtags: c.hashtags, image: c.image_spec as ImageSpec, topic: c.topic ?? '', campaignId: c.campaign_id, source: c.source, aiMeta: c.ai_meta, parentId: c.id, plannedDate: null });
}

// ---------- metrics ----------
const NUMS = ['impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks', 'profile_visits', 'followers_gained', 'leads', 'registrations', 'conversions', 'revenue_inr'] as const;
export async function recordMetrics(service: SupabaseClient, actor: string, contentId: string, v: Record<string, any>) {
  const c = await getContent(service, contentId);
  if (c.status !== 'PUBLISHED') throw new Error('Results can only be entered for a post marked as published.');
  const row: Record<string, any> = { content_id: contentId, platform: c.platform, metric_date: dOrNull(v.metric_date) ?? istToday(), entered_by: actor };
  for (const k of NUMS) { const raw = v[k]; if (raw === '' || raw === null || raw === undefined) continue; const n = Number(raw); if (!Number.isFinite(n) || n < 0) throw new Error(`"${k.replace(/_/g, ' ')}" must be a number, 0 or more. Leave it blank if you do not know it.`); row[k] = n; }
  if (Object.keys(row).length <= 4) throw new Error('Enter at least one number. Leave blank anything you do not know: blank is shown as "Not available", not zero.');
  const { error } = await service.from('social_metrics').upsert(row, { onConflict: 'content_id,metric_date' }); if (error) throw friendly(error, 'save the results');
  await audit(service, 'metrics', contentId, 'record', actor, { date: row.metric_date, fields: Object.keys(row).filter((k) => (NUMS as readonly string[]).includes(k)) });
}
export async function listMetrics(service: SupabaseClient): Promise<(MetricRow & { metric_date: string })[]> {
  const { data } = await service.from('social_metrics').select('*').order('metric_date', { ascending: false }).limit(5000); return (data ?? []) as any;
}

// ---------- experiments, observations ----------
export interface Experiment { id: string; campaign_id: string | null; name: string; hypothesis: string | null; status: string; winner_content_id: string | null; winner_note: string | null }
export async function listExperiments(service: SupabaseClient): Promise<Experiment[]> { const { data } = await service.from('social_experiments').select('*').order('created_at', { ascending: false }); return (data ?? []) as Experiment[]; }
export async function createExperiment(service: SupabaseClient, actor: string, e: { name: string; hypothesis?: string; campaignId?: string | null }) {
  const name = String(e.name ?? '').trim().slice(0, 100); if (name.length < 2) throw new Error('Give the experiment a name.');
  const { data, error } = await service.from('social_experiments').insert({ name, hypothesis: String(e.hypothesis ?? '').slice(0, 400) || null, campaign_id: e.campaignId || null }).select('id').single(); if (error) throw friendly(error, 'create the experiment');
  await audit(service, 'experiment', (data as any).id, 'create', actor, { name }); return (data as any).id as string;
}
export async function setVariant(service: SupabaseClient, actor: string, contentId: string, experimentId: string | null, variant: string | null) {
  const v = variant ? String(variant).trim().slice(0, 20) : null;
  const { error } = await service.from('social_content').update({ experiment_id: experimentId || null, variant: v }).eq('id', contentId); if (error) throw friendly(error, 'attach the variant');
  await audit(service, 'experiment', experimentId, 'variant', actor, { contentId, variant: v });
}
export async function declareWinner(service: SupabaseClient, actor: string, experimentId: string, contentId: string, note?: string) {
  const c = await getContent(service, contentId); if (c.experiment_id !== experimentId) throw new Error('That post is not part of this experiment.');
  const { error } = await service.from('social_experiments').update({ status: 'finished', winner_content_id: contentId, winner_note: String(note ?? '').slice(0, 400) || null }).eq('id', experimentId); if (error) throw friendly(error, 'save the winner');
  await audit(service, 'experiment', experimentId, 'winner', actor, { contentId, note: note ?? null });
}
export interface Observation { id: string; competitor: string; platform: string | null; topic: string | null; content_type: string | null; observation: string | null; url: string | null; observed_on: string | null; notes: string | null }
export async function listObservations(service: SupabaseClient): Promise<Observation[]> { const { data } = await service.from('social_observations').select('*').order('created_at', { ascending: false }).limit(200); return (data ?? []) as Observation[]; }
export async function addObservation(service: SupabaseClient, actor: string, o: Partial<Observation> & { competitor: string }) {
  const competitor = String(o.competitor ?? '').trim().slice(0, 80); if (!competitor) throw new Error('Write who you observed.');
  const url = o.url ? String(o.url).trim() : ''; if (url && !/^https:\/\/[^\s]+$/.test(url)) throw new Error('The address must start with https://');
  const { data, error } = await service.from('social_observations').insert({ competitor, platform: o.platform || null, topic: o.topic?.slice(0, 120) || null, content_type: o.content_type?.slice(0, 60) || null, observation: o.observation?.slice(0, 800) || null, url: url || null, observed_on: dOrNull(o.observed_on), notes: o.notes?.slice(0, 500) || null }).select('id').single();
  if (error) throw friendly(error, 'save the observation'); await audit(service, 'observation', (data as any).id, 'create', actor, { competitor });
}

// ---------- AI allowance and costs (the existing ai_usage ledger is the only cost record) ----------
export interface Allowance { ok: boolean; reason: string | null; today: number; month: number; spendInr: number | null }
export async function aiAllowance(service: SupabaseClient, s: SocialSettings, now = new Date()): Promise<Allowance> {
  const day = new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10); const dayStart = new Date(`${day}T00:00:00+05:30`).toISOString(); const monthStart = new Date(`${day.slice(0, 7)}-01T00:00:00+05:30`).toISOString();
  let rows: any[] = []; try { const { data } = await service.from('ai_usage').select('created_at, ok, cost_est_inr, economic_cost_inr, attempt_no').eq('feature', 'social_content').gte('created_at', monthStart).limit(20000); rows = data ?? []; } catch { rows = []; }
  const ok = rows.filter((r) => r.ok); const today = ok.filter((r) => r.created_at >= dayStart).length;
  const spend = rows.length ? rows.reduce((a, r) => a + Number(r.economic_cost_inr ?? r.cost_est_inr ?? 0), 0) : null;
  let reason: string | null = null;
  if (!s.aiEnabled) reason = 'AI writing is switched off in Settings. The ready-made templates still work.';
  else if (today >= s.dailyAiLimit) reason = `Today's limit of ${s.dailyAiLimit} AI writes is used up. Templates still work, or raise the limit in Settings.`;
  else if (ok.length >= s.monthlyAiLimit) reason = `This month's limit of ${s.monthlyAiLimit} AI writes is used up.`;
  else if (s.maxMonthlyAiSpendInr !== null && spend !== null && spend >= s.maxMonthlyAiSpendInr) reason = `This month's AI spend limit (₹${s.maxMonthlyAiSpendInr}) is reached.`;
  return { ok: reason === null, reason, today, month: ok.length, spendInr: spend };
}
export interface AiCosts { month: { calls: number; failed: number; inr: number | null }; byPlatform: { key: string; calls: number; inr: number | null }[]; byCampaign: { key: string; calls: number; inr: number | null }[]; perContent: Record<string, { calls: number; inr: number | null }> }
export async function aiCosts(service: SupabaseClient, content: SocialContent[], campaigns: Campaign[], now = new Date()): Promise<AiCosts> {
  const monthStart = `${new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 7)}-01T00:00:00+05:30`;
  let rows: any[] = []; try { const { data } = await service.from('ai_usage').select('ref, ok, cost_est_inr, economic_cost_inr, created_at').eq('feature', 'social_content').limit(20000); rows = data ?? []; } catch { rows = []; }
  const cost = (r: any) => (r.economic_cost_inr ?? r.cost_est_inr ?? null) as number | null;
  const by = new Map(content.map((c) => [c.id, c])); const camp = new Map(campaigns.map((c) => [c.id, c.name]));
  const add = (m: Map<string, { calls: number; inr: number | null }>, k: string, r: any) => { const e = m.get(k) ?? { calls: 0, inr: null }; e.calls += r.ok ? 1 : 0; const c = cost(r); if (c !== null) e.inr = (e.inr ?? 0) + Number(c); m.set(k, e); };
  const pf = new Map<string, { calls: number; inr: number | null }>(), cp = new Map<string, { calls: number; inr: number | null }>(), pc = new Map<string, { calls: number; inr: number | null }>();
  const mo = { calls: 0, failed: 0, inr: null as number | null };
  for (const r of rows) {
    const c = r.ref ? by.get(r.ref) : undefined;
    if (r.ref) add(pc, r.ref, r);
    if (c) { add(pf, c.platform, r); add(cp, c.campaign_id ? camp.get(c.campaign_id) ?? 'Unknown campaign' : 'No campaign', r); }
    if (r.created_at >= new Date(monthStart).toISOString()) { if (r.ok) mo.calls++; else mo.failed++; const k = cost(r); if (k !== null) mo.inr = (mo.inr ?? 0) + Number(k); }
  }
  const arr = (m: Map<string, any>) => [...m].map(([key, v]) => ({ key, ...v }));
  return { month: mo, byPlatform: arr(pf), byCampaign: arr(cp), perContent: Object.fromEntries(pc) };
}

// ---------- overview and attribution ----------
export interface Attribution { campaigns: { slug: string; name: string; visits: number | null; registrations: number | null; posts: number; published: number; leads: number | null; customers: number | null; revenue: number | null; cpl: number | null; cpa: number | null; budget: number | null }[]; note: string }
export async function attribution(service: SupabaseClient, campaigns: Campaign[], content: SocialContent[], metrics: MetricRow[], now = new Date()): Promise<Attribution> {
  const since = new Date(now.getTime() - 365 * 86400000).toISOString();
  let views: any[] | null = null, users: any[] | null = null;
  try { const { data, error } = await service.from('page_views').select('campaign, channel').not('campaign', 'is', null).gte('at', since).limit(50000); if (!error) views = data ?? []; } catch { views = null; }
  try { const { data, error } = await service.from('users').select('utm, created_at').not('utm', 'is', null).gte('created_at', since).limit(20000); if (!error) users = data ?? []; } catch { users = null; }
  const out: Attribution['campaigns'] = [];
  for (const c of campaigns) {
    const mine = content.filter((x) => x.campaign_id === c.id); const ids = new Set(mine.map((x) => x.id));
    const t = socialTotals(metrics.filter((m) => ids.has(m.content_id)));
    const visits = views ? views.filter((v) => v.campaign === c.slug).length : null;
    const regs = users ? users.filter((u) => u.utm && u.utm.c === c.slug && ['facebook', 'instagram', 'linkedin'].includes(String(u.utm.s))).length : null;
    const leads = t.leads; const customers = t.conversions; const budget = c.budget_inr;
    out.push({ slug: c.slug, name: c.name, visits, registrations: regs ?? t.registrations, posts: mine.length, published: mine.filter((x) => x.status === 'PUBLISHED').length, leads, customers, revenue: t.revenue, cpl: budget && leads ? budget / leads : null, cpa: budget && customers ? budget / customers : null, budget });
  }
  return { campaigns: out, note: 'Visits and sign-ups are counted from the tracked links (utm_campaign). Leads, customers and revenue are numbers you enter by hand; the app does not link payments to a post automatically. "Not available" means nothing was recorded.' };
}

export interface Overview {
  today: number; week: number; byStatus: Record<string, number>; failed: number | null; backlog: number; pending: number; publishedWeek: number;
  leadsWeek: number | null; signupsWeek: number | null; customersWeek: number | null; revenue: number | null; leads: number | null; registrations: number | null; conversions: number | null;
  bestPlatform: string | null; bestTopic: string | null; bestType: string | null; bestPost: { id: string; hook: string | null } | null; insightsReady: boolean;
}
export async function overview(service: SupabaseClient, now = new Date()): Promise<Overview> {
  const today = istToday(now); const weekEnd = socialAddDays(today, 6); const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  let content: SocialContent[] = []; let metrics: (MetricRow & { metric_date?: string })[] = [];
  try { const { data } = await service.from('social_content').select('*').eq('archived', false).limit(2000); content = (data ?? []) as any; } catch { content = []; }
  try { const { data } = await service.from('social_metrics').select('*').limit(5000); metrics = (data ?? []) as any; } catch { metrics = []; }
  const byStatus: Record<string, number> = {}; for (const c of content) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
  const lite: ContentLite[] = content.map((c) => ({ id: c.id, platform: c.platform, audience: c.audience, topic: c.topic, pillar: c.pillar, content_type: c.content_type, cta: c.cta, status: c.status, published_at: c.published_at, campaign_id: c.campaign_id }));
  const ins = buildInsights(lite, metrics as MetricRow[], now); const all = socialTotals(metrics as MetricRow[]); const wk = socialTotals(metrics.filter((m) => (m.metric_date ?? '') >= weekAgo) as MetricRow[]);
  const bestId = ins.best[0]?.id; const bp = bestId ? content.find((c) => c.id === bestId) : null;
  return {
    today: content.filter((c) => c.planned_date === today && c.status !== 'REJECTED').length, week: content.filter((c) => c.planned_date && c.planned_date >= today && c.planned_date <= weekEnd && c.status !== 'REJECTED').length,
    byStatus, failed: null, pending: byStatus.REVIEW ?? 0, publishedWeek: content.filter((c) => c.status === 'PUBLISHED' && (c.published_at ?? '') >= new Date(now.getTime() - 7 * 86400000).toISOString()).length, backlog: (byStatus.IDEA ?? 0) + (byStatus.DRAFT ?? 0) + (byStatus.REVIEW ?? 0) + (byStatus.APPROVED ?? 0),
    leadsWeek: wk.leads, signupsWeek: wk.registrations, customersWeek: wk.conversions, revenue: all.revenue, leads: all.leads, registrations: all.registrations, conversions: all.conversions,
    bestPlatform: ins.enoughData ? ins.topPlatform?.key ?? null : null, bestTopic: ins.enoughData ? ins.topTopic?.key ?? null : null, bestType: ins.enoughData ? ins.topType?.key ?? null : null,
    bestPost: bp ? { id: bp.id, hook: bp.hook } : null, insightsReady: ins.enoughData,
  };
}
export async function loadInsights(service: SupabaseClient, now = new Date()) {
  const [content, metrics] = [await listContent(service, { limit: 2000 }), await listMetrics(service)];
  const lite: ContentLite[] = content.map((c) => ({ id: c.id, platform: c.platform, audience: c.audience, topic: c.topic, pillar: c.pillar, content_type: c.content_type, cta: c.cta, status: c.status, published_at: c.published_at, campaign_id: c.campaign_id }));
  return { insights: buildInsights(lite, metrics as MetricRow[], now), content, metrics };
}
export async function auditFor(service: SupabaseClient, id: string) { const { data } = await service.from('social_audit_log').select('action, actor, metadata, created_at').eq('entity_id', id).order('created_at', { ascending: false }).limit(50); return data ?? []; }

export interface GrowthBrief { next: { id: string; platform: string; audience: string; cta: string | null; hook: string | null; why: string; status: string } | null; pending: number; yesterdayBest: { id: string; hook: string | null; platform: string } | null; recommendation: string }
/** "Today's Growth Brief": what to post today and why, from the calendar and stored results. Short on purpose. */
export async function growthBrief(service: SupabaseClient, now = new Date()): Promise<GrowthBrief> {
  const today = istToday(now); const yest = socialAddDays(today, -1);
  const content = await listContent(service, { limit: 500 }); const metrics = await listMetrics(service);
  const todays = content.filter((c) => c.planned_date === today && c.status !== 'REJECTED' && c.status !== 'PUBLISHED');
  const order = ['APPROVED', 'REVIEW', 'DRAFT', 'IDEA']; todays.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const n = todays[0];
  const lite: ContentLite[] = content.map((c) => ({ id: c.id, platform: c.platform, audience: c.audience, topic: c.topic, pillar: c.pillar, content_type: c.content_type, cta: c.cta, status: c.status, published_at: c.published_at, campaign_id: c.campaign_id }));
  const ins = buildInsights(lite, metrics as MetricRow[], now);
  const ym = metrics.filter((m: any) => m.metric_date === yest); let best: GrowthBrief['yesterdayBest'] = null;
  if (ym.length) { const ids = [...new Set(ym.map((m) => m.content_id))]; const top = ids.map((id) => ({ id, s: outcomeScore(socialTotals(ym.filter((m) => m.content_id === id) as MetricRow[])) })).sort((a, b) => b.s - a.s)[0]; const c = content.find((x) => x.id === top.id); if (c) best = { id: c.id, hook: c.hook, platform: c.platform }; }
  return {
    next: n ? { id: n.id, platform: n.platform, audience: n.audience, cta: n.cta, hook: n.hook, status: n.status, why: `It is in today's calendar (${n.pillar ?? 'general'} for ${n.audience.replace(/_/g, ' ')}).${n.status === 'DRAFT' || n.status === 'IDEA' ? ' It still needs your review.' : ''}` } : null,
    pending: content.filter((c) => c.status === 'REVIEW').length, yesterdayBest: best,
    recommendation: ins.recommendations[0] ?? (ins.enoughData && ins.repeat[0] ? `Topic "${ins.repeat[0]}" is leading so far. Consider one more post on it.` : 'Keep posting and enter results after each post; advice appears once there is enough data.'),
  };
}
