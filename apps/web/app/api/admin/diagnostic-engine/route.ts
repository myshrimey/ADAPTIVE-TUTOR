import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { saveEngineSettings, clearGraphCache, writeAudit } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    const v = await saveEngineSettings(service, b.settings);
    clearGraphCache();
    await writeAudit(service, { actorEmail: admin.email, action: 'save', entity: 'baseline_engine', detail: { min: v.minQuestions, max: v.maxQuestions, threshold: v.confidenceThreshold, enabled: v.enabled, allowUnreviewed: v.allowUnreviewed } });
    return NextResponse.json({ data: v, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
