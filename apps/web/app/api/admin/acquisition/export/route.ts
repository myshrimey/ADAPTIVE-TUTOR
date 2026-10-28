import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase-server';
import { toCsv, loadRaw, buildReport, buildPeople, rangeBounds, sourceLabel, REPORTING_MODELS, type ReportingModel } from '@adaptive-tutor/core';

// ADMIN ONLY CSV: ?kind=acquisition|sources|channels|campaigns|content|referrals|partners|customers|cohorts&r=30&model=first_touch
// Spreadsheet-safe (toCsv defuses formulas). Empty cell = not recorded. No names, contact details, answers or notes; accounts are shown by a short id only.
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const u = new URL(request.url); const kind = u.searchParams.get('kind') ?? 'sources';
    const rb = rangeBounds(u.searchParams.get('r') ?? '30', { from: u.searchParams.get('from') ?? undefined, to: u.searchParams.get('to') ?? undefined });
    const { raw } = await loadRaw(createServiceClient());
    const model = ((REPORTING_MODELS as readonly string[]).includes(u.searchParams.get('model') ?? '') ? u.searchParams.get('model') : raw.settings.model) as ReportingModel;
    const rep = buildReport(raw, { range: rb, rangeLabel: rb.label, model });
    const rowH = ['key', 'signups', 'students', 'diagnostics_started', 'diagnostics_completed', 'baselines', 'first_session', 'activated', 'paid', 'revenue_inr', 'revenue_per_customer', 'diagnostic_rate_pct', 'activation_rate_pct', 'paid_rate_pct', 'd1_returned', 'd1_eligible', 'd7_returned', 'd7_eligible', 'd30_returned', 'd30_eligible', 'visits', 'tracked_arrivals', 'arrivals_matched'];
    const rowV = (r: any) => [r.label, r.people, r.students, r.diagStarted, r.diagDone, r.baseline, r.learning, r.activated, r.paid, r.revenue, r.revPerCustomer, r.diagRate, r.activationRate, r.paidRate, r.ret1.n, r.ret1.of, r.ret7.n, r.ret7.of, r.ret30.n, r.ret30.of, r.visits, r.arrivals, r.arrivalsMatched];
    let csv = '';
    if (kind === 'sources') csv = toCsv([...rowH, 'cash_spend_inr', 'cost_per_customer_inr'], rep.sources.map((r) => [...rowV(r), r.spend, r.cac]));
    else if (kind === 'channels') csv = toCsv(rowH, rep.channels.map(rowV));
    else if (kind === 'campaigns') csv = toCsv([...rowH, 'budget_inr', 'cash_spend_inr', 'cost_per_customer_inr'], rep.campaigns.map((r) => [...rowV(r), r.budget, r.spend, r.cac]));
    else if (kind === 'cohorts') csv = toCsv(['month', ...rowH], [...rep.cohorts.bySource, ...rep.cohorts.byCampaign, ...rep.cohorts.byType].map((r) => [r.month, ...rowV(r)]));
    else if (kind === 'content') csv = toCsv(['post', 'platform', 'campaign', 'audience', 'pillar', 'status', 'published_at', 'impressions_entered', 'clicks_entered', 'engagement_entered', 'tracked_arrivals', 'visits', 'signups', 'diagnostics', 'customers', 'revenue_inr', 'referrals', 'outcome_score'], rep.content.map((c) => [c.slug, c.platform, c.campaign, c.audience, c.pillar, c.status, c.publishedAt, c.impressions, c.clicks, c.engagement, c.arrivals, c.visits, c.signups, c.diagnostics, c.customers, c.revenue, c.referrals, c.score]));
    else if (kind === 'referrals') csv = toCsv(['referrer_role', 'referrer_code', 'signups', 'diagnostics_completed', 'activated', 'paid', 'revenue_inr', 'quality_score'], rep.referral.topByQuality.length ? [...new Map([...rep.referral.topBySignups, ...rep.referral.topByActivated, ...rep.referral.topByRevenue, ...rep.referral.topByQuality].map((r) => [r.code, r])).values()].map((r) => [r.role, r.code, r.signups, r.diagDone, r.activated, r.paid, r.revenue, r.quality]) : []);
    else if (kind === 'partners') csv = toCsv(['code', 'kind', 'status', 'reward_status_manual', 'students_attributed', 'students_linked', 'students_total', 'diagnostics_completed', 'activated', 'paid', 'revenue_inr'], rep.partners.map((p) => [p.code, p.kind, p.status, p.rewardStatus, p.attributed, p.linked, p.students, p.diagDone, p.activated, p.paid, p.revenue]));
    else if (kind === 'acquisition' || kind === 'customers') {
      const { people } = buildPeople(raw); const only = kind === 'customers';
      csv = toCsv(['account', 'type', 'signup_month', 'first_source', 'first_campaign', 'first_post', 'last_source', 'last_campaign', 'referred', 'partner', 'tracked_visit_matched', 'diagnostic', 'baseline', 'sessions', 'paid', 'revenue_inr', 'payment_source'],
        people.filter((p) => !only || p.paid).map((p) => [p.userId.replace(/-/g, '').slice(0, 8), p.type, p.month, sourceLabel(p.first.source), p.first.campaign, p.first.content, sourceLabel(p.last.source), p.last.campaign, p.referrerUser ? 'yes' : 'no', p.partner, p.matchedTouch ? 'yes' : 'not linked', p.diagDone ? 'completed' : p.diagStarted ? 'started' : '', p.baseline ? 'yes' : '', p.sessions, p.paid ? 'yes' : 'no', p.revenue, p.paymentSource ? sourceLabel(p.paymentSource) : null]));
    } else return new Response('Unknown export', { status: 400 });
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="sahayak-acquisition-${kind}-${new Date().toISOString().slice(0, 10)}.csv"` } });
  } catch (err: any) { return new Response(err?.message === 'not_authorized' ? 'Not authorized' : 'Could not make the file. Please try again.', { status: err?.message === 'not_authorized' ? 403 : 500 }); }
}
