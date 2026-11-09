// v114: INTERLEAVING rules (design: docs/INTERLEAVING_DESIGN.md). PURE functions only, and NOT connected to the tutor yet.
// Interleaving = now and then the tutor asks one question from a DIFFERENT skill the student already handles, so practice is mixed
// instead of blocked. The orchestrator does not import this file; wiring it in needs a supervised trial (see the design).
// The answer to an interleaved question would be ordinary evidence for ITS OWN skill; it never changes the current skill's mastery.

/** Master switch. Stays false until the wiring in the design has been tested with real sessions. */
export const INTERLEAVE_ENABLED = false;
/** On the 3rd, 8th, 13th ... answer of a session (n % 5 === 3), so it does not land on the self-explanation turns (n % 4 === 2) except rarely. */
export const INTERLEAVE_EVERY = 5;
export const INTERLEAVE_MIN_CANDIDATE_MASTERY = 60;
export const INTERLEAVE_MIN_CURRENT_MASTERY = 50;
export const INTERLEAVE_MAX_CURRENT_MASTERY = 90;

export interface InterleaveSkill { id: string; name: string; chapterId: string | null; retired?: boolean; mastery: number | null; lastSeenAt: string | null }

/**
 * Choose the skill to mix in. Only skills with RECORDED mastery at or above the minimum (no evidence, no interleaving), never the
 * current one, never a retired (CBSE-removed) one. Prefer a different chapter, then the one seen longest ago; ties by id so it is repeatable.
 */
export function pickInterleaveSkill(skills: InterleaveSkill[], current: { id: string; chapterId: string | null }): InterleaveSkill | null {
  const ok = skills.filter((s) => s.id !== current.id && !s.retired && s.mastery != null && Number.isFinite(s.mastery) && (s.mastery as number) >= INTERLEAVE_MIN_CANDIDATE_MASTERY && !!s.lastSeenAt);
  if (!ok.length) return null;
  const rank = (s: InterleaveSkill) => [s.chapterId !== null && s.chapterId === current.chapterId ? 1 : 0, Date.parse(s.lastSeenAt as string) || 0, s.id] as const;
  return ok.slice().sort((a, b) => { const x = rank(a), y = rank(b); return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0); })[0];
}

/**
 * Should THIS turn be an interleaved question instead of the next ordinary one? Same guard rails as the self-explanation turn:
 * only while practising (never repair, remediation, review, a test, a challenge, a student command, the last question, a session
 * that was already made gentler), and never right after a miss or a hint (the student should not be pulled away from a struggle).
 */
export function shouldInterleave(i: { base: string; masteryScore: number; history: { correct: boolean; hints: number }[]; finished: boolean; finalQuestion: boolean; gentler: boolean; goal?: string | null; candidate: InterleaveSkill | null }, enabled: boolean = INTERLEAVE_ENABLED): boolean {
  if (!enabled || i.finished || i.finalQuestion || i.gentler || !i.candidate) return false;
  if (i.goal === 'test_myself') return false;
  if (i.base !== 'GUIDED_PRACTICE' && i.base !== 'SOCRATIC') return false;
  if (!(i.masteryScore >= INTERLEAVE_MIN_CURRENT_MASTERY && i.masteryScore < INTERLEAVE_MAX_CURRENT_MASTERY)) return false;
  const n = i.history.length;
  if (n < 3 || n % INTERLEAVE_EVERY !== 3) return false;
  const last = i.history[n - 1];
  return last.correct && last.hints === 0;
}
