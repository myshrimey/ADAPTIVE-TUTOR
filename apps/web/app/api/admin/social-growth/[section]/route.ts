import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import {
  createAIProvider, recordAIAttempt, loadSocialSettings, saveSocialSettings, siteBase, aiAllowance, aiGenerate, aiRefine, REFINE_ACTIONS, PROMPT_VERSION,
  draftFull, dailyPackage, calendarPlan, repurpose, istToday, makeDraft, makeHashtags, ctaFor, loadHashtagPool, listPillars, savePillar, saveCampaign, listCampaigns,
  listContent, getContent, insertContent, editContent, moveContent, duplicateContent, recordMetrics, listMetrics, createExperiment, setVariant, declareWinner, listExperiments,
  addObservation, listObservations, loadInsights, attribution, aiCosts, overview, auditFor, buildUtm, publisherStatus, imageGeneratorStatus, CHECKLIST, runChecks, socialQuality,
  PLATFORMS, type DraftInput, type SocialContent, type SocialStatus, type Draft, type AiMeta,
} from '@adaptive-tutor/core';

export const maxDuration = 60;
const FRIENDLY_BAD = 'Something went wrong. Nothing was lost; please try again.';

// Every action below runs requireAdmin() first (server-side, the same ADMIN_EMAILS rule as every other admin API). The browser's claims are never trusted.
async function guard() { return requireAdmin(); }
const fail = (err: any, where: string) => {
  const m = String(err?.message ?? '');
  if (m === 'not_authorized') return NextResponse.json({ data: null, error: 'You are not signed in as an authorised admin. Open /admin/social-growth to see why.' }, { status: 403 });
  const known = m && !/^(PGRST|\{|TypeError|ReferenceError|fetch failed)/.test(m) && m.length < 300 && !/\bat \S+:\d+/.test(m);
  if (!known) console.error('[social-growth]', where, err);
  return NextResponse.json({ data: null, error: known ? m : FRIENDLY_BAD }, { status: 400 });
};
const asInput = (b: any, s: { defaultLanguage: string; defaultAudience: string; defaultCta: string }, platform?: string): DraftInput => ({
  platform: (platform ?? b.platform) as any, audience: String(b.audience || s.defaultAudience), objective: String(b.objective || 'education'), contentType: String(b.contentType || 'text'),
  scope: String(b.scope || 'cbse'), pillar: String(b.pillar || 'Learning Gaps'), topic: b.topic ? String(b.topic).slice(0, 200) : undefined, language: String(b.language || s.defaultLanguage), cta: b.cta ? String(b.cta).slice(0, 140) : s.defaultCta || undefined,
});
const rnd = () => 1 + Math.floor(Math.random() * 900);

async function aiMeta(service: any, requestId?: string): Promise<AiMeta> {
  let provider: string | undefined, model: string | undefined;
  if (requestId) { try { const { data } = await service.from('ai_usage').select('provider, model, ok, attempt_no').eq('request_id', requestId).order('attempt_no', { ascending: false }).limit(5); const r = (data ?? []).find((x: any) => x.ok) ?? data?.[0]; provider = r?.provider; model = r?.model ?? undefined; } catch { /* ledger lookup is best effort */ } }
  return { provider, model, promptVersion: PROMPT_VERSION, at: new Date().toISOString(), requestId };
}
function aiProvider(service: any) { return createAIProvider({ tier: 'free', service, onAttempt: recordAIAttempt(service, null, 'free') }); }
async function wantAi(service: any, settings: any, use: boolean) {
  if (!use) return false;
  const a = await aiAllowance(service, settings); if (!a.ok) throw new Error(a.reason ?? 'AI writing is not available right now.'); return true;
}

export async function POST(request: Request, ctx: { params: Promise<{ section: string }> }) {
  const { section } = await ctx.params;
  try {
    const admin = await guard(); const actor = admin.email;
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    const settings = await loadSocialSettings(service);
    const pool = await loadHashtagPool(service);

    if (section === 'generate') {
      const mode = String(b.mode ?? 'single');
      const pillars = (await listPillars(service)).filter((p) => p.active).map((p) => p.name);
      if (mode === 'daily') {
        const date = istToday();
        const existing = (await listContent(service, { from: date, to: date, limit: 50 })).filter((c) => c.status !== 'REJECTED');
        if (existing.length && !b.force) return NextResponse.json({ data: { created: [], existing: existing.length, message: `Today already has ${existing.length} post${existing.length === 1 ? '' : 's'}. Open them below, or press "Make another set".` }, error: null });
        const useAi = await wantAi(service, settings, b.useAi === true);
        const pk = dailyPackage({ date: b.force ? `${date}` : date, pillars: pillars.length ? pillars : ['Learning Gaps'], defaults: { audience: settings.defaultAudience, scope: 'cbse', language: settings.defaultLanguage, cta: settings.defaultCta || undefined }, pool });
        const ai = useAi ? aiProvider(service) : null; const created: SocialContent[] = []; const failed: string[] = [];
        for (const p of pk) {
          const input: DraftInput = { platform: p.platform, audience: p.audience, objective: p.objective, contentType: p.contentType, scope: p.scope, pillar: p.pillar, language: p.language, cta: p.cta, seed: b.force ? rnd() : p.seed };
          let draft: Draft = b.force ? draftFull(input, pool) : p.draft, source: 'template' | 'ai' = 'template', meta: AiMeta | null = null;
          if (ai) { try { const r = await aiGenerate(ai, input); draft = { ...r.draft, hashtags: r.draft.hashtags.length ? r.draft.hashtags : draft.hashtags }; source = 'ai'; meta = await aiMeta(service, r.requestId); } catch (e: any) { failed.push(`${p.platform}: ${e.message}`); } }
          created.push(await insertContent(service, actor, { input, ...draft, plannedDate: date, source, aiMeta: meta }));
        }
        return NextResponse.json({ data: { created, failed, note: failed.length ? 'Some posts could not be written by AI; ready-made template versions were saved instead. Use "Rewrite with AI" on them to retry.' : null }, error: null });
      }
      if (mode === 'repurpose') {
        const topic = String(b.topic ?? '').trim(); if (topic.length < 5) throw new Error('Write the idea in a sentence.');
        const parts = repurpose({ topic, pillar: String(b.pillar || 'Learning Gaps'), audience: String(b.audience || settings.defaultAudience), objective: String(b.objective || 'education'), scope: String(b.scope || 'cbse'), language: settings.defaultLanguage, pool });
        const created: SocialContent[] = [];
        for (const p of parts) {
          if (!(PLATFORMS as readonly string[]).includes(p.format.platform)) { created.push({ ...(await insertContent(service, actor, { input: p.input, ...p.draft, plannedDate: null, campaignId: b.campaignId || null, source: 'template' })) }); continue; }
          created.push(await insertContent(service, actor, { input: p.input, ...p.draft, plannedDate: b.plannedDate || null, campaignId: b.campaignId || null, source: 'template' }));
        }
        return NextResponse.json({ data: { created }, error: null });
      }
      if (mode === 'single') {
        const targets = b.platform === 'all' ? [...PLATFORMS] : [String(b.platform || settings.defaultPlatform)];
        if (targets.some((t) => !(PLATFORMS as readonly string[]).includes(t))) throw new Error('Choose Facebook, Instagram, LinkedIn or All platforms.');
        const useAi = await wantAi(service, settings, b.useAi === true); const ai = useAi ? aiProvider(service) : null; const created: SocialContent[] = [];
        for (const t of targets) {
          const input = { ...asInput(b, settings, t), seed: rnd() }; let draft = draftFull(input, pool), source: 'template' | 'ai' = 'template', meta: AiMeta | null = null;
          if (ai) { const r = await aiGenerate(ai, input); draft = { ...r.draft, hashtags: r.draft.hashtags.length ? r.draft.hashtags : draft.hashtags }; source = 'ai'; meta = await aiMeta(service, r.requestId); }
          created.push(await insertContent(service, actor, { input, ...draft, plannedDate: b.plannedDate || istToday(), campaignId: b.campaignId || null, source, aiMeta: meta }));
        }
        return NextResponse.json({ data: { created }, error: null });
      }
      throw new Error('Unknown generate mode.');
    }

    if (section === 'calendar') {
      const days = [7, 14, 30].includes(Number(b.days)) ? (Number(b.days) as 7 | 14 | 30) : 7;
      const start = /^\d{4}-\d{2}-\d{2}$/.test(String(b.start)) ? String(b.start) : istToday();
      const pillars = (await listPillars(service)).filter((p) => p.active).map((p) => p.name);
      const plan = calendarPlan({ start, days, pillars: pillars.length ? pillars : ['Learning Gaps'], scope: String(b.scope || 'cbse'), language: settings.defaultLanguage, pool });
      const have = await listContent(service, { from: start, to: plan[plan.length - 1].planned_date, limit: 500 }); const created: SocialContent[] = [];
      for (const p of plan) {
        if (have.some((h) => h.planned_date === p.planned_date && h.platform === p.platform && h.status !== 'REJECTED')) continue;
        const { draft, planned_date, ...input } = p; created.push(await insertContent(service, actor, { input, ...draft, plannedDate: planned_date, campaignId: b.campaignId || null, source: 'template' }));
      }
      return NextResponse.json({ data: { created: created.length, skipped: plan.length - created.length }, error: null });
    }

    if (section === 'content') {
      const id = String(b.id ?? ''); const act = String(b.action ?? '');
      if (act === 'create') { // the founder writes a post by hand
        const input = asInput(b, settings); if (!(PLATFORMS as readonly string[]).includes(input.platform)) throw new Error('Choose a platform.');
        const body = String(b.body ?? ''); const tags = String(b.hashtags ?? '').split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith('#') ? t : `#${t}`));
        const img = makeDraft(input).image;
        const c = await insertContent(service, actor, { input, hook: String(b.hook ?? ''), body, cta: String(b.cta ?? ''), hashtags: tags, image: img, topic: String(b.topic ?? ''), plannedDate: b.plannedDate || null, campaignId: b.campaignId || null, source: 'manual', status: b.idea ? 'IDEA' : 'DRAFT' });
        return NextResponse.json({ data: c, error: null });
      }
      if (act === 'edit') return NextResponse.json({ data: await editContent(service, actor, id, b.patch ?? {}), error: null });
      if (act === 'duplicate') return NextResponse.json({ data: await duplicateContent(service, actor, id), error: null });
      if (act === 'hashtags' || act === 'hook' || act === 'cta' || act === 'regenerate' || (act === 'refine' && b.how in REFINE_ACTIONS)) {
        const cur = await getContent(service, id); if (cur.status === 'PUBLISHED') throw new Error('A published post cannot be changed. Duplicate it first.');
        const base: DraftInput = { platform: (b.platform || cur.platform) as any, audience: b.audience || cur.audience, objective: cur.objective, contentType: cur.content_type, scope: cur.scope, pillar: cur.pillar ?? 'Learning Gaps', topic: cur.topic ?? undefined, language: cur.language, seed: rnd() };
        if (act === 'hashtags') return NextResponse.json({ data: await editContent(service, actor, id, { hashtags: makeHashtags({ platform: cur.platform, audience: cur.audience, scope: cur.scope, seed: rnd(), pool }) }), error: null });
        if (act === 'cta') return NextResponse.json({ data: await editContent(service, actor, id, { cta: ctaFor(cur.objective, rnd()) }), error: null });
        if (act === 'hook') { const h = makeDraft({ ...base, platform: cur.platform as any }).hook; const body = cur.hook && cur.body.startsWith(cur.hook) ? h + cur.body.slice(cur.hook.length) : cur.body; return NextResponse.json({ data: await editContent(service, actor, id, { hook: h, body }), error: null }); }
        if (act === 'regenerate') {
          const useAi = await wantAi(service, settings, b.useAi === true); let d = draftFull(base, pool), source: 'template' | 'ai' = 'template', meta: AiMeta | null = null;
          if (useAi) { const r = await aiGenerate(aiProvider(service), base, id); d = { ...r.draft, hashtags: r.draft.hashtags.length ? r.draft.hashtags : d.hashtags }; source = 'ai'; meta = await aiMeta(service, r.requestId); }
          return NextResponse.json({ data: await editContent(service, actor, id, { platform: base.platform, audience: base.audience, hook: d.hook, body: d.body, cta: d.cta, hashtags: d.hashtags, image_spec: d.image, source, aiMeta: meta }), error: null });
        }
        await wantAi(service, settings, true);
        const r = await aiRefine(aiProvider(service), String(b.how), base, { hook: cur.hook ?? '', body: cur.body, cta: cur.cta ?? '', hashtags: cur.hashtags }, id);
        const patch: any = { hook: r.draft.hook || cur.hook, body: r.draft.body, cta: r.draft.cta || cur.cta, source: 'ai', aiMeta: await aiMeta(service, r.requestId) }; if (r.draft.hashtags.length) patch.hashtags = r.draft.hashtags; if (String(b.how).startsWith('translate_')) patch.language = b.how === 'translate_hi' ? 'hi' : 'en';
        return NextResponse.json({ data: await editContent(service, actor, id, patch), error: null });
      }
      if (act === 'detail') {
        const c = await getContent(service, id); const camps = await listCampaigns(service); const camp = camps.find((x) => x.id === c.campaign_id);
        const checks = runChecks({ platform: c.platform, body: c.body, hook: c.hook, cta: c.cta, hashtags: c.hashtags, image: c.image_spec, isTestimonial: c.content_type === 'testimonial' });
        const quality = socialQuality({ platform: c.platform, body: c.body, hook: c.hook, cta: c.cta, hashtags: c.hashtags, topic: c.topic, source: c.source });
        const base = siteBase(settings);
        return NextResponse.json({ data: { checks, quality, utm: buildUtm(base, { platform: c.platform, campaignSlug: camp?.slug, contentSlug: c.slug, path: settings.landingPath }), siteConfigured: !!base, checklist: CHECKLIST[c.platform] ?? [], log: await auditFor(service, id) }, error: null });
      }
      throw new Error('Unknown action.');
    }

    if (section === 'approve') { // status changes: REVIEW / APPROVED / REJECTED / DRAFT / ARCHIVED
      const to = String(b.to) as SocialStatus; if (to === 'PUBLISHED') throw new Error('Use "Mark as published" for that.');
      return NextResponse.json({ data: await moveContent(service, actor, String(b.id), to, { reason: b.reason, acknowledged: b.acknowledged === true }), error: null });
    }
    if (section === 'publish') return NextResponse.json({ data: await moveContent(service, actor, String(b.id), 'PUBLISHED', { externalUrl: b.externalUrl, notes: b.notes }), error: null });
    if (section === 'metrics') { await recordMetrics(service, actor, String(b.id), b.values ?? {}); return NextResponse.json({ data: true, error: null }); }
    if (section === 'campaigns') return NextResponse.json({ data: { id: await saveCampaign(service, actor, b.campaign ?? {}) }, error: null });
    if (section === 'experiments') {
      if (b.action === 'create') return NextResponse.json({ data: { id: await createExperiment(service, actor, { name: b.name, hypothesis: b.hypothesis, campaignId: b.campaignId }) }, error: null });
      if (b.action === 'variant') { await setVariant(service, actor, String(b.contentId), b.experimentId || null, b.variant || null); return NextResponse.json({ data: true, error: null }); }
      if (b.action === 'winner') { await declareWinner(service, actor, String(b.experimentId), String(b.contentId), b.note); return NextResponse.json({ data: true, error: null }); }
      throw new Error('Unknown action.');
    }
    if (section === 'settings') {
      if (b.pillar) { await savePillar(service, actor, b.pillar); return NextResponse.json({ data: await listPillars(service), error: null }); }
      if (b.observation) { await addObservation(service, actor, b.observation); return NextResponse.json({ data: await listObservations(service), error: null }); }
      const v = await saveSocialSettings(service, b.settings); const { audit } = await import('@adaptive-tutor/core'); await audit(service, 'settings', null, 'save', actor, { aiEnabled: v.aiEnabled, dailyAiLimit: v.dailyAiLimit, monthlyAiLimit: v.monthlyAiLimit });
      return NextResponse.json({ data: v, error: null });
    }
    return NextResponse.json({ data: null, error: 'unknown_section' }, { status: 404 });
  } catch (err) { return fail(err, `POST ${section}`); }
}

