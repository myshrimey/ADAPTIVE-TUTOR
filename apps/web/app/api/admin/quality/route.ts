import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { QUALITY_GATES, loadGateReports } from '@adaptive-tutor/core';

// Founder-only. action 'signoff' records one gate as passed / not passed (with a note);
// 'promote' sets a subject to Ready ONLY if all ten gates are signed off right now;
// 'demote' puts a subject back to Pilot.
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const subjectId = String(body.subjectId ?? '');
    const action = String(body.action ?? '');
    if (!subjectId) return NextResponse.json({ data: null, error: 'invalid_subject' }, { status: 400 });
    const service = createServiceClient();
    const { data: subject } = await service.from('subjects').select('id, status').eq('id', subjectId).maybeSingle();
    if (!subject) return NextResponse.json({ data: null, error: 'subject_not_found' }, { status: 404 });

    if (action === 'signoff') {
      const gate = Number(body.gate);
      if (!QUALITY_GATES.some((g) => g.gate === gate)) return NextResponse.json({ data: null, error: 'invalid_gate' }, { status: 400 });
      const note = String(body.note ?? '').trim().slice(0, 1000) || null;
      const { error } = await service.from('subject_gate_signoffs').upsert(
        { subject_id: subjectId, gate, passed: !!body.passed, note, signed_by: admin.email, updated_at: new Date().toISOString() },
        { onConflict: 'subject_id,gate' }
      );
      if (error) throw error;
      return NextResponse.json({ data: { saved: true }, error: null });
    }

    if (action === 'promote') {
      const reports = await loadGateReports(service);
      const r = reports.find((x) => x.subjectId === subjectId);
      if (!r || !r.allPassed) return NextResponse.json({ data: null, error: 'all_ten_gates_required' }, { status: 400 });
      const { error } = await service.from('subjects').update({ status: 'ready' }).eq('id', subjectId);
      if (error) throw error;
      return NextResponse.json({ data: { status: 'ready' }, error: null });
    }

    if (action === 'demote') {
      const { error } = await service.from('subjects').update({ status: 'pilot' }).eq('id', subjectId);
      if (error) throw error;
      return NextResponse.json({ data: { status: 'pilot' }, error: null });
    }
    return NextResponse.json({ data: null, error: 'invalid_action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
