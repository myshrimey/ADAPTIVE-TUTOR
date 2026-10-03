// Server-side Supabase clients.
//
// createServerClient() — bound to the caller's session (via cookies), subject to RLS.
// Use this for anything that reads/writes data the student themselves owns.
//
// createServiceClient() — uses the service-role key, bypasses RLS entirely.
// Use ONLY inside packages/core services that write derived state the client
// should never write directly: mastery_states, question_attempts, misconceptions,
// learning_events. Never import this in a client component. Never pass a
// client-supplied studentId into a query built with this client without
// re-deriving it from the authenticated session first — RLS isn't there to
// catch a mistake here.

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Next.js 15: cookies() is async, so this is too — every caller now does
// `await createServerClient()`. @supabase/ssr 0.5+ dropped the old
// get/set/remove cookie interface for getAll/setAll.
export async function createServerClient() {
  const cookieStore = await cookies();
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component that can't set cookies — fine,
            // the middleware refreshes the session on the next request.
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Resolve the internal `students.id` for the currently authenticated user. Throws if unauthenticated. */
export async function getCurrentStudentId(): Promise<string> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthenticated');

  const { data: row, error } = await supabase
    .from('students')
    .select('id, users!inner(auth_user_id)')
    .eq('users.auth_user_id', user.id)
    .single();
  if (error || !row) throw new Error('student_not_found');
  return row.id;
}
