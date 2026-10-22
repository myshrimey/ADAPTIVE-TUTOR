import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { afterActivity, featureOn } from '@adaptive-tutor/core';
import { engineCtx } from '@/lib/engagement';

export const runtime = 'nodejs';
// Small summary for the dashboard card. Also brings engagement records up to date (safe to repeat).
export async function GET() {
  try {
    const studentId = await getCurrentStudentId(); const service = createServiceClient(); const ctx = await engineCtx(service);
    const r = await afterActivity(service, studentId, ctx);
    const { data: row } = await service.from('student_engagement').select('xp_total').eq('student_id', studentId).maybeSingle();
    return NextResponse.json({ data: { streak: featureOn(ctx.settings, studentId, 'streaks') ? { current: r.streak.current, message: r.streak.message, state: r.streak.state } : null, xp: featureOn(ctx.settings, studentId, 'xp') ? row?.xp_total ?? 0 : null, mission: r.mission ? { title: r.mission.title, status: r.mission.status, items: r.mission.items.map((i) => ({ label: i.label, progress: i.progress, target: i.target, done: i.done, href: i.href })) } : null, newly: r.unlocked.map((u) => u.title) }, error: null });
  } catch (err: any) { return NextResponse.json({ data: null, error: String(err?.message ?? 'failed').slice(0, 100) }, { status: 401 }); }
}
