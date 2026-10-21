import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadCommandCentre, rangeBounds } from '@adaptive-tutor/core';
import { Stat, Section, Grid } from '@/components/founder/Cards';
export const dynamic = 'force-dynamic';
// Investor-safe numbers: totals and averages only. No names, no contact details, no individual child or family data. Print or save as PDF from the browser to share.
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const d = await loadCommandCentre(createServiceClient(), rangeBounds('all'));
  return (<main className="page"><div className="shell shell--narrow"><div style={{ paddingTop: 'var(--space-3)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>Investor-safe metrics (all time)</h1>
    <p style={{ color: 'var(--slate)' }}>Aggregated only. Each figure keeps its label (ACTUAL / ESTIMATED / ASSUMED) so you never overstate. Revenue, growth and retention shown here come from records in Sahayak. Do not add child names or family details to anything you share. <a href="javascript:window.print()">Print / save as PDF</a></p><AdminNav /></div>
    <Section title="Users"><Grid><Stat label="Registered users" m={d.users.registered} /><Stat label="Students" m={d.users.students} /><Stat label="Parents" m={d.users.parents} /><Stat label="Tutors" m={d.users.tutors} /><Stat label="Coaching centres" m={d.users.centres} /><Stat label="Schools / institutions" m={d.b2b.schools} /><Stat label="Active last 30 days" m={d.users.mau} /><Stat label="Return within 7 days" m={d.users.returnRate} suffix="%" /><Stat label="Diagnostic completion" m={d.users.diagnosticCompletion} suffix="%" /><Stat label="Paid conversion" m={d.users.paidConversion} suffix="%" /></Grid></Section>
    <Section title="Revenue and economics"><Grid><Stat label="Total revenue" m={d.revenue.total} money /><Stat label="Revenue this month (MRR proxy)" m={d.today.revenueMonth} money /><Stat label="Contribution margin" m={d.margins.contributionMargin} suffix="%" /><Stat label="AI cost per paying customer" m={d.unit.aiCostPerCustomer} money /><Stat label="CAC" m={d.unit.cac} money /><Stat label="Revenue per customer to date" m={d.unit.ltvToDate} money /></Grid></Section>
    <Section title="Product"><Grid><Stat label="Average mastery change per finished session" m={d.learning.avgMasteryChange} /><Stat label="Handwritten papers marked" m={d.handwritten.papers} /><Stat label="Paid tutor/centre plans" m={d.b2b.paidOrgPlans} /></Grid></Section>
  </div></main>);
}
