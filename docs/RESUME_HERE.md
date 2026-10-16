# Resume Here

_This file is the single source of truth for "what's the exact current status." Read it first every session, update it last every session._

## Exact current status (2026-10-15)
v29 and v30 are **deployed and confirmed working live**. **v34 is built, clean-built, zipped and sent — NOT deployed.** v34 is a single bundle containing v31 + v32 + v33 + the master-prompt build (the founder asked for everything clubbed into one final build), so the founder applies **one** zip: `sahayak-v34-complete-board-prep-delta.zip`. The older v31/v32/v33 zips are superseded by it. Don't re-build any of it; wait for the founder to report deployed-and-working (or a problem).

## Last completed task — v34 (see `docs/BUILD_LOG.md` for the full entry)
Founder decisions received 2026-10-15: (1) switch to ₹999 "Sahayak Complete Board Preparation", (2) add the other 4 subjects now, (3) build the rest of the master prompt and bundle with v31–v33. Built:
- ₹999 offer (`BOARD_PREP_OFFER`, 240 days — duration is my assumption, **founder to confirm**), rewritten offer page, updated legal copy (English + Hindi), refund/revoke admin action.
- Subject catalogue with readiness status; multi-subject sign-up, `/subjects` page, dashboard/progress/diagnostic follow it. Maths + Science = Ready; Social Science, English, Hindi Course A, Computer Applications = Pilot.
- 3 new subjects' curriculum + diagnostic seed files (AI-written → `needs_review`).
- Content verification status per question; `rejected` is never served.
- Pre-session check-in, recovery mode, confidence-after, longitudinal confidence trend, confidence-vs-performance note.
- Parent report: confidence trend + chart, syllabus coverage, evidence level, pilot notes. Also fixed a v29 bug (report's current-mastery query could never load).

## Last verified working state
v29 + v30: live. v34 (incl. v31–v33): `tsc` clean, `npm run build` clean (43 routes), migrations 0002–0013 apply and re-run cleanly on a scratch Postgres 16. **Never run against live Supabase, a live AI provider, a real browser, or two real accounts.**

## What the founder must do to deploy v34 (exact steps are in the zip's INSTRUCTIONS.txt)
1. Copy the zip's files over the project; `npm install`.
2. Run `npm run db:migrate` (applies 0010–0013).
3. Run `npm run db:seed` then `npm run db:seed:diagnostic` (loads the 3 new subjects; safe to re-run).
4. `npm run build`; commit, push, let Vercel deploy.
5. Smoke test (list in INSTRUCTIONS.txt).

## Current blockers / open items
1. **v34 not deployed or confirmed.**
2. **Founder to confirm:** the 240-day access length; the refund wording (currently "handled individually"); whether paid access should be *enforced* (today payments are tracked and shown but nothing blocks a non-paying signed-in student — Gate 9 of the master prompt, "paid access can be activated and revoked", is only partly met: the admin can confirm/reject/refund, nothing gates on it).
3. **Pilot-subject content needs a human.** English/Hindi/Computer Applications/Social Science questions and answer keys are AI-written and unreviewed. Don't market them as fully supported. Computer Applications' chapter list is not a checked copy of the official syllabus. See `docs/CONTENT_STATUS.md`.
4. **Two-account privacy test still not run** (now also covers `session_checkins`). Blocks accepting real payments.
5. Founder-attribution wording and the legal-page drafts still need explicit founder approval.
6. Not built yet (by decision, see DECISIONS.md): Maths Basic/Standard split, Hindi A/B split, timed/mock exams, 7-stage assessment ladder, board-readiness bands, landing-page FAQ/sample report, metrics tracker update, animations (needs a specific moment named).
7. Excel tracker (`Sahayak_MVP_Success_Dashboard.xlsx`) still needs the founder's own numbers; it does not yet have the master prompt's section-35 columns.

## Next three tasks, in order
1. Founder deploys v34 and reports what works / what doesn't (use the smoke-test list).
2. Founder answers the three questions in blocker #2 (access length, refund wording, enforce access or not).
3. Two-account privacy test, then a teacher reviews a sample of pilot-subject questions; then decide which pilot subjects to promote or hold back.

## Precise instruction for the next Claude session
Read this file, `PROJECT_CONTEXT.md`, `docs/DECISIONS.md` (the v34 entry especially), `docs/CONTENT_STATUS.md`, then the latest `docs/BUILD_LOG.md` entry. Don't rebuild v34. If the founder reports a bug, read the specific symptom first. If the founder reports bad AI-generated content, that is a prompt-quality issue in `packages/core/question-engine/ai-question-generator.ts` or a content-review issue (flip `content_status`), not a schema bug. If the founder confirms a duration/refund policy, update `BOARD_PREP_OFFER` and the payment-policy copy, then record it in DECISIONS.md. If asked to enforce paid access, design it first (which routes, what a non-paying student sees, how an existing family is grandfathered) and confirm with the founder before building — it touches auth/payments. If asked to split Maths Basic/Standard, plan the data migration for existing `mastery_states` first. Never mark a pilot subject `ready` without the founder saying a human reviewed it.
