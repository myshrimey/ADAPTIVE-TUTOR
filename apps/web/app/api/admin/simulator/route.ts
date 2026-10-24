import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { saveSim, writeAudit } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    const data = await saveSim(service, b.inputs);
    await writeAudit(service, { actorEmail: admin.email, action: 'save', entity: 'financial_simulator_inputs' });
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
