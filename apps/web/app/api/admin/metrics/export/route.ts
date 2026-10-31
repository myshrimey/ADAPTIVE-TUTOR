import { csvResponse, fileResponse } from '@/lib/export';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase-server';
import { loadFounderMetrics } from '@adaptive-tutor/core';

// Founder-only CSV of the current metrics, one row, so the weekly numbers can be pasted into the Excel tracker.
export async function GET() {
  try {
    await requireAdmin();
    const m = await loadFounderMetrics(createServiceClient());
    const rows: [string, string | number | null][] = [
      ['date', m.generatedAt.slice(0, 10)],
      ['students', m.students.total],
      ['finished_diagnostic', m.students.activated],
      ['active_7_days', m.activity.activeLast7],
      ['active_30_days', m.activity.activeLast30],
      ['sessions_7_days', m.activity.sessionsLast7],
      ['sessions_30_days', m.activity.sessionsLast30],
      ['sessions_per_active_student_30', m.activity.sessionsPerActiveStudent30],
      ['sessions_finished_percent_30', m.activity.finishedPercent],
      ['came_back_within_7_days_percent', m.activity.returnedWithin7DaysPercent],
      ['paid_or_early_access_students', m.money.paidPlanStudents],
      ['free_students', m.money.freePlanStudents],
      ['confirmed_payments', m.money.confirmedPayments],
      ['confirmed_amount_inr', m.money.confirmedAmountInr],
      ['payments_pending', m.money.pendingPayments],
      ['teachers_approved', m.teachers.approved],
      ['teacher_reviews_30_days', m.teachers.reviewsLast30],
    ];
    const csv = 'metric,value\n' + rows.map(([k, v]) => `${k},${v ?? ''}`).join('\n') + '\n';
    return csvResponse(csv, { kind: 'metrics', title: 'Metrics export', classification: 'internal', filename: `sahayak-metrics-${m.generatedAt.slice(0, 10)}.csv` });
  } catch (err: any) {
    return new Response(err.message ?? 'error', { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
