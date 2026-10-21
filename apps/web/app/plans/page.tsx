import { createServiceClient } from '@/lib/supabase-server';
import { loadProducts, loadOffers, loadSettings, quotePrice, FOUNDER, FREE_CORE_NOTICE, type Product } from '@adaptive-tutor/core';
import { PriceLine, inr } from '@/components/commerce/PriceLine';
import { CardTerms, PageTerms } from '@/components/commerce/TermsNote';
import { CtaLink } from '@/components/commerce/CtaLink';
import { TrackView } from '@/components/commerce/TrackView';
import { PlanStatus } from '@/components/commerce/PlanStatus';
import { WtpPrompt } from '@/components/commerce/WtpPrompt';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plans — Sahayak' };

// Every number on this page comes from the database (/admin/pricing). Nothing is hard-coded here.
const ROWS: [string, boolean[]][] = [
  // Individual, Subject, Founding Family, Tutor, Centre
  ['Diagnostic', [true, true, true, true, true]],
  ['Adaptive learning', [true, true, true, true, true]],
  ['Question bank', [true, true, true, true, true]],
  ['Chapter assessments', [true, true, true, true, true]],
  ['Board preparation', [true, true, true, true, true]],
  ['Parent dashboard', [true, true, true, true, true]],
  ['Progress analytics', [true, true, true, true, true]],
  ['Confidence trends', [false, true, true, true, true]],
  ['Board readiness', [true, true, true, true, true]],
  ['Tutor dashboard', [false, false, false, true, true]],
  ['Batch management', [false, false, false, false, true]],
  ['Parent reports', [true, true, true, true, true]],
  ['Class XI transition', [false, false, true, false, false]],
  ['Priority support', [false, false, true, true, true]],
];

