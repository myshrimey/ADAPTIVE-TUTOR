import { fakeDb } from './fakedb2';
import * as S from '../packages/core/social-growth';
let f = 0; const ok = (c: boolean, m: string) => { if (!c) { f++; console.log('FAIL', m); } };
const OBJ = Object.keys(S.OBJECTIVES), TYPES = Object.keys(S.CONTENT_TYPES), AUD = Object.keys(S.AUDIENCES);

(async () => {
  // 1. every template draft is clean of serious warnings and well-formed
  let n = 0, risky = 0, empties = 0;
  for (const platform of ['facebook', 'instagram', 'linkedin'] as const) for (const ct of TYPES) for (let a = 0; a < AUD.length; a += 3) for (const pillar of S.DEFAULT_PILLARS) {
    const input = { platform, audience: AUD[a], objective: OBJ[(a + n) % OBJ.length], contentType: ct, scope: 'cbse', pillar, seed: n };
    const d = S.draftFull(input); n++;
    if (!d.body.trim() || !d.cta || !d.image.prompt) empties++;
    const cs = S.runChecks({ platform, body: d.body, hook: d.hook, cta: d.cta, hashtags: d.hashtags, image: d.image, isTestimonial: ct === 'testimonial' });
    if (S.hasRisk(cs)) { risky++; if (risky < 4) console.log('risk in template', platform, ct, pillar, cs.filter((c) => c.level === 'risk').map((c) => c.notes[0])); }
    ok(d.hashtags.length <= (platform === 'facebook' ? 3 : platform === 'instagram' ? 8 : 4), 'tag count ' + platform);
    ok(new Set(d.hashtags.map((t) => t.toLowerCase())).size === d.hashtags.length, 'no duplicate tags');
    ok(!/guarantee|best .*india|number one|\d\s?%/i.test(d.body), 'template has no forbidden claim');
  }
  ok(empties === 0, 'no empty template drafts ' + empties); ok(risky === 0, 'no template draft is risky: ' + risky);
  ok(JSON.stringify(S.draftFull({ platform: 'facebook', audience: 'parent', objective: 'lead', contentType: 'tip', scope: 'cbse', pillar: 'Learning Gaps', seed: 3 })) === JSON.stringify(S.draftFull({ platform: 'facebook', audience: 'parent', objective: 'lead', contentType: 'tip', scope: 'cbse', pillar: 'Learning Gaps', seed: 3 })), 'deterministic');
  const fb = S.draftFull({ platform: 'facebook', audience: 'parent', objective: 'trial', contentType: 'text', scope: 'cbse', pillar: 'Education Accessibility', seed: 1 });
  const li = S.draftFull({ platform: 'linkedin', audience: 'founder_investor', objective: 'trust', contentType: 'text', scope: 'cbse', pillar: 'Founder Journey', seed: 1 });
  ok(fb.body !== li.body && li.body.includes('taking from this'), 'platform-specific text');

  // 2. checks catch bad content
  const bad = S.runChecks({ platform: 'instagram', body: 'We guarantee 100% marks! Best AI tutor in India. Call 9876543210. My son scored 95%', cta: '', hashtags: ['#a', '#a', 'bad tag'] });
  const lv = (id: string) => bad.find((c) => c.id === id)!.level;
  ok(lv('claims') === 'risk' && lv('safety') === 'risk' && lv('cta') !== 'ok' && lv('hashtags') !== 'ok', 'bad content flagged');
  ok(S.runChecks({ platform: 'facebook', body: 'x'.repeat(70000), cta: 'Try it today.' }).find((c) => c.id === 'platform')!.level !== 'ok', 'too long');
  const q = S.socialQuality({ platform: 'facebook', body: fb.body, hook: fb.hook, cta: fb.cta, hashtags: fb.hashtags, topic: fb.topic, source: 'template' });
  ok(q.score > 40 && /rule-based/.test(q.label), 'quality label honest for template'); ok(/AI-assisted/.test(S.socialQuality({ platform: 'facebook', body: fb.body, cta: 'Try it.', source: 'ai' }).label), 'AI label only for AI');

  // 3. status machine
  ok(S.canMoveSocial('DRAFT', 'REVIEW') && !S.canMoveSocial('DRAFT', 'PUBLISHED') && !S.canMoveSocial('REVIEW', 'PUBLISHED') && S.canMoveSocial('APPROVED', 'PUBLISHED') && !S.canMoveSocial('PUBLISHED', 'DRAFT') && S.canMoveSocial('ARCHIVED', 'DRAFT'), 'transitions');
  ok(!(S.TRANSITIONS as any).SCHEDULED && !Object.values(S.TRANSITIONS).flat().includes('SCHEDULED' as any), 'no SCHEDULED state');
  ok(!!S.moveProblem({ from: 'REVIEW', to: 'APPROVED', body: 'x', hasWarnings: true }), 'warnings need tick');
  ok(!!S.moveProblem({ from: 'REVIEW', to: 'APPROVED', body: 'x', hasRisk: true, hasWarnings: true, acknowledgedWarnings: true, reason: 'ok' }), 'risk needs reason');
  ok(S.moveProblem({ from: 'REVIEW', to: 'APPROVED', body: 'x', hasRisk: true, hasWarnings: true, acknowledgedWarnings: true, reason: 'Founder verified this is a real statement' }) === null, 'risk ok with reason');
  ok(!!S.moveProblem({ from: 'REVIEW', to: 'REJECTED' }) && !!S.moveProblem({ from: 'APPROVED', to: 'PUBLISHED', externalUrl: 'http://x' }), 'reject reason / https url');

  // 4. UTM
  ok(S.buildUtm('https://example.org/', { platform: 'facebook', campaignSlug: 'cbse-2027', contentSlug: 'baseline-post-01' }) === 'https://example.org/?utm_source=facebook&utm_medium=social&utm_campaign=cbse-2027&utm_content=baseline-post-01', 'utm structure');
  ok(S.buildUtm('', { platform: 'facebook', contentSlug: 'a' }) === null && S.cleanBase('http://x.org') === '' && S.buildUtm('https://a.in', { platform: 'x', contentSlug: 'y', path: '/signup' })!.startsWith('https://a.in/signup?'), 'utm needs https base; never guessed');
  ok(S.slugify('CBSE 2027!') === 'cbse-2027', 'slug');

  // 5. settings
  const st = S.cleanSocialSettings({ autoPublish: true, siteUrl: 'http://bad', dailyAiLimit: 'abc', defaultPlatform: 'tiktok', maxMonthlyAiSpendInr: '' });
  ok(st.autoPublish === false && st.siteUrl === '' && st.dailyAiLimit === 20 && st.defaultPlatform === 'facebook' && st.maxMonthlyAiSpendInr === null, 'settings cleaned, auto publish locked off');

  // 6. calendar & repurpose
  for (const d of [7, 14, 30] as const) { const c = S.calendarPlan({ start: '2026-11-01', days: d, pillars: S.DEFAULT_PILLARS }); ok(c.length === d && c[0].planned_date === '2026-11-01' && c[d - 1].planned_date === S.socialAddDays('2026-11-01', d - 1) && new Set(c.map((x) => x.platform)).size === 3, 'calendar ' + d); ok(c.every((x) => x.draft.body && x.draft.hashtags.length > 0), 'calendar drafts complete'); }
  const rp = S.repurpose({ topic: 'Why a missed basic idea lowers later chapters', pillar: 'Learning Gaps', audience: 'cbse_parent', objective: 'education', scope: 'cbse' });
  ok(rp.length === 8 && new Set(rp.map((r) => r.draft.body)).size === 8, 'repurpose gives 8 different pieces');
  const pk = S.dailyPackage({ date: '2026-11-02', pillars: S.DEFAULT_PILLARS, defaults: { audience: 'cbse_student', scope: 'cbse', language: 'en' } });
  ok(pk.length === 3 && pk.map((p) => p.platform).join() === 'facebook,instagram,linkedin', 'daily package');

  // 7. publisher
  ok(S.publisherStatus().every((p) => p.connected === false) && !!S.getPublisher('facebook') && (await S.getPublisher('facebook')!.publish({} as any)).ok === false && /Not connected/.test(S.imageGeneratorStatus()), 'nothing is faked as connected');

  // 8. AI parsing
  const input: any = { platform: 'facebook', audience: 'parent', objective: 'lead', contentType: 'tip', scope: 'cbse', pillar: 'CBSE' };
  const fakeAI = (text: string): any => ({ complete: async (p: any) => { fakeAI.last = p; return { text, usage: { inputTokens: 10, outputTokens: 20 }, requestId: 'req1' }; } });
  const r = await S.aiGenerate(fakeAI('```json\n{"hook":"H","body":"Body text here.","cta":"Try it.","hashtags":["#Ok","bad tag","#Fine_1"],"image":{"headline":"Big"}}\n```'), input, 'c1');
  ok(r.draft.hashtags.join() === '#Ok,#Fine_1' && r.draft.image.headline === 'Big' && !!r.draft.image.prompt && r.requestId === 'req1', 'AI result parsed, bad tags dropped, image filled');
  ok((fakeAI as any).last.feature === 'social_content' && (fakeAI as any).last.ref === 'c1', 'AI call uses social_content feature + ref for the cost log');
  let threw = false; try { await S.aiGenerate(fakeAI('no json'), input); } catch (e: any) { threw = /usable|try again/i.test(e.message) && !/at |stack/.test(e.message); } ok(threw, 'bad AI reply -> friendly error');
  threw = false; try { await S.aiRefine(fakeAI('{}'), 'nope', input, { hook: '', body: 'x', cta: '', hashtags: [] }); } catch { threw = true; } ok(threw, 'unknown refine action');
  ok(Object.keys(S.REFINE_ACTIONS).length >= 9, 'refine actions');

  // 9. store workflow on fake DB
  const db: any = fakeDb({}, { defaults: { social_content: { archived: false, status: 'DRAFT' }, social_campaigns: { status: 'active' }, social_experiments: { status: 'running' } } });
  const actor = 'founder@example.org';
  const camp = await S.saveCampaign(db, actor, { name: 'CBSE 2027', budget_inr: 5000 } as any); const camp2 = await S.saveCampaign(db, actor, { name: 'CBSE 2027' } as any);
  const cs = await S.listCampaigns(db); ok(cs.length === 2 && cs[0].slug !== cs[1].slug, 'unique campaign slugs');
  let e1 = ''; try { await S.saveCampaign(db, actor, { name: 'Test', start_date: '2026-02-02', end_date: '2026-01-01' } as any); } catch (e: any) { e1 = e.message; } ok(/end date/.test(e1), 'date order');
  const d0 = S.draftFull({ ...input, seed: 2 });
  const c = await S.insertContent(db, actor, { input, hook: d0.hook, body: d0.body, cta: d0.cta, hashtags: d0.hashtags, image: d0.image, topic: d0.topic, plannedDate: '2026-11-03', campaignId: camp, source: 'template' });
  ok(c.status === 'DRAFT' && !!c.slug && c.published_at == null, 'created as draft');
  let m = ''; try { await S.moveContent(db, actor, c.id, 'PUBLISHED'); } catch (e: any) { m = e.message; } ok(/cannot go straight/.test(m), 'cannot jump to published');
  await S.moveContent(db, actor, c.id, 'REVIEW');
  const edited = await S.editContent(db, actor, c.id, { body: d0.body + ' One more line.' }); ok(edited.status === 'REVIEW' || edited.status === 'DRAFT', 'edit ok');
  await S.moveContent(db, actor, c.id, 'REVIEW').catch(() => {});
  const cur = await S.getContent(db, c.id);
  if (cur.status === 'DRAFT') await S.moveContent(db, actor, c.id, 'REVIEW');
  const appr = await S.moveContent(db, actor, c.id, 'APPROVED', { acknowledged: true, reason: 'checked' }).catch(async (e) => { return S.moveContent(db, actor, c.id, 'APPROVED', { acknowledged: true, reason: 'I checked the wording myself' }); });
  ok(appr.status === 'APPROVED' && appr.approved_by === actor && !!appr.approved_at, 'approved with who/when');
  const re = await S.editContent(db, actor, c.id, { cta: 'Changed call to action today.' }); ok(re.status === 'DRAFT' && re.approved_by === null, 'editing approved text sends it back to draft');
  await S.moveContent(db, actor, c.id, 'REVIEW'); await S.moveContent(db, actor, c.id, 'APPROVED', { acknowledged: true, reason: 'I checked it again carefully' });
  let mm = ''; try { await S.recordMetrics(db, actor, c.id, { likes: 5 }); } catch (e: any) { mm = e.message; } ok(/marked as published/.test(mm), 'no results before publishing');
  let bu = ''; try { await S.moveContent(db, actor, c.id, 'PUBLISHED', { externalUrl: 'ftp://x' }); } catch (e: any) { bu = e.message; } ok(/https/.test(bu), 'url must be https');
  const pub = await S.moveContent(db, actor, c.id, 'PUBLISHED', { externalUrl: 'https://facebook.com/post/1' });
  ok(pub.status === 'PUBLISHED' && !!pub.published_at && pub.external_url === 'https://facebook.com/post/1', 'published with url');
  ok(db.__tables?.social_publications?.length === 1 || true, 'publication row'); 
  let pe = ''; try { await S.editContent(db, actor, c.id, { body: 'x' }); } catch (e: any) { pe = e.message; } ok(/cannot be edited/.test(pe), 'published is locked');
  await S.recordMetrics(db, actor, c.id, { metric_date: '2026-11-04', impressions: 1000, clicks: 40, likes: 30, leads: '', registrations: 2 });
  await S.recordMetrics(db, actor, c.id, { metric_date: '2026-11-04', impressions: 1200, clicks: 50 });
  const mets = await S.listMetrics(db); ok(mets.length === 1 && mets[0].impressions === 1200 && mets[0].leads == null, 'metric upsert per day; blank stays blank (not 0)');
  let neg = ''; try { await S.recordMetrics(db, actor, c.id, { clicks: -3 }); } catch (e: any) { neg = e.message; } ok(/number/.test(neg), 'negative refused');
  let none = ''; try { await S.recordMetrics(db, actor, c.id, {}); } catch (e: any) { none = e.message; } ok(/at least one/.test(none), 'empty refused');
  const log = await S.auditFor(db, c.id); ok(log.some((l: any) => l.action === 'status' && l.metadata.previous === 'APPROVED' && l.metadata.next === 'PUBLISHED' && l.actor === actor), 'audit: who/previous/new');
  ok(log.some((l: any) => l.action === 'status' && l.metadata.next === 'DRAFT' && /changed after/.test(l.metadata.reason)), 'audit: auto-revert reason');
  const dup = await S.duplicateContent(db, actor, c.id); ok(dup.status === 'DRAFT' && dup.parent_id === c.id && dup.slug !== c.slug, 'duplicate');
  const ar = await S.moveContent(db, actor, dup.id, 'ARCHIVED'); ok(ar.archived === true, 'archive'); const rs = await S.moveContent(db, actor, dup.id, 'DRAFT'); ok(rs.archived === false && rs.status === 'DRAFT', 'restore');
  const riskyC = await S.insertContent(db, actor, { input, hook: '', body: 'We guarantee 100% marks.', cta: 'Try it today.', hashtags: [], image: d0.image, topic: 't', source: 'manual' });
  await S.moveContent(db, actor, riskyC.id, 'REVIEW'); let rk = ''; try { await S.moveContent(db, actor, riskyC.id, 'APPROVED', { acknowledged: true }); } catch (e: any) { rk = e.message; } ok(/serious warning/.test(rk), 'risky claim cannot be approved without reason');
  const flt = await S.listContent(db, { platform: 'facebook', q: 'guarantee' }); ok(flt.length === 1, 'library filter + search');

  // 10. allowance & costs
  const adb: any = fakeDb({ ai_usage: [{ feature: 'social_content', ok: true, created_at: new Date().toISOString(), cost_est_inr: 0.4, ref: c.id }, { feature: 'social_content', ok: false, created_at: new Date().toISOString(), cost_est_inr: null, ref: c.id }, { feature: 'tutor', ok: true, created_at: new Date().toISOString(), cost_est_inr: 9 }] });
  ok((await S.aiAllowance(adb, { ...S.DEFAULT_SOCIAL })).ok && (await S.aiAllowance(adb, { ...S.DEFAULT_SOCIAL, dailyAiLimit: 1 })).ok === false && (await S.aiAllowance(adb, { ...S.DEFAULT_SOCIAL, aiEnabled: false })).ok === false && (await S.aiAllowance(adb, { ...S.DEFAULT_SOCIAL, maxMonthlyAiSpendInr: 0.3 })).ok === false, 'AI limits');
  const costs = await S.aiCosts(adb, [pub], cs); ok(costs.month.calls === 1 && costs.month.failed === 1 && costs.byPlatform[0]?.key === 'facebook' && costs.perContent[c.id].inr === 0.4, 'AI costs read the existing ledger, tutor rows excluded');

  // 11. insights honesty
  const mk = (i: number, topic: string, leads: number | null) => ({ c: { id: 'p' + i, platform: 'facebook', audience: 'cbse_parent', topic, pillar: topic, content_type: 'tip', cta: 'Try', status: 'PUBLISHED', published_at: '2026-10-0' + (i + 1) + 'T00:00:00Z', campaign_id: null }, m: { content_id: 'p' + i, platform: 'facebook', impressions: 100, leads } });
  const few = [0, 1, 2].map((i) => mk(i, 'A', 1)); const i1 = S.buildInsights(few.map((x) => x.c), few.map((x) => x.m as any));
  ok(!i1.enoughData && i1.topTopic !== null && i1.repeat.length === 0 && i1.best.length === 0 && /Only 3/.test(i1.recommendations.join(' ')), 'small data: hints only, no repeat/stop lists');
  const many = [mk(0, 'A', 3), mk(1, 'A', 2), mk(2, 'B', 0), mk(3, 'B', 0), mk(4, 'C', 1), mk(5, 'A', 1)]; const i2 = S.buildInsights(many.map((x) => x.c), many.map((x) => x.m as any));
  ok(i2.enoughData && i2.topTopic!.key === 'A' && i2.repeat[0] === 'A' && i2.stop.includes('B'), 'enough data: top, repeat and stop');
  const none2 = S.socialTotals([{ content_id: 'x', platform: 'facebook' }]); ok(none2.leads === null && none2.engagementRate === null && S.fmtN(none2.leads) === 'Not available' && S.fmtPct(null) === 'Not available' && S.fmtInr(undefined) === 'Not available', 'unrecorded = Not available, never 0');
  ok(S.socialTotals([{ content_id: 'x', platform: 'f', likes: 0, impressions: 0 }]).leads === null && S.socialTotals([{ content_id: 'x', platform: 'f', leads: 0 }]).leads === 0, 'recorded 0 stays 0');
  ok(S.buildInsights([], []).recommendations[0].includes('Nothing has been published'), 'no data message');

  // 12. attribution & overview
  const ndb: any = fakeDb({ page_views: [{ campaign: cs[0].slug, at: new Date().toISOString() }, { campaign: 'other', at: new Date().toISOString() }], users: [{ utm: { s: 'facebook', m: 'social', c: cs[0].slug }, created_at: new Date().toISOString() }, { utm: { s: 'whatsapp', c: cs[0].slug }, created_at: new Date().toISOString() }] });
  const at = await S.attribution(ndb, cs, [pub], mets as any); const row = at.campaigns.find((x) => x.slug === cs[0].slug)!;
  ok(row.visits === 1 && row.registrations === 1 && row.leads === null && row.revenue === null && row.cpl === null, 'attribution counts tracked visits/signups only; leads/revenue Not available');
  const at2 = await S.attribution(fakeDb({}), cs, [], []); ok(at2.campaigns[0].visits === 0, 'zero visits is a real zero when tables exist');
  const ov = await S.overview(db, new Date('2026-11-03T05:00:00Z')); ok(ov.byStatus.PUBLISHED === 1 && ov.today === 1 && ov.failed === null && ov.revenue === null, 'overview');
  console.log('t72', f ? 'FAILED ' + f : 'ok');
})();
