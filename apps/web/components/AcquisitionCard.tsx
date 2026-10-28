import { createServiceClient } from '@/lib/supabase-server';
import { loadRaw, buildReport, rangeBounds, sourceLabel, NOT_AVAILABLE } from '@adaptive-tutor/core';
import { Section, inr } from '@/components/founder/Cards';

// Founder Command Centre summary: "How are we growing?" Short on purpose; the full dashboard is /admin/acquisition. Never breaks the page.
export async function AcquisitionCard({ rangeKey = '30', from, to }: { rangeKey?: string; from?: string; to?: string }) {
  let rep: ReturnType<typeof buildReport> | null = null;
  try { const { raw } = await loadRaw(createServiceClient()); rep = buildReport(raw, { range: rangeBounds(rangeKey, { from, to }), rangeLabel: rangeBounds(rangeKey, { from, to }).label }); } catch { /* shown below */ }
  const na = <span style={{ color: 'var(--slate)' }}>{NOT_AVAILABLE}</span>;
  if (!rep) return <Section title="How are we growing?"><p style={{ color: 'var(--slate)' }}>Not available yet. Run the latest database update (0048), then open <a href="/admin/acquisition">Acquisition &amp; Referral Intelligence</a>.</p></Section>;
  const e = rep.selected; const ranked = rep.sources.filter((r) => r.key !== 'unknown' && (r.paid > 0 || r.students >= rep!.minSample));
  const topSource = ranked[0]; const topCamp = rep.campaigns.find((c) => c.paid > 0 || c.people > 0); const topPost = rep.content.find((c) => c.signups > 0 || c.customers > 0); const topRef = rep.referral.topByQuality[0];
  const trend = rep.cohorts.byType.filter((c) => c.key.endsWith('|student')).slice(0, 3).map((c) => `${c.month}: ${c.people}`).reverse().join(' → ');
  return (
    <Section title="How are we growing?" hint={`${rep.range.from || rep.range.to ? 'Selected period' : 'All time'}. Counts only. ${rep.visitorsNote}`}>
      <a href="/admin/acquisition" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <p style={{ margin: '0 0 0.4rem', fontSize: '0.92rem' }}>New accounts: <strong>{e.registrations}</strong> &middot; Activated: <strong>{e.activated}</strong> &middot; Paid: <strong>{e.paidCustomers}</strong> &middot; Revenue: <strong>{inr(e.revenue)}</strong> &middot; Conversion: <strong>{rep.studentEconomics.conversion === null ? 'Insufficient data' : rep.studentEconomics.conversion + '%'}</strong></p>
        <p style={{ margin: '0 0 0.4rem', fontSize: '0.9rem' }}>Top source: {topSource ? <>{sourceLabel(topSource.key)} ({topSource.people} sign-ups, {topSource.paid} paid)</> : na} &middot; Top campaign: {topCamp ? topCamp.name : na} &middot; Top post: {topPost ? topPost.slug : na} &middot; Top referrer: {topRef ? `${topRef.role} ${topRef.code}` : na}</p>
        <p style={{ margin: '0 0 0.4rem', fontSize: '0.9rem' }}>Referral sign-ups: {e.referrals} &middot; Referred customers: {e.referredCustomers} &middot; Student sign-ups by month: {trend || na}</p>
        <p style={{ margin: 0, fontSize: '0.9rem' }}><strong>Next:</strong> {rep.actions[0]?.text} <span style={{ textDecoration: 'underline' }}>Open Acquisition &amp; Referral Intelligence</span></p>
      </a>
    </Section>
  );
}
