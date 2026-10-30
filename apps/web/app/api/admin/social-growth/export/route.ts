import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase-server';
import { toCsv, listContent, listCampaigns, listMetrics, attribution, loadSocialSettings, siteBase, buildUtm } from '@adaptive-tutor/core';

// Founder-only CSV downloads: ?kind=calendar | library | campaigns | metrics | leads. Empty cells mean "not recorded" (never 0).
export async function GET(request: Request) {
  try {
    await requireAdmin('marketing');
    const kind = new URL(request.url).searchParams.get('kind') ?? 'library'; const service = createServiceClient();
    const settings = await loadSocialSettings(service); const base = siteBase(settings);
    const campaigns = await listCampaigns(service); const cname = new Map(campaigns.map((c) => [c.id, c])); const day = new Date().toISOString().slice(0, 10);
    let csv = '';
    if (kind === 'calendar' || kind === 'library') {
      const rows = (await listContent(service, { limit: 2000, archived: false })).filter((c) => kind === 'library' || c.planned_date);
      csv = toCsv(['date', 'platform', 'audience', 'objective', 'pillar', 'type', 'topic', 'status', 'language', 'campaign', 'hook', 'body', 'cta', 'hashtags', 'tracked_link', 'published_at', 'post_url'],
        rows.map((c) => [c.planned_date, c.platform, c.audience, c.objective, c.pillar, c.content_type, c.topic, c.status, c.language, cname.get(c.campaign_id ?? '')?.name ?? null, c.hook, c.body, c.cta, c.hashtags.join(' '), buildUtm(base, { platform: c.platform, campaignSlug: cname.get(c.campaign_id ?? '')?.slug, contentSlug: c.slug, path: settings.landingPath }), c.published_at, c.external_url]));
    } else if (kind === 'campaigns' || kind === 'leads') {
      const content = await listContent(service, { limit: 2000 }); const metrics = await listMetrics(service); const a = await attribution(service, campaigns, content, metrics);
      csv = toCsv(['campaign', 'tracked_name', 'budget_inr', 'posts', 'published', 'visits_from_links', 'signups_from_links', 'leads_entered', 'customers_entered', 'revenue_inr_entered', 'cost_per_lead', 'cost_per_customer'],
        a.campaigns.map((c) => [c.name, c.slug, c.budget, c.posts, c.published, c.visits, c.registrations, c.leads, c.customers, c.revenue, c.cpl === null ? null : Math.round(c.cpl), c.cpa === null ? null : Math.round(c.cpa)]));
    } else if (kind === 'metrics') {
      const m = await listMetrics(service);
      csv = toCsv(['content_id', 'platform', 'date', 'impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks', 'profile_visits', 'followers_gained', 'leads', 'registrations', 'conversions', 'revenue_inr'], m.map((r: any) => [r.content_id, r.platform, r.metric_date, r.impressions, r.reach, r.likes, r.comments, r.shares, r.saves, r.clicks, r.profile_visits, r.followers_gained, r.leads, r.registrations, r.conversions, r.revenue_inr]));
    } else return new Response('Unknown export', { status: 400 });
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="sahayak-social-${kind}-${day}.csv"` } });
  } catch (err: any) { return new Response(err?.message === 'not_authorized' ? 'Not authorized' : 'Could not make the file. Please try again.', { status: err?.message === 'not_authorized' ? 403 : 500 }); }
}
