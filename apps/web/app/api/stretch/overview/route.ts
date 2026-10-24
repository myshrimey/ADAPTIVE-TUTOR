import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { stretchSummary, loadStretchSettings, STYLE_LABEL, STYLE_NOTE, STRETCH_STYLES } from '@adaptive-tutor/core';

// The student's own Challenge-zone overview: open topics, counts and badges. No answer keys.
export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const service = createServiceClient();
    const [sum, settings] = await Promise.all([stretchSummary(service, studentId), loadStretchSettings(service)]);
    return NextResponse.json({ data: { ...sum, enabled: settings.enabled, dailyLimit: settings.dailyLimit, unlockScore: settings.unlockScore, styles: STRETCH_STYLES.map((s) => ({ id: s, label: STYLE_LABEL[s] })), note: STYLE_NOTE }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
