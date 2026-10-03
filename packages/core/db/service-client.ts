import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Used ONLY by core services that write derived state the client should never
// write directly (learning_events, mastery_states, question_attempts,
// misconceptions) — see packages/db/migrations/0002_rls_policies.sql for why
// those tables have no client-writable policy. Deliberately independent of
// apps/web/lib/supabase-server.ts (which needs next/headers) so `core` stays
// usable from a future non-Next.js backend without change.
//
// Lazily constructed and cached so importing this module doesn't require the
// env vars to be set at module-load time (useful in tests that mock it out).
let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('missing_service_credentials: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
