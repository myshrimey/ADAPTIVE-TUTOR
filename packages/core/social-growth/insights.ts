// Growth insights from what is actually stored. Business outcomes (leads, signups, customers, revenue) come before likes.
// A number that was never recorded is `null` ("Not available"), never 0. Small data is called small data.
export interface MetricRow { content_id: string; platform: string; impressions?: number | null; reach?: number | null; likes?: number | null; comments?: number | null; shares?: number | null; saves?: number | null; clicks?: number | null; leads?: number | null; registrations?: number | null; conversions?: number | null; revenue_inr?: number | null }
export interface ContentLite { id: string; platform: string; audience: string; topic: string | null; pillar: string | null; content_type: string; cta: string | null; status: string; published_at: string | null; campaign_id: string | null }
export const MIN_POSTS = 5;
const sumN = (rows: (number | null | undefined)[]): number | null => { const v = rows.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
const rate = (a: number | null, b: number | null): number | null => (a === null || b === null || b <= 0 ? null : a / b);

export interface SocialTotals { impressions: number | null; reach: number | null; engagement: number | null; clicks: number | null; leads: number | null; registrations: number | null; conversions: number | null; revenue: number | null; engagementRate: number | null; ctr: number | null; leadRate: number | null; customerRate: number | null }
export function socialTotals(rows: MetricRow[]): SocialTotals {
  const eng = sumN(rows.map((r) => (r.likes == null && r.comments == null && r.shares == null && r.saves == null ? null : (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0) + (r.saves ?? 0))));
  const impressions = sumN(rows.map((r) => r.impressions)); const reach = sumN(rows.map((r) => r.reach)); const clicks = sumN(rows.map((r) => r.clicks));
  const leads = sumN(rows.map((r) => r.leads)); const registrations = sumN(rows.map((r) => r.registrations)); const conversions = sumN(rows.map((r) => r.conversions)); const revenue = sumN(rows.map((r) => r.revenue_inr));
  return { impressions, reach, engagement: eng, clicks, leads, registrations, conversions, revenue, engagementRate: rate(eng, impressions ?? reach), ctr: rate(clicks, impressions), leadRate: rate(leads, clicks), customerRate: rate(conversions, registrations ?? leads) };
}
/** Outcome score: business results first (weights 1 lead, 3 registrations, 10 customers) then a small share for engagement. */
export const outcomeScore = (t: SocialTotals) => (t.leads ?? 0) + 3 * (t.registrations ?? 0) + 10 * (t.conversions ?? 0) + 0.01 * (t.engagement ?? 0) + 0.001 * (t.clicks ?? 0);
const hasData = (t: SocialTotals) => [t.impressions, t.reach, t.engagement, t.clicks, t.leads, t.registrations, t.conversions, t.revenue].some((x) => x !== null);

export interface SocialGroupStat { key: string; posts: number; totals: SocialTotals; score: number }
export function groupBy(content: ContentLite[], metrics: MetricRow[], by: (c: ContentLite) => string | null): SocialGroupStat[] {
  const m = new Map<string, MetricRow[]>(); for (const r of metrics) { const a = m.get(r.content_id) ?? []; a.push(r); m.set(r.content_id, a); }
  const g = new Map<string, { posts: Set<string>; rows: MetricRow[] }>();
  for (const c of content) {
    const k = by(c); if (!k) continue; const rows = m.get(c.id); if (!rows) continue;
    const e = g.get(k) ?? { posts: new Set(), rows: [] }; e.posts.add(c.id); e.rows.push(...rows); g.set(k, e);
  }
  return [...g].map(([key, e]) => { const totals = socialTotals(e.rows); return { key, posts: e.posts.size, totals, score: outcomeScore(totals) }; }).filter((s) => hasData(s.totals)).sort((a, b) => b.score - a.score);
}
export interface Insights { enoughData: boolean; measuredPosts: number; topPlatform: SocialGroupStat | null; topTopic: SocialGroupStat | null; topAudience: SocialGroupStat | null; topType: SocialGroupStat | null; topCta: SocialGroupStat | null; best: { id: string; score: number }[]; weak: { id: string; score: number }[]; repeat: string[]; stop: string[]; perWeek: number | null; recommendations: string[] }
export function buildInsights(content: ContentLite[], metrics: MetricRow[], now = new Date()): Insights {
  const published = content.filter((c) => c.status === 'PUBLISHED');
  const measured = new Set(metrics.map((m) => m.content_id)); const measuredPosts = published.filter((c) => measured.has(c.id)).length;
  const enoughData = measuredPosts >= MIN_POSTS;
  const top = (by: (c: ContentLite) => string | null) => groupBy(published, metrics, by);
  const plat = top((c) => c.platform), topic = top((c) => c.topic || c.pillar), aud = top((c) => c.audience), typ = top((c) => c.content_type), cta = top((c) => c.cta);
  const per = published.filter((c) => measured.has(c.id)).map((c) => ({ id: c.id, score: outcomeScore(socialTotals(metrics.filter((m) => m.content_id === c.id))) })).sort((a, b) => b.score - a.score);
  const dates = published.map((c) => c.published_at).filter(Boolean).map((d) => new Date(d as string).getTime());
  let perWeek: number | null = null;
  if (dates.length >= 2) { const days = Math.max(7, (Math.max(...dates, now.getTime()) - Math.min(...dates)) / 86400000); perWeek = Math.round((published.length / days) * 7 * 10) / 10; }
  const rec: string[] = [];
  if (published.length === 0) rec.push('Nothing has been published yet. Post the first approved item and record its address; insights begin after that.');
  else if (!enoughData) rec.push(`Only ${measuredPosts} published post${measuredPosts === 1 ? ' has' : 's have'} results entered. Below ${MIN_POSTS}, patterns are just chance: keep posting and enter results, and treat anything below as a hint, not a finding.`);
  if (enoughData && topic[0] && topic[0].score > 0) rec.push(`Posts on "${topic[0].key}" have brought the most leads/signups so far (${topic[0].posts} post${topic[0].posts === 1 ? '' : 's'}). Try more of them, and keep measuring.`);
  if (enoughData && aud[0] && aud[0].score > 0 && aud.length > 1) rec.push(`The ${aud[0].key} audience is leading on leads/signups. This is a small sample, so test it again before changing the plan.`);
  const clicksNoLead = socialTotals(metrics); if (clicksNoLead.clicks && !clicksNoLead.leads) rec.push('People are clicking but no leads are recorded. Check the landing page and the call to action, or enter lead numbers if you have them.');
  if (perWeek !== null && perWeek < 3) rec.push('You are publishing fewer than 3 posts a week. Consistency usually matters more than any single post.');
  const repeat = enoughData ? topic.filter((s) => s.score > 0).slice(0, 3).map((s) => s.key) : [];
  const stop = enoughData ? topic.filter((s) => s.posts >= 2 && s.score === 0 && s.totals.impressions !== null).slice(0, 3).map((s) => s.key) : [];
  return { enoughData, measuredPosts, topPlatform: plat[0] ?? null, topTopic: topic[0] ?? null, topAudience: aud[0] ?? null, topType: typ[0] ?? null, topCta: cta[0] ?? null, best: enoughData ? per.slice(0, 3) : [], weak: enoughData ? per.slice(-3).reverse().filter((p) => !per.slice(0, 3).some((b) => b.id === p.id)) : [], repeat, stop, perWeek, recommendations: rec };
}
export const fmtN = (v: number | null | undefined) => (v === null || v === undefined ? 'Not available' : new Intl.NumberFormat('en-IN').format(v));
export const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? 'Not available' : `${(v * 100).toFixed(1)}%`);
export const fmtInr = (v: number | null | undefined) => (v === null || v === undefined ? 'Not available' : `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)}`);
