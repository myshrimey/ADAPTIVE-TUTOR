# Resume Here

_This file is the single source of truth for "what's the exact current status." Read it first every session, update it last every session._

## Latest delivery - v74 (2026-10-28)
Question report links on Baseline/Challenge/Stretch/Review. No migration. Apply after v73: `sahayak-v74-report-question-delta.zip`.

## Previous delivery - v73 (2026-10-28)
Feedback Intelligence extras (migration 0047). Apply after v72: `sahayak-v73-feedback-extras-delta.zip`; `npm run db:migrate`; deploy.

## Previous delivery - v72 (2026-10-27)
Social Media Growth Engine at /admin/social-growth (migration 0046). Apply after v71: `sahayak-v72-social-growth-delta.zip`; `npm run db:migrate`; deploy. Founder next: enter website address in its Settings tab; try Generate Today's Content.

## Previous delivery - v71 (2026-10-27)
Error patterns and ready plans (tutor/centre board, parent/tutor student view). No migration. Apply after v70: `sahayak-v71-error-plans-delta.zip`.

## Previous delivery - v70 (2026-10-27)
Fading support (worked-example stages) in the tutor chat + optional mixed practice on /review. NO migration. Apply after v69: `sahayak-v70-fading-support-mixed-practice-delta.zip`; deploy. Next candidates: per-error intervention recipes; batch assignments; tutor-under-centre; Teach Sahayak / Voice need an AI cost decision.

## Previous delivery - v69 (2026-10-27)
Tutor/centre "Who needs my attention", batches, intervention tracking (/tutor/attention, /centre/attention, migration 0045). Apply after v68: `sahayak-v69-tutor-centre-attention-delta.zip`. Founder: `npm run db:migrate`, deploy; try it with a tutor test account linked to a test student. Next candidates: worked-example fading + interleaving; assigning work to a batch; tutor-under-centre; Teach Sahayak / Voice need an AI cost decision.

## Previous delivery - v68 (2026-10-26)
Spaced revision scheduler: /review "Revise today", migration 0044. Apply after v67: `sahayak-v68-spaced-revision-delta.zip`. Founder: `npm run db:migrate`, deploy. Traffic counter now works (founder's screenshot showed visits). Next candidates from /admin/roadmap: tutor/centre batches + intervention tracking; worked-example fading + interleaving; Teach Sahayak / Voice need an AI cost decision first.

## Previous delivery - v67 (2026-10-26)
Grouped admin menu (8 categories + search), Feedback Intelligence (/admin/feedback-intelligence, migration 0043), and /admin/roadmap (honest status of the master prompt). Apply after v66: `sahayak-v67-admin-menu-feedback-delta.zip`. Founder: run `npm run db:migrate`, deploy. STILL OPEN from v66: the traffic page showing 0 - run "Check the counter" and send the lines. Next candidates from /admin/roadmap: spaced revision scheduler, tutor/centre batches, worked-example fading + interleaving; Teach Sahayak and Voice need an AI cost decision first.

## Previous delivery - v66 (2026-10-25)
Hotfix: traffic page showed 0. Added the "Check the counter" button + migration 0042. Apply after v65: `sahayak-v66-traffic-check-delta.zip`. Founder: run `npm run db:migrate`, deploy, open /admin/traffic, press "Check the counter", send me the result lines. Cause not yet confirmed.

## Previous delivery - v65 (2026-10-25)
Social links: Facebook shown in the footer and Contact page; Instagram, LinkedIn, YouTube hidden until their addresses are pasted into apps/web/lib/social.ts. No migration. Apply after v64: `sahayak-v65-social-links-delta.zip`.

## Previous delivery - v64 (2026-10-25)
Website traffic analytics (/admin/traffic, migration 0041), Plans & Pricing dropdown on every page, new logo, bold free-plan notice on the subject picker. Apply after v63: `sahayak-v64-traffic-plans-logo-delta.zip` (this zip includes app/layout.tsx; v63 did not). Founder to do: run `npm run db:migrate`; optionally set ANALYTICS_SALT on Vercel; ask a Hindi teacher to read the new privacy line.

## Previous delivery - v63 (2026-10-25)
Challenge zone: olympiad / NTSE / foundation-style questions for topics a student has mastered, with badges (migration 0040). Apply after v62: `sahayak-v63-challenge-zone-delta.zip`. Founder to do: run `npm run db:migrate`; open /admin/challenge-tier and press "Write questions" for each subject (they stay needs_review; have a teacher check them); decide whether students may see unchecked Challenge questions. Next candidates: teacher review queue filter by tier, timed olympiad mock, Class 11 bridge.

## Previous delivery - v62 (2026-10-24)
Adaptive diagnostic and baseline engine + question provenance register (migration 0039). Apply after v61. Next candidates: make /learn read the learning path; automatic mini re-check after N sessions; teacher review of the Class 6-9 foundation graph and items; earlier-class graphs for Science/other subjects; tutor/centre batches.

## Previous delivery - v61 (2026-10-24)
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

- v75 (2026-10-28): report-question link also on Learn and Diagnostic; admin Feedback Intelligence shows 'Questions people reported' (counts per question id). No migration.

- v76 (2026-10-28): Acquisition & Referral Intelligence at /admin/acquisition (migration 0048). Founder to do: run `npm run db:migrate`; enter website address in Social Growth settings; share tracked links; create partner codes; tag older payments with a source; tag marketing spend to a source/campaign for cost per customer; try a real sign-up through a tracked link and check it appears.
- v77 (2026-10-28): /r/CODE invite links also count as tracked 'referral' arrivals (cookies + acquisition_touches). No migration.
- v78 (2026-10-28): /my-feedback shows a student their own reports with a plain status (friendlyFeedbackStatus; never priority/notes). No migration.
- v79 (2026-10-28): invitations + admin team + Help (migration 0049). Founder to do: run `npm run db:migrate`; set `NEXT_PUBLIC_SITE_URL` (your website address) and optionally `INVITE_SECRET` (a long random text) on Vercel and redeploy; create a test tutor invitation at /admin/users/create, open it in a private window, register, then check /admin/invitations; add team members at /admin/team; read /help.
- v80 (2026-10-29): teacher-student assignment records at /admin/assignments (migration 0050). Founder to do: `npm run db:migrate`, then assign one approved teacher to one student and end it.
- v81 (2026-10-30): curriculum management at /admin/curriculum + branded exports (migration 0051). Founder to do: `npm run db:migrate` (0049, 0050, 0051 and any unrun earlier ones); check the storage bucket `curriculum-docs` exists; download the CSV template, fill a few rows, upload, review, approve and publish; download one PDF and one CSV and check the header/footer and the headers.
- v82 (2026-10-30): curriculum version stamped on adaptive checks/baselines (migration 0052). Founder to do: `npm run db:migrate` after v81; publish a curriculum for Maths, take one adaptive check, confirm it completes.
- v83 (2026-10-30): curriculum PDFs read automatically (no migration; run `npm install` / let Vercel install). Founder to do: upload a real syllabus PDF at /admin/curriculum and check what was read against the pages; tell me if your PDF lays Unit/Chapter out differently.
