import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { logEvent } from '@adaptive-tutor/core';

interface FeedbackBody {
  message: string;
  rating?: number; // 1-5
  page?: string;
  contactEmail?: string; // for a visitor who isn't signed in and wants a reply
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

    const { error } = await supabase.from('feedback').insert({
      student_id: studentId,
      contact_email: body.contactEmail?.trim() || null,
      page: body.page ?? null,
      rating: body.rating ?? null,
      message,
    });
    if (error) throw error;

    await logEvent({ studentId, eventType: 'feedback_submitted', payload: { page: body.page ?? null, rating: body.rating ?? null } });

    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
