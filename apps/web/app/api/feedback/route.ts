import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { logEvent, parseUserAgent, roleFromPage, cleanContext, isPositive, FB_IMPACTS, FB_KINDS, getAccess } from '@adaptive-tutor/core';
import { createServiceClient } from '@/lib/supabase-server';
import { headers } from 'next/headers';

interface FeedbackBody {
  message: string;
  rating?: number; // 1-5
  page?: string;
  contactEmail?: string; // for a visitor who isn't signed in and wants a reply
  kind?: string; // v73: what sort of thing it is (see FB_KINDS)
  impact?: string; // v73: how it affected the person (see FB_IMPACTS)
  context?: Record<string, unknown>; // v73: optional short ids (question, session, mock...)
}

// Deliberately works whether the caller is signed in or not — a parent
// evaluating the app before their child has an account should be able to
// leave feedback too. Uses the session-bound client (not the service
// client), so the insert goes through RLS's feedback_insert_anyone policy
// rather than bypassing it.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FeedbackBody;
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ data: null, error: 'missing_message' }, { status: 400 });
    }
    if (body.rating != null && (body.rating < 1 || body.rating > 5)) {
      return NextResponse.json({ data: null, error: 'rating_out_of_range' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Soft lookup: attach the student's id when there's a session, but never
    // require one — an unauthenticated visitor's feedback still goes in.
    let studentId: string | null = null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: row } = await supabase
        .from('students')
        .select('id, users!inner(auth_user_id)')
        .eq('users.auth_user_id', user.id)
        .maybeSingle();
      studentId = row?.id ?? null;
    }

    // v73: context captured on the server. The role is inferred from the page and a student lookup, never taken from the browser.
    const h = await headers();
    const ua = parseUserAgent(h.get('user-agent'));
    const kind = body.kind && body.kind in FB_KINDS ? body.kind : null;
    const impact = body.impact && body.impact in FB_IMPACTS ? body.impact : null;
    const role = roleFromPage(body.page, !!studentId, !!user);
    let plan: string | null = null;
    if (studentId) { try { const a = await getAccess(createServiceClient(), studentId); plan = a.status === 'active' ? a.planCode : 'free'; } catch { plan = null; } }
    const context = { ...cleanContext(body.context), device: ua.device, browser: ua.browser, os: ua.os, locale: (h.get('accept-language') ?? '').split(',')[0].slice(0, 12) || null, appVersion: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || null, plan };
    const row = { student_id: studentId, contact_email: body.contactEmail?.trim() || null, page: body.page ?? null, rating: body.rating ?? null, message };
    let { error } = await supabase.from('feedback').insert({ ...row, kind, impact, role, source: 'in_app', context, positive: isPositive(message, body.rating ?? null, kind) });
    // Human-first fallback: if the newer columns are not installed yet (database update 0047 not run), the message is still saved the old way. Feedback is never lost.
    if (error) ({ error } = await supabase.from('feedback').insert(row));
    if (error) throw error;

    await logEvent({ studentId, eventType: 'feedback_submitted', payload: { page: body.page ?? null, rating: body.rating ?? null } });

    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
