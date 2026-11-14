# Plan: closing the student-owned write rules (written in v128, 2026-11-14) - NOT done

## What is still open
Thirteen tables carry a rule of the form "a signed-in student may do anything (`for all`) to the rows that belong to them": diagnostic_answers, diagnostic_attempts, learning_events, learning_goals, learning_profiles, learning_sessions, mastery_states, messages, misconceptions, question_attempts, session_checkins, student_academic_history, student_profile_details. Someone who calls the database directly with the public key and their own sign-in could therefore write their own mastery scores, attempts or messages. It only affects that student's own data (no other student's), but a family could make their own parent report untrue.

v128 (migration 0064) closed the same kind of hole on the `students` table, because nothing in the website wrote it with a student's own sign-in.

## Why it is not closed yet
The tutor engine writes these tables with the student's own sign-in (the signed-in client), so removing the rules would stop the tutor, diagnostic and profile saves working until each write is moved to the server key behind a check that the student is who they say. That touches the tutor loop, which Sahayak's rule says never to change without a supervised trial.

## The work list (from the v128 code scan; line numbers will drift)
| Table | Written today with the student's sign-in at |
|---|---|
| diagnostic_answers | core/diagnostic/engine.ts ~195 |
| diagnostic_attempts | core/diagnostic/engine.ts ~148, ~249, ~575 |
| learning_goals | core/subjects/subject.service.ts ~88, ~93 |
| learning_profiles | core/learner-model/preferences.service.ts ~29 |
| learning_sessions | api/session/start/route.ts ~38; core/orchestrator/tutor.orchestrator.ts ~260, ~269, ~511; core/orchestrator/session-summary.service.ts ~97 |
| mastery_states | core/diagnostic/engine.ts ~608; core/mastery/mastery.service.ts ~43 |
| messages | core/orchestrator/tutor.orchestrator.ts ~296, ~298, ~509, ~510 |
| misconceptions | core/misconceptions/taxonomy.ts ~135, ~142 |
| question_attempts | core/orchestrator/tutor.orchestrator.ts ~392 |
| session_checkins | core/checkins/checkin.service.ts ~74, ~93 |
| student_academic_history | core/profile/student-profile.service.ts ~123 |
| student_profile_details | core/profile/student-profile.service.ts ~85 |
| learning_events | already written with the server key (no code change needed) |

## Steps (each is a small version, shipped and watched before the next)
1. Make one helper that returns the server-key client only after the route has confirmed the signed-in student owns the student id being written (every route already looks the student up).
2. Move the writes one table at a time, starting with the least central (session_checkins, student_academic_history, student_profile_details, learning_goals, learning_profiles), each with a test that the old signed-in write path is gone.
3. Run a supervised trial with one real student account per step: finish a diagnostic, start a session, answer, see the report.
4. Only after a table's code is moved and trialled, add a migration that turns its `for all` rule into a read-only rule (`for select`), with an undo note, like 0063 and 0064.
5. The tutor-loop tables (learning_sessions, messages, question_attempts, mastery_states, diagnostic_*) go last and need your supervision.

## What you decide
Whether to do this now or after the first real families have used the app for some weeks, and who watches the supervised trial.


## Progress (v129)
Done: student_profile_details and student_academic_history (migration 0065, /api/profile uses the server key). Remaining: session_checkins, learning_goals, learning_profiles, then the tutor-loop tables.
