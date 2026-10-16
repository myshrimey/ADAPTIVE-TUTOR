-- Supports generating fresh questions (with a worked solution) via AI,
-- instead of needing every question hand-authored into the bank up front —
-- see packages/core/question-engine/ai-question-generator.ts.
--
-- 1. `questions.explanation` was referenced by ensure-explanation.ts's
--    write-through cache (and by migration 0008's matching RLS policy) but
--    was never actually added as a column — a dormant bug, since nothing
--    happened to call it that way yet. Adding it now, matching
--    diagnostic_questions (migration 0005), both so that gap is closed and
--    so a freshly AI-generated learning-session question can store its
--    solution immediately instead of only generating one lazily on a miss.
-- 2. `diagnostic_questions` gets the same `source`/`validated` columns
--    `questions` already has, so an AI-generated quiz question (used when a
--    skill's bank is too thin to fill a 5-question post-session quiz) can be
--    tagged and persisted the same way, growing that bank through real use
--    rather than needing speculative pre-authoring. Existing rows default to
--    'bank'/true, so nothing about today's diagnostic test behavior changes.

alter table questions
  add column if not exists explanation text;

alter table diagnostic_questions
  add column if not exists source text not null default 'bank' check (source in ('bank','generated')),
  add column if not exists validated boolean not null default true;
