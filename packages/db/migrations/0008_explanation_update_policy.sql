-- Fixes a real, confirmed bug found during the Day 1 repo audit (Oct 2026):
-- diagnostic_questions and questions have only ever had a SELECT policy
-- (0002_rls_policies.sql), never an UPDATE policy. ensure-explanation.ts's
-- write-through cache (added in v26) has therefore been silently failing to
-- save AI-generated explanations back onto the question row ever since —
-- caught by its own try/catch, only logged server-side, never surfaced to
-- a student or developer. Net effect: a correct, working feature (explanations
-- shown to a student who got a question wrong) that should get instant after
-- the first student misses a question, but was instead regenerating from the
-- AI every single time for every student, for every question, forever.
--
-- This does NOT touch diagnostic score/progress saving (diagnostic_attempts,
-- diagnostic_answers, mastery_states) — those already have correct policies
-- and were not affected by this bug.
--
-- `using (true) with check (true)` is intentionally broad (any authenticated
-- user may update any row in these two tables) because the explanation text
-- is shared, non-sensitive content (same question bank every student reads),
-- not private per-student data — the same trust level already given to
-- reading these tables (diagnostic_questions_read_all / questions_read_all).

drop policy if exists diagnostic_questions_update_explanation on diagnostic_questions;
create policy diagnostic_questions_update_explanation on diagnostic_questions
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists questions_update_explanation on questions;
create policy questions_update_explanation on questions
  for update
  to authenticated
  using (true)
  with check (true);
