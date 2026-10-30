import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { friendlyFeedbackStatus } from '@adaptive-tutor/core';

// A signed-in person sees ONLY their own reports (the student id comes from the session, never from the browser) and a plain status.
// No priority, internal notes, reviewer names or other people's reports are ever returned.
export async function GET() {
  try {
    const sb = await createServerClient(); const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ data: null, error: 'not_signed_in' }, { status: 401 });
    const service = createServiceClient();
    const { data: me } = await service.from('students').select('id, users!inner(auth_user_id)').eq('users.auth_user_id', user.id).maybeSingle();
    if (!me) return NextResponse.json({ data: [], error: null });
    const { data: rows } = await service.from('feedback').select('id, created_at, message, cluster_id').eq('student_id', me.id).order('created_at', { ascending: false }).limit(30);
    const list = (rows ?? []) as any[]; const ids = [...new Set(list.map((r) => r.cluster_id).filter(Boolean))];
    const st = new Map<string, string>();
    if (ids.length) { const { data: cs } = await service.from('feedback_clusters').select('id, status').in('id', ids as string[]); for (const c of (cs ?? []) as any[]) st.set(c.id, c.status); }
    return NextResponse.json({ data: list.map((r) => ({ date: String(r.created_at).slice(0, 10), message: String(r.message ?? '').slice(0, 200), ...friendlyFeedbackStatus(r.cluster_id ? st.get(r.cluster_id) : null) })), error: null });
  } catch { return NextResponse.json({ data: null, error: 'failed' }, { status: 500 }); }
}
