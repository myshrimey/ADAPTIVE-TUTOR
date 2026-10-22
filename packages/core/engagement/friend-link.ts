import type { SupabaseClient } from '@supabase/supabase-js';
/** Called when a friend round finishes: remembers which round belongs to which player, and closes the challenge when both are done. Never reveals anything to the other player here. */
export async function attachFriendAttempt(service: SupabaseClient, studentId: string, attempt: { id: string; ref: string | null }): Promise<void> {
  const m = String(attempt.ref ?? '').match(/^fc:(.+)$/); if (!m) return;
  const { data: fc } = await service.from('friend_challenges').select('id, created_by_student, joined_by_student, creator_attempt_id, joiner_attempt_id, status').eq('id', m[1]).maybeSingle();
  if (!fc) return;
  const mine = fc.created_by_student === studentId ? 'creator_attempt_id' : fc.joined_by_student === studentId ? 'joiner_attempt_id' : null; if (!mine) return;
  const next = { creator_attempt_id: fc.creator_attempt_id, joiner_attempt_id: fc.joiner_attempt_id, [mine]: attempt.id } as any;
  const both = !!next.creator_attempt_id && !!next.joiner_attempt_id;
  await service.from('friend_challenges').update({ [mine]: attempt.id, ...(both ? { status: 'completed' } : {}) }).eq('id', fc.id);
}