function Card({ p, q, cta, href, evt }: { p: Product; q: ReturnType<typeof quotePrice>; cta: string; href: string; evt: string }) {
  return (
    <div className={`plan-card${p.recommended ? ' plan-card--featured' : ''}`}>
      {p.recommended && <span className="plan-card__badge">Recommended</span>}
      <h3 className="plan-card__name">{p.name}</h3>
      <PriceLine product={p} quote={q} />
      {p.subtitle && <p className="plan-card__desc">{p.subtitle}</p>}
      <ul className="plan-card__features">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
      {p.validityUntil && <p style={{ fontSize: '0.85rem' }}>Valid through {new Date(p.validityUntil + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
      <CtaLink href={href} event={evt} productCode={p.code} source="plans" className={`btn ${p.recommended ? 'btn--accent' : 'btn--ghost'}`}>{cta}</CtaLink>
      <CardTerms />
    </div>
  );
}

export default async function PlansPage() {
  const service = createServiceClient();
  const [products, offers, settings] = await Promise.all([loadProducts(service, true), loadOffers(service), loadSettings(service)]);
  const by = (k: Product['kind']) => products.filter((p) => p.kind === k);
  const q = (p: Product) => quotePrice(p, offers, null, 1);
  const family = by('family'), individual = by('individual'), subjects = by('subject'), mock = by('mock'), tutor = by('tutor'), centre = by('centre');
  const cheapest = subjects.length ? Math.min(...subjects.map((s) => s.priceInr)) : null;
  const credits = (p?: Product) => (p ? (p.creditsPerMonth ? `${p.creditsPerMonth} a month` : `${p.mockCredits}`) : '—');
  const fa = settings.founding_access;

  return (
    <main className="page">
      <TrackView event="pricing_page_view" source="plans" />
      <div className="shell">
        <div className="hero-banner" style={{ marginTop: 'var(--space-4)' }}>
          <p className="hero__eyebrow">CBSE Class 10 · 2027 · {fa.label}</p>
          <h1 style={{ fontSize: 'var(--step-3)' }}>Choose the right Sahayak plan for your child.</h1>
          <p className="hero__lede">Know where your child stands. Know what needs improvement. Prepare with evidence, not guesswork. Works alongside school and tuition.</p>
        </div>

        <PlanStatus />

        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Start free</h2>
          <p>The free founding access lets you try the diagnostic, personalised practice, chapter quizzes, a limited AI tutor and a basic parent report, with daily limits. Then add what you need.</p>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate)' }}>{FREE_CORE_NOTICE.line} {FREE_CORE_NOTICE.terms}</p>
          <p><a className="btn btn--ghost" href="/">Create a free account</a></p>
        </section>

        {family.length > 0 && <section style={{ marginTop: 'var(--space-3)' }}><div className="plan-grid">{family.map((p) => <Card key={p.code} p={p} q={q(p)} cta="Apply for Founding Access" href={`/plans/buy/${p.code}`} evt="plan_selected" />)}</div>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate)' }}>Class XI Transition Benefit: founding families receive a transition assessment, a readiness review, priority access to future Sahayak programmes and preferential pricing for them. It is not unlimited Class XI or XII access.</p></section>}

        {(subjects.length > 0 || individual.length > 0) && <section style={{ marginTop: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Subject plans{cheapest !== null ? ` — from ${inr(cheapest)}` : ''}</h2>
          <p>Choose 1 to 5 subjects. Select the subjects your child is registered for.</p>
          <div className="plan-grid">{[...individual, ...subjects].map((p) => <Card key={p.code} p={p} q={q(p)} cta="Choose Subjects" href={`/plans/buy/${p.code}`} evt="plan_selected" />)}</div>
        </section>}

        {mock.length > 0 && <section style={{ marginTop: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Handwritten mock evaluation</h2>
          <TrackView event="mock_offer_viewed" source="plans" />
          <div className="plan-grid">{mock.map((p) => <Card key={p.code} p={p} q={q(p)} cta="Buy Mock Evaluation" href={`/plans/buy/${p.code}`} evt="plan_selected" />)}</div>
          <p style={{ fontSize: '0.88rem' }}>Write on paper. Upload your answers. Understand where marks were lost. The number of answer-sheet images allowed depends on the examination you choose. AI marking is a suggestion; uncertain answers are checked by a teacher.</p>
        </section>}

        {(tutor.length > 0 || centre.length > 0) && <section style={{ marginTop: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>For tutors and coaching centres</h2>
          <div className="plan-grid">
            {tutor.map((p) => <Card key={p.code} p={p} q={q(p)} cta="Apply as Founding Tutor" href="/plans/apply/tutor" evt="upgrade_clicked" />)}
            {centre.map((p) => <Card key={p.code} p={p} q={q(p)} cta="Apply as Founding Centre" href="/plans/apply/centre" evt="upgrade_clicked" />)}
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate)' }}>Tutor and centre plans start after a short conversation with the Sahayak team; applying does not charge anything.</p>
        </section>}

        <section style={{ marginTop: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Compare plans</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Scroll sideways on a phone.</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}><th style={{ padding: '0.4rem' }}>Feature</th><th>Individual</th><th>Subject</th><th>Founding Family</th><th>Tutor</th><th>Coaching Centre</th></tr></thead>
              <tbody>
                {ROWS.map(([label, v]) => <tr key={label} style={{ borderBottom: '1px solid var(--line)' }}><td style={{ padding: '0.4rem' }}>{label}</td>{v.map((x, i) => <td key={i} aria-label={x ? 'Included' : 'Not included'}>{x ? '✓' : '—'}</td>)}</tr>)}
                <tr style={{ borderBottom: '1px solid var(--line)' }}><td style={{ padding: '0.4rem' }}>Handwritten evaluations</td><td>{credits(individual[0])}</td><td>1–4 by plan</td><td>{credits(family[0])}</td><td>{credits(tutor[0])}</td><td>{credits(centre[0])}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <WtpPrompt feature="board_readiness" title="Detailed Board Readiness Report" />

        <section style={{ marginTop: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Other ways to be part of Sahayak</h2>
          <p><a href="/plans/apply/subject_request">Request a subject</a> that is not available yet · <a href="/plans/apply/partner">I want to learn about becoming a Sahayak Founding Partner</a> (information only, not an investment)</p>
          <p style={{ color: 'var(--slate)' }}>Questions about payment? Call {FOUNDER.contactPhone}.</p>
        </section>

        <PageTerms />
      </div>
    </main>
  );
}