// GET: the screen's data (one call) or the analytics block.
export async function GET(request: Request, ctx: { params: Promise<{ section: string }> }) {
  const { section } = await ctx.params;
  try {
    await guard(); const service = createServiceClient(); const u = new URL(request.url);
    const settings = await loadSocialSettings(service);
    if (section === 'analytics') {
      const { insights, content, metrics } = await loadInsights(service); const campaigns = await listCampaigns(service);
      return NextResponse.json({ data: { insights, attribution: await attribution(service, campaigns, content, metrics), costs: await aiCosts(service, content, campaigns), allowance: await aiAllowance(service, settings) }, error: null });
    }
    if (section === 'content' || section === 'calendar') {
      const f: any = { platform: u.searchParams.get('platform') || undefined, audience: u.searchParams.get('audience') || undefined, pillar: u.searchParams.get('pillar') || undefined, campaignId: u.searchParams.get('campaign') || undefined, status: u.searchParams.get('status') || undefined, language: u.searchParams.get('language') || undefined, q: u.searchParams.get('q') || undefined, archived: u.searchParams.get('archived') === '1', from: u.searchParams.get('from') || undefined, to: u.searchParams.get('to') || undefined, limit: 300 };
      const content = await listContent(service, f); const campaigns = await listCampaigns(service); const metrics = await listMetrics(service);
      return NextResponse.json({ data: { content, campaigns, metrics, base: siteBase(settings) }, error: null });
    }
    if (section === 'overview') return NextResponse.json({ data: await overview(service), error: null });
    if (section === 'experiments') return NextResponse.json({ data: await listExperiments(service), error: null });
    return NextResponse.json({ data: null, error: 'unknown_section' }, { status: 404 });
  } catch (err) { return fail(err, `GET ${section}`); }
}
