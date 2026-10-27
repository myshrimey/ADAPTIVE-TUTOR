import { createServiceClient } from '@/lib/supabase-server';
import { overview, growthBrief, fmtN, fmtInr, type Overview, type GrowthBrief } from '@adaptive-tutor/core';
import { Section } from '@/components/founder/Cards';
import { PLATFORM_LABEL } from '@/lib/social-labels';

// Founder Command Centre summary. Never breaks the page: if the Social Growth tables are not installed yet it says so in one line.
export async function SocialGrowthCard() {
  let o: Overview | null = null, b: GrowthBrief | null = null;
  try { const s = createServiceClient(); [o, b] = await Promise.all([overview(s), growthBrief(s)]); } catch { /* shown below */ }
  return (
    <Section title="Social growth: today's brief" hint="Posts are made and published by you; nothing is posted automatically.">
      {!o || !b ? <p style={{ color: 'var(--slate)' }}>Not available yet. Apply the latest database update (0046), then open the <a href="/admin/social-growth">Social Media Growth Engine</a>.</p> : (
        <a href="/admin/social-growth" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <p style={{ margin: '0 0 0.4rem' }}>{b.next ? <><strong>Post today:</strong> {PLATFORM_LABEL[b.next.platform] ?? b.next.platform} for {b.next.audience.replace(/_/g, ' ')}. {b.next.why}{b.next.cta ? <> CTA: <em>{b.next.cta}</em></> : null}</> : <><strong>Nothing planned for today.</strong> Open the engine and press &ldquo;Generate today&rsquo;s content&rdquo;.</>}</p>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.9rem' }}>Today: {o.today} &middot; Waiting for approval: {o.pending} &middot; Published this week: {o.publishedWeek} &middot; Backlog: {o.backlog}</p>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.9rem' }}>Leads (entered): {fmtN(o.leads)} &middot; Sign-ups (entered): {fmtN(o.registrations)} &middot; Customers (entered): {fmtN(o.conversions)} &middot; Revenue (entered): {fmtInr(o.revenue)}</p>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.9rem' }}>Best platform: {o.bestPlatform ? PLATFORM_LABEL[o.bestPlatform] ?? o.bestPlatform : 'Not enough data yet'} &middot; Yesterday&rsquo;s best: {b.yesterdayBest ? `${PLATFORM_LABEL[b.yesterdayBest.platform] ?? b.yesterdayBest.platform} post` : 'Not available'}</p>
          <p style={{ margin: 0, fontSize: '0.9rem' }}><strong>One suggestion:</strong> {b.recommendation} <span style={{ textDecoration: 'underline' }}>Open Social Media Growth Engine</span></p>
        </a>
      )}
    </Section>
  );
}
