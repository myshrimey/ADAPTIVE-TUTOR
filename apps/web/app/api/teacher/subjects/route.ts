import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireApprovedTeacher } from '@/lib/teacher';

export async function GET() {
  try {
    await requireApprovedTeacher();
    const { data } = await createServiceClient().from('subjects').select('id, name, status').in('status', ['ready', 'pilot']).order('name');
    return NextResponse.json({ data: data ?? [], error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 403 });
  }
}
