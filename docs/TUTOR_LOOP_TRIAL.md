# Moving the tutor-loop writes to the server key: trial plan (v131)

Status: NOT STARTED in code. Written so the move can be done with you watching, one table at a time. Nothing here has been run.

## Why
Seven tables a student writes during a lesson still have a broad owner rule, so a signed-in student could change their own marks-related records directly from the browser (mastery_states, question_attempts, messages, learning_sessions, diagnostic_answers, diagnostic_attempts, misconceptions). The website never needs that.

## Where the writes are today (count of signed-in-client write sites, pinned by tests/t131.ts)
mastery_states 2, learning_sessions 5, messages 4, diagnostic_attempts 3, misconceptions 2, diagnostic_answers 1, question_attempts 1 (18 in all). Files: core/diagnostic/engine.ts, core/orchestrator/tutor.orchestrator.ts, session-summary.service.ts, core/mastery/mastery.service.ts, core/misconceptions/taxonomy.ts, api/session/start/route.ts.

## Rules for each move
1. Pass the server key only after the route has taken the student id from the sign-in.
2. Every update/delete with the server key must also filter by student_id (the server key skips the row rules).
3. One table (or one file) per delivery; then a migration for that table only.

## Order (least central first)
1. misconceptions (taxonomy.ts) 2. mastery_states 3. diagnostic_answers and diagnostic_attempts 4. learning_sessions 5. question_attempts and messages (the tutor turn itself, last).

## The trial you do after each step (about 10 minutes, on a test student)
- Take part of a diagnostic and answer a few questions; reload and resume.
- Start a lesson, answer a question right and one wrong, send a tutor message, finish the lesson.
- Check the progress page shows the new attempt and mastery moved.
- In Supabase SQL editor (read only): `select count(*) from question_attempts where student_id = '<test student id>';` should have grown by the number of answers you gave.
- If anything fails to save: do NOT run that step's migration; send me the error text.

## What I will not do
Run the narrowing migration for a table before you have done the trial for the code step.

## Progress
v132: step 1 code done (misconceptions). Waiting for your trial result before the migration.
