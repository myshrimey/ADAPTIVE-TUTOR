# Resume Here

_This file is the single source of truth for "what's the exact current status." Read it first every session, update it last every session._

## Exact current status (2026-10-16)
v29 and v30 are **deployed and confirmed working live**. **v34** (bundles v31-v33), **v35**, **v36** and **v37** are **built, clean-built and zipped, NOT deployed**. The founder applies them in order: `sahayak-v34-complete-board-prep-delta.zip`, `sahayak-v35-maths-mock-readiness-delta.zip`, `sahayak-v36-plans-teachers-delta.zip`, `sahayak-v37-pricing-free-aicost-delta.zip` (migrations 0013-0017). Don't re-build either; wait for the founder to report deployed-and-working (or a problem).

## Last completed task — v37 (see `docs/BUILD_LOG.md` for the full entry)
New prices (Rs 1000/subject/month; Rs 3,300/month for 5 subjects till Feb 2027; Rs 15,000 once till Mar 2027 — last two are Claude's proposal), a Free plan (1 subject, free-tier AI only, 10 tutor replies/day, no mocks), AI usage/cost log + `/admin/ai-costs`, four plan cards on the home/offer pages, server-side redirect so signed-in people never see sign-in/sign-up, brighter header name. Untested against real Supabase.

## Previous task — v36 (see `docs/BUILD_LOG.md`)
Founder's three plans (Rs 300/subject/month; Rs 999/month up to 5 subjects till Feb 2027; Rs 4500 once up to 5 subjects till Mar 2027) enforced via `student_access`; sign-up closed (founder creates students at `/admin/students`, first sign-in goes to the profile page, then subject choice); teacher role with self-registration (needs approval) and a review dashboard (`/teacher`), with founder-side `/admin/teachers` and `/admin/reviews`. **Founder must switch OFF Supabase "Allow new users to sign up".** New admin/teacher routes are untested against real Supabase.

## Previous task — v35 (see `docs/BUILD_LOG.md`)
Founder asked for: Maths Standard/Basic split, timed mock exams, board-readiness bands, landing-page FAQ, level-adaptive animations in the learning module. Built:
- Maths: `maths` renamed "Mathematics (Standard)" (slug and mastery untouched); new Pilot subject `maths-basic` cloned from it (migration 0014), difficulty capped at 3, derived `needs_review` questions.
- Mock exams: migration 0015 (`mock_exams`, student read-only via RLS), `packages/core/mock/`, `/mock`, `/api/mock/*`. 20 questions / 30 min, server clock, autosave, auto-submit, review. Never touches mastery.
- Readiness bands: `packages/core/readiness/`, shown on `/report` and in the WhatsApp text, with reasons, next step and a not-a-prediction statement.
- FAQ (EN + HI) on the home page and `/pilot`.
- Animations: guided / standard / brisk by current skill mastery — diagram reveal, answer feedback, level-up on the session summary; off under reduced-motion.

## Last verified working state
v29 + v30: live. v34 + v35: `tsc` clean, `npm run build` clean, migrations 0002-0015 apply and re-run cleanly on a scratch Postgres 16; 0015's RLS tested with two students; readiness rules (12 cases), chapter spread and animation-level logic unit-tested. **Never run against live Supabase, a live AI provider, a real browser, or two real accounts.** The mock service (grading, resume, auto-submit) has not been exercised end to end.

## What the founder must do to deploy (exact steps are in each zip's INSTRUCTIONS.txt)
1. Apply v34 (if not already): copy files, `npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run db:seed:diagnostic`.
2. Apply v35: copy files, `npm run db:migrate` (applies 0014 and 0015), `npm run db:seed` (so the Maths name stays "Standard"), `npm run build`, commit, push.
3. Smoke test (list in v35 INSTRUCTIONS.txt).

## Current blockers / open items
1. **v34 and v35 not deployed or confirmed.**
2. **Founder to confirm:** the 240-day access length; refund wording; whether paid access should be enforced (still not enforced); the FAQ wording; the readiness thresholds.
3. **Pilot-subject content needs a human** (English, Hindi, Computer Applications, Social Science, and now Maths Basic). See `docs/CONTENT_STATUS.md`. A teacher should confirm Basic's scope against the real CBSE Basic paper.
4. **Two-account privacy test still not run** (now also covers `session_checkins` and `mock_exams`). Blocks accepting real payments.
5. Founder-attribution wording and the legal-page drafts still need explicit approval.
6. Not built (by decision): Hindi Course A/B split, 7-stage assessment ladder, true animated (moving-part) diagrams, hard paywall, Excel tracker update.

## Next three tasks, in order
1. Founder deploys v34 then v35 and reports what works / what doesn't.
2. Founder answers the open questions in blocker #2.
3. Two-account privacy test; teacher reviews a sample of pilot-subject questions; decide which pilot subjects to promote.

## Precise instruction for the next Claude session
Read this file, `PROJECT_CONTEXT.md`, `docs/DECISIONS.md` (v34 and v35 entries), `docs/CONTENT_STATUS.md`, then the latest `docs/BUILD_LOG.md` entry. Don't rebuild v34/v35. If the founder reports a bug, read the specific symptom first. A mock-exam bug is most likely in `packages/core/mock/mock-exam.service.ts` (writes go through the service client; RLS only allows reads). If a Basic question looks too hard, check its `difficulty` and the cap in `tutor.orchestrator.ts` / `skill-quiz.engine.ts`. Readiness thresholds live only in `packages/core/readiness/readiness.service.ts`. If asked to enforce paid access, design it first and confirm with the founder (it touches auth/payments). Never mark a pilot subject `ready` without the founder saying a human reviewed it.
