import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { saveExamSession, deleteExamSession, createCurriculumVersion, moveCurriculumVersion, saveCountryPrice, deleteCountryPrice, writeAudit } from '@adaptive-tutor/core';

// Admin only. Exam sessions, curriculum version register and country prices. Every change is written to the audit log.
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    const audit = (action: string, entity: string, entityId?: string | null, detail?: Record<string, unknown>) => writeAudit(service, { actorEmail: admin.email, action, entity, entityId, detail });
    switch (b.action) {
      case 'exam_save': { const id = await saveExamSession(service, b.session); await audit('save', 'exam_session', id, { label: b.session?.session_label, status: b.session?.status }); return NextResponse.json({ data: { id }, error: null }); }
      case 'exam_delete': { await deleteExamSession(service, String(b.id)); await audit('delete', 'exam_session', String(b.id)); return NextResponse.json({ data: { ok: true }, error: null }); }
      case 'curriculum_create': { const id = await createCurriculumVersion(service, b.version); await audit('create', 'curriculum_version', id, { year: b.version?.academic_year, class: b.version?.class_level }); return NextResponse.json({ data: { id }, error: null }); }
      case 'curriculum_move': { await moveCurriculumVersion(service, String(b.id), String(b.to), admin.email); await audit('move_to_' + String(b.to), 'curriculum_version', String(b.id)); return NextResponse.json({ data: { ok: true }, error: null }); }
      case 'price_save': { await saveCountryPrice(service, b.price); await audit('save', 'country_price', null, { country: b.price?.country, product: b.price?.product_code, active: b.price?.active === true }); return NextResponse.json({ data: { ok: true }, error: null }); }
      case 'price_delete': { await deleteCountryPrice(service, String(b.id)); await audit('delete', 'country_price', String(b.id)); return NextResponse.json({ data: { ok: true }, error: null }); }
      default: return NextResponse.json({ data: null, error: 'unknown_action' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
