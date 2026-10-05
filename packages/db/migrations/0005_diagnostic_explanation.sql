-- Adds an optional per-question explanation, shown on the diagnostic review
-- screen (apps/web/app/diagnostic/page.tsx) alongside whether the student
-- got it right. Nullable on purpose: none of the existing seed content
-- (maths, science, social-science) has authored explanations yet, so the
-- review screen falls back to showing the correct answer on its own when
-- this is null. New diagnostic JSON can add an "explanation" field per
-- question going forward (packages/db/seed-diagnostic.js already passes it
-- through if present).
alter table diagnostic_questions add column if not exists explanation text;
