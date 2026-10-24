# Resume Here

_This file is the single source of truth for "what's the exact current status." Read it first every session, update it last every session._

## Latest delivery - v61 (2026-10-24)
Master-upgrade audit (docs/MASTER_UPGRADE_GAP_REPORT.md) + Founder financial simulator + exam sessions / curriculum versions / country prices + audit log (migration 0038). Apply after v60: `sahayak-v61-simulator-config-delta.zip`. Next candidates: tutor/centre batches and assignments, Class XI/XII transition entitlement, TAM/SAM/SOM, audit entries for older admin actions.

## Previous delivery - v60 (2026-10-23)
Fixed 20-question diagnostic, answer checking and keypad, Fill to 1,000 tool, referral links for every role with bonus days (migration 0037). Apply after v59: `sahayak-v60-diagnostic-answers-referrals-delta.zip`. Founder to do: set the referral days and switch rewards on at /admin/referral-rewards, press "Fill to 1,000" per subject, check the keypad on a phone, have a Hindi teacher read the warnings. Next: Hindi grammar generators, more code generators, reviewing the generated questions.

## Exact current status (2026-10-16)
v29 and v30 are **deployed and confirmed working live**. **v34** (bundles v31-v33), **v35**, **v36** and **v37** are **built, and the founder reports (2026-10-16) that he has deployed and tested all of them live** (details of what he tested not recorded). They were applied in order: `sahayak-v34-complete-board-prep-delta.zip`, `sahayak-v35-maths-mock-readiness-delta.zip`, `sahayak-v36-plans-teachers-delta.zip`, `sahayak-v37-pricing-free-aicost-delta.zip` (migrations 0013-0017). Don't re-build either; wait for the founder to report deployed-and-working (or a problem).

## Last completed task - v42 (see `docs/BUILD_LOG.md` and `docs/V3_REQUIREMENTS_MAP.md`)
Master prompt v3 first slice: Founding Family plan (migration 0020), `/plan`, `/admin/funnel` + CSV exports, `/admin/questions`, homepage headline, `SAHAYAK_PROJECT_MEMORY.md`. Apply after v41: `sahayak-v42-v3-commercial-foundation-delta.zip`. Next: handwritten mock (needs founder decisions), data export/delete, blueprint mock.

## Previous task - v41: new menu (`sahayak-v41-menu-delta.zip`, no migration)

## Previous task — v40 (see `docs/BUILD_LOG.md`)
Written-answer practice (`/written`, migration 0019) and CSV exports (`/admin/metrics`). Apply after v39: `sahayak-v40-written-answers-exports-delta.zip` (run `npm run db:migrate`). Not deployed.

## Previous task — v39 (see `docs/BUILD_LOG.md`)
30-day "what changed" report (report, parent link), `/admin/metrics` (activity, retention, payments, content, what-helps), `docs/DATABASE_SCHEMA.md`, `docs/COMMERCIAL_METRICS.md`. No migration. Apply after v38: `sahayak-v39-change-report-metrics-delta.zip`. Not deployed.

## Previous task — v38 (see `docs/BUILD_LOG.md`)
Every "partly built" master-prompt item finished (onboarding fields, question details, quality-gates page `/admin/quality`, Science/Language error types, engagement signals, session planning + performance recovery + success question, assessment ladder incl. board-style paper, parent report matrix/engagement/history, dashboard recommendation + streak, About / Trust / Refund / Sample report / free readiness check). Migration 0018. Built and checked in the test setup only; not deployed. Apply after v37: `sahayak-v38-partly-built-complete-delta.zip`.

## Previous task — v37 (see `docs/BUILD_LOG.md` for the full entry)
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

## Current blockers / open items (updated 2026-10-16, after v37)
1. v34-v37 deployed by the founder (his report); what he tested is not itemised. Master-prompt coverage evaluation: see `docs/MASTER_PROMPT_COVERAGE.md`.
2. **Founder to confirm:** the new prices (Rs 1000 / 3,300 / 15,000 — the last two are Claude's proposal) and GST; refund wording; FAQ, legal and plan wording; readiness thresholds. (The 240-day idea is obsolete; access is now set per student at `/admin/students`. Paid access IS enforced since v36.)
3. **Founder must turn OFF Supabase "Allow new users to sign up"** and set `AI_FREE_PROVIDERS` in Vercel.
4. **Pilot-subject content needs a human** (English, Hindi, Computer Applications, Social Science, Maths Basic). Teachers can now give feedback at `/teacher`; the founder applies it at `/admin/reviews`. See `docs/CONTENT_STATUS.md`.
5. **Two-account privacy test still not run** (now also covers `student_access`, `teacher_profiles`, `content_reviews`, `ai_usage`, `mock_exams`, `session_checkins`). Blocks accepting real payments.
6. Founder-attribution wording and the legal-page drafts still need explicit approval.
7. Not built: Hindi Course A/B split (needs course content), true animated diagrams, automatic teacher payment (only counting exists). Founder still to do for v38: approve refund wording (fill in periods), About/Trust text; set marks/levels via teachers; sign off gates at /admin/quality as evidence arrives.

## Next three tasks, in order
1. Founder deploys v38 (after v37) and runs the smoke tests in its INSTRUCTIONS.txt; reports what works / what doesn't.
2. Founder answers blocker #2 and #3; gives existing students real plans/end dates.
3. Two-account privacy test; teachers review pilot-subject questions; read `/admin/ai-costs` after a week and decide the AI model mix.

## Precise instruction for the next Claude session
Read this file, `PROJECT_CONTEXT.md`, `docs/DECISIONS.md` (v34 and v35 entries), `docs/CONTENT_STATUS.md`, then the latest `docs/BUILD_LOG.md` entry. Don't rebuild v34/v35. If the founder reports a bug, read the specific symptom first. A mock-exam bug is most likely in `packages/core/mock/mock-exam.service.ts` (writes go through the service client; RLS only allows reads). If a Basic question looks too hard, check its `difficulty` and the cap in `tutor.orchestrator.ts` / `skill-quiz.engine.ts`. Readiness thresholds live only in `packages/core/readiness/readiness.service.ts`. If asked to enforce paid access, design it first and confirm with the founder (it touches auth/payments). Never mark a pilot subject `ready` without the founder saying a human reviewed it.

## Update after v43 (2026-10-18)
Next: (1) founder deploys v43, answers what the Rs 14,999 plan includes beyond Rs 4,999, gives the exam date; (2) Hindi teacher reviews Hindi A/B questions, English and Social Science banks are small (21 and 24 questions; Social Science has 19 skills with none); (3) build handwritten mock only after consent wording is approved and a lawyer has seen the "keep as Q/A bank after parent deletes" plan (DPDP Act risk).

## Update after v59 (2026-10-22)
Apply v59 after v58 (migration 0036). Then: (1) at /admin/ai-infrastructure open each provider and enter the exact model, quota type, prices and the date you verified them from the provider's CURRENT official page; (2) at /admin/ai-economics enter storage and processing cost per evaluation, set limits, run the benchmark per model; (3) enter provider invoices monthly.
