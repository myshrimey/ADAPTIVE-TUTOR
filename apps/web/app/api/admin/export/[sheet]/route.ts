import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase-server';
import { loadSheetData, toCsv } from '@adaptive-tutor/core';

// Founder-only CSV downloads for Google Sheets / Excel: funnel, students, sales, product, economics.
// Optional ?month=YYYY-MM (economics) and ?rate=NN (rupees per teacher review, economics).
export async function GET(req: Request, { params }: { params: Promise<{ sheet: string }> }) {
  try {
    await requireAdmin();
    const { sheet } = await params;
    const url = new URL(req.url);
    const nowIst = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 7);
    const month = url.searchParams.get('month') || nowIst;
    const rate = Math.max(0, Number(url.searchParams.get('rate') || 0)) || 0;
    const d = await loadSheetData(createServiceClient(), { month, teacherRateInr: rate });

    let csv: string;
    switch (sheet) {
      case 'funnel':
        csv = toCsv(['stage', 'count', 'note'], d.funnel.map((f) => [f.label, f.count, f.count === null ? f.note ?? 'not tracked' : f.note ?? '']));
        break;
      case 'students':
        csv = toCsv(
          ['student', 'plan', 'start_date', 'subjects_chosen', 'sessions', 'last_active', 'diagnostic_status', 'mock_attempts', 'report_viewed'],
          d.students.map((s) => [s.student, s.plan, s.start_date, s.subjects_chosen, s.sessions, s.last_active, s.diagnostic_status, s.mock_attempts, s.report_viewed])
        );
        break;
      case 'sales':
        csv = toCsv(
          ['student', 'offer', 'amount_inr', 'payment_method', 'upi_reference', 'verified', 'activation_start', 'expiry', 'created'],
          d.sales.map((s) => [s.student, s.offer, s.amount_inr, s.payment_method, s.upi_reference, s.verified, s.activation_start, s.expiry, s.created])
        );
        break;
      case 'product':
        csv = toCsv(
          ['student', 'sessions', 'questions_answered', 'accuracy_percent', 'independent_accuracy_percent', 'latest_confidence', 'mock_average_percent'],
          d.product.map((p) => [p.student, p.sessions, p.questions_answered, p.accuracy_percent, p.independent_accuracy_percent, p.latest_confidence, p.mock_average_percent])
        );
        break;
      case 'economics': {
        const e = d.economics;
        csv = toCsv(
          ['month', 'revenue_inr', 'paid_students', 'ai_cost_list_inr', 'ai_cost_billed_inr', 'teacher_reviews', 'teacher_rate_inr', 'teacher_cost_inr', 'contribution_inr', 'gross_margin_percent', 'revenue_per_paid_student', 'ai_per_paid_student', 'teacher_per_paid_student', 'contribution_per_paid_student'],
          [[e.month, e.revenueInr, e.paidStudents, e.aiCostListInr, e.aiCostBilledInr, e.teacherReviews, e.teacherRateInr, e.teacherCostInr, e.contributionInr, e.grossMarginPercent, e.perPaidStudent?.revenue ?? null, e.perPaidStudent?.aiList ?? null, e.perPaidStudent?.teacher ?? null, e.perPaidStudent?.contribution ?? null]]
        );
        break;
      }
      default:
        return new Response('unknown sheet', { status: 404 });
    }
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="sahayak-${sheet}-${d.generatedAt.slice(0, 10)}.csv"` } });
  } catch (err: any) {
    return new Response(err.message ?? 'error', { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
