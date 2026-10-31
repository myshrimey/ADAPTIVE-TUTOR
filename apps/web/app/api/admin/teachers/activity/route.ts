import { csvResponse, fileResponse } from '@/lib/export';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase-server';
import { monthRangeIst } from '@adaptive-tutor/core';

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

// Founder-only CSV: how many questions each teacher reviewed in a month (IST). Optional ?rate=N (rupees per
// review) adds an amount column. Teacher pay is the founder's decision; this only counts the work.
export async function GET(request: Request) {
  try {
    await requireAdmin('academic');
    const url = new URL(request.url);
    const month = url.searchParams.get('month') || new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 7);
    const range = monthRangeIst(month);
    if (!range) return new Response('invalid_month', { status: 400 });
    const rateRaw = Number(url.searchParams.get('rate'));
    const rate = Number.isFinite(rateRaw) && rateRaw > 0 ? rateRaw : null;
    const service = createServiceClient();
    const { data: reviews } = await service.from('content_reviews').select('teacher_user_id, verdict').gte('updated_at', range.from).lt('updated_at', range.to).limit(50000);
    const per = new Map<string, { total: number; approve: number; needs_fix: number; reject: number }>();
    for (const r of reviews ?? []) {
      const p = per.get(r.teacher_user_id) ?? { total: 0, approve: 0, needs_fix: 0, reject: 0 };
      p.total++;
      (p as any)[r.verdict]++;
      per.set(r.teacher_user_id, p);
    }
    const ids = [...per.keys()];
    const { data: tps } = ids.length ? await service.from('teacher_profiles').select('user_id, display_name').in('user_id', ids) : { data: [] as any[] };
    const name = new Map((tps ?? []).map((t: any) => [t.user_id, t.display_name]));
    const head = ['teacher', 'reviews', 'looks_correct', 'needs_fix', 'rejected', ...(rate ? ['amount_inr'] : [])].join(',');
    const lines = [...per.entries()].sort((a, b) => b[1].total - a[1].total).map(([id, p]) =>
      [csvCell(name.get(id) ?? 'Teacher'), p.total, p.approve, p.needs_fix, p.reject, ...(rate ? [Math.round(p.total * rate)] : [])].join(',')
    );
    return csvResponse([head, ...lines].join('\n') + '\n', { kind: 'teacher-reviews', title: `Teacher review activity ${month}`, classification: 'confidential', filename: `teacher-reviews-${month}.csv` });
  } catch (err: any) {
    return new Response(err.message ?? 'error', { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
