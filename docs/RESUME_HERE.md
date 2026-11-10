# Resume Here

_This file is the single source of truth for "what's the exact current status." Read it first every session, update it last every session._

## Latest delivery - v123 (2026-11-10)
French added as a new subject (Class X, pilot). The website gets a French card, a French-letters keypad for typed answers (é, è, ç ...) and accent-aware answer checking. The content is 19 chapters, 71 skills and 356 original questions (grammar, reading, writing practice, and the textbook's culture lessons 2-8 and 10), all marked needs_review: a French teacher should read them. No migration. After deploying run `node packages/db/seed.js` then `node packages/db/seed-diagnostic.js` with your own settings. Apply after v122: `sahayak-v123-french-delta.zip`. Nothing was seen live.

## Previous delivery - v122 (2026-11-09)
IMPORTANT security fix with a database change (0063). A read-only look at your live database showed that any signed-in account could edit ANY question (answer key, prompt, review status) by calling the database directly, and could insert a payment already marked "confirmed". v122 closes both: the website now saves generated explanations with its own server key, and migration 0063 removes the open question-edit rules and tightens the payment insert rule. Order: deploy the v122 website first, then run 0063 in the Supabase SQL editor. Nothing was changed on your live database by Claude. Apply after v121: `sahayak-v122-close-open-write-rules-delta.zip`.

## Previous delivery - v121 (2026-11-09)
Onboarding (the step where a student picks subjects) is now checked on the server: name (tidied, up to 60 characters), board/class labels, the subject list (1 to 12 known-style names, repeats ignored), target date (a real date from today up to three years ahead), and exam year, language and daily minutes forced to safe values. Refusals show plain sentences. No migration. Apply after v120: `sahayak-v121-onboarding-input-delta.zip`.

## Previous delivery - v120 (2026-11-09)
The tutor chat box, typed answers and the payment form are now checked on the server. A chat message must be text of at most 1000 characters (the box allows 500), a typed answer must be small, and a payment claim needs a sensible amount (1 to 10 lakh rupees), a real date (not in the future, within a year) and a clean reference. Refusals show plain sentences. This also stops a huge message from reaching the AI (cost). No migration. Apply after v119: `sahayak-v120-chat-payment-limits-delta.zip`.

## Previous delivery - v119 (2026-11-09)
Profile save is now checked on the server: text boxes are cut to sensible lengths, control characters removed, and the parent email, phone, number of siblings, class rows (max 4, classes 6-9, no repeats) and percentage (0-100) are validated before anything is written. Bad input gets a plain-words message on the Profile page. No migration. Apply after v118: `sahayak-v119-profile-input-delta.zip`.

## Previous delivery - v118 (2026-11-09)
Test reliability only: the old flaky test t57b (it failed about 3 runs in 10) now passes 40 of 40 runs. Cause: the test counted mistake-book rows from earlier battles too, and the weakness battle picks questions at random, so sometimes a wrong answer updated an existing row instead of adding one. The product code was fine. No website change, no migration. Apply after v117: `sahayak-v118-test-fix-delta.zip`.

## Previous delivery - v117 (2026-11-09)
Changing or resetting a password now follows the same rules as sign-up (8+ characters, not a common password, not the username) and no longer shows Supabase's raw error text. Found by the same scan as v116: only sign-up checked the rules. This is a courtesy for honest users; the real lock is the password policy in your Supabase Auth settings (new Step 7 in docs/LIVE_JOURNEY_CHECKLIST.md: please check it). No migration. The reset-link flow itself was NOT tested end to end. Apply after v116: `sahayak-v117-password-rules-delta.zip`.

## Previous delivery - v116 (2026-11-09)
Security fix for the shared paper library (/papers). Found while scanning what the browser does directly: the library is a PUBLIC storage bucket and any signed-in account (free self-sign-up included) could upload any file of any size, and the list shows it to everyone straight away. Now: only PDFs up to 10 MB (checked on the page, on the save route, and by the bucket itself via migration 0062). Papers still appear without review: that is a decision for you (D8 in the founder decision list below). Migration 0062 sets two bucket settings only. After applying, run the 0062 line in /admin/deploy-check "checks you paste by hand". Apply after v115: `sahayak-v116-paper-library-delta.zip`.

## Previous delivery - v115 (2026-11-08)
Undo notes (docs/ROLLBACK_NOTES.md) now cover every database change, 0002 to 0061. Worked out and tested on a scratch database: applying 0002-0054 then undoing newest-first returns it to its starting state, and re-applying gives the same result. Four core tables are never dropped and rules on existing tables are never removed. Oldest changes carry a special-care warning (usernames, parent links). Documents and test scripts only: no website change, no migration. Apply after v114: `sahayak-v115-undo-notes-complete-delta.zip`.

## Previous delivery - v114 (2026-11-08)
Interleaving (mixing one question from an earlier skill into practice): the rules are written and tested (`packages/core/pedagogy/interleave.ts`, 33 checks) and the wiring design is in `docs/INTERLEAVING_DESIGN.md`. It is NOT connected to the tutor and the switch is off: students see no change. Connecting it changes the answer loop and needs a supervised trial first. No migration. Apply after v113: `sahayak-v114-interleaving-rules-delta.zip`.

## Previous delivery - v113 (2026-11-08)
Undo notes (docs/ROLLBACK_NOTES.md) now cover database changes 0041 to 0061 (v101 covered 0055-0061). Worked out and tested on a scratch database: undo returns it to its earlier state, and re-applying gives the same result. Undo loses data in the new tables, so take a backup first; the storage bucket `curriculum-docs` and the role guard (0049) have written warnings. No code change, no migration. Apply after v112: `sahayak-v113-undo-notes-delta.zip`.

## Previous delivery - v112 (2026-11-08)
Three things: (1) browser safety headers on every page (nosniff, frame, referrer, permissions; no CSP/HSTS on purpose); (2) `scripts/smoke/smoke-test.mjs`, a read-only check you run against your live site (`node scripts/smoke/smoke-test.mjs https://YOUR-SITE`); (3) `docs/LIVE_JOURNEY_CHECKLIST.md`, the by-hand walk-through (sign-up, forgot password, student session, admin). Nothing here was ever run against your live site. No migration. Apply after v111: `sahayak-v112-live-check-delta.zip`.

## Previous delivery - v111 (2026-11-08)
Tables on the centre and team screens no longer widen a phone page: they scroll inside their own box (CSS only, class `data-table` had no style before). Found by a code scan of every table on public and signed-in screens; checked at 320, 375 and 414px in a test page, NOT on real signed-in pages. No migration. Apply after v110: `sahayak-v111-table-scroll-delta.zip`.

## Previous delivery - v110 (2026-11-08)
Forgot-password now goes through the server (/api/auth/forgot-password): limited to 5 requests per internet address and 3 per email per hour, and it gives the same answer whether or not the account exists. No migration (it reuses the hash-only public_check_log table from 0060). The reset email itself was NOT tested from here. Apply after v109: `sahayak-v110-forgot-password-delta.zip`.

## Previous delivery - v109 (2026-11-08)
Prompts 0001 to 0003 now have requirement rows (so the control centre shows a real done %). New ranked list: docs/REMAINING_WORK_RANKED.md. After deploying, press "Load from documents" again at /admin/control to copy the new rows. No migration. Apply after v108: `sahayak-v109-requirements-delta.zip`.

## Previous delivery - v108 (2026-11-06)
Admin top bar now has a "Control centre" shortcut (main admin only). The "Load from documents" button is on that page. No migration. Apply after v107: `sahayak-v108-control-link-delta.zip`.

## Previous delivery - v107 (2026-11-05)
Phone header fix (CSS only): public pages no longer scroll sideways on phones. No migration. Apply after v106: `sahayak-v107-phone-header-delta.zip`.

## Previous delivery - v106 (2026-11-05)
Pictures and screenshots can be attached to feedback (migration 0061; text feedback keeps working until it is applied). Apply after v105 (or use the combined v102-v106 zip): `npm run db:migrate`. Pictures are private, admin 'support' only; screenshots can show children's details: include in the D7 review (export, retention, any AI reading).

## Previous delivery - v105 (2026-11-04)
203 new questions for Maths (139) and Science (64, incl. 3 missing chapters), all needs_review; the question loader no longer labels unreviewed questions 'verified'. No migration. Apply after v104: `sahayak-v105-maths-science-delta.zip`, then `node packages/db/seed.js` and `node packages/db/seed-diagnostic.js`.

## Previous delivery - v104 (2026-11-03)
218 new questions (Computer Applications 75, English 63, Social Science 80), all needs_review; Computer Applications now has the official 2026-27 units. No migration. Apply after v103: `sahayak-v104-questions-delta.zip`, then `node packages/db/seed.js` and `node packages/db/seed-diagnostic.js`.

## Previous delivery - v103 (2026-11-03)
Request limit on the free readiness check (migration 0060, fails open until applied). Apply after v102: `sahayak-v103-check-limit-delta.zip`, then `npm run db:migrate`.

## Previous delivery - v102 (2026-11-02)
"Get the app" install button on every page (installable web app). No migration. Apply after v101: `sahayak-v102-install-app-delta.zip`.

## Previous delivery - v101 (2026-11-02)
Rollback notes for 0055-0059 (docs/ROLLBACK_NOTES.md, t101), round-trip tested on a scratch copy. No migration. Apply after v100: `sahayak-v101-rollback-notes-delta.zip`.

## Previous delivery - v100 (2026-11-02)
Record test results on /admin/control/testing (migration 0059). Apply after v99: `sahayak-v100-test-results-delta.zip`, then `npm run db:migrate`.

## Previous delivery - v99 (2026-11-02)
Next.js 15.5.28 security patch + dependency review (docs/DEPENDENCY_SECURITY.md, t99). After unzipping run `npm install` once. No migration. Apply after v98: `sahayak-v99-next-patch-delta.zip`.

## Previous delivery - v98 (2026-11-01)
Raw server error text no longer reaches visitors (`publicError`, t98). No migration. Apply after v97: `sahayak-v98-hidden-errors-delta.zip`.

## Previous delivery - v97 (2026-11-01)
Public-route gate scan (t97) and teacher sign-up limits. No migration. Apply after v96: `sahayak-v97-public-routes-delta.zip`.

## Previous delivery - v96 (2026-11-01)
Deployment pre-flight: whole migration chain tested twice on scratch Postgres, `/admin/deploy-check`. No migration. The founder deploys v90-v95 together: use the combined zip `sahayak-v90-to-v95-combined.zip` (or the six delta zips in order); `npm run db:migrate` (0055, 0056, 0057); deploy; open /admin/deploy-check, then /admin/control and press "Load from documents".

## Previous delivery - v94 (2026-11-01)
All open decisions D1-D6 recorded (FD-11 to FD-15); D7 (professional legal review) is the only one waiting. View As design study, retention dry-run page + owner-run purge script. No migration. Apply after v93: `sahayak-v94-decisions-retention-delta.zip`; deploy.

## Previous delivery - v93 (2026-11-01)
Control Centre screens 2 (current execution + resume download, dependencies, testing & QA checklists, history). No migration. Apply after v92: `sahayak-v93-control-screens-delta.zip`; deploy.

## Previous delivery - v92 (2026-10-31)
Read-only account directory `/admin/accounts` and masked snapshot (no migration). Apply after v91: `sahayak-v92-account-directory-delta.zip`; deploy. Opens are audited (needs v91's migration 0057 for the new audit columns; works without).

## Previous delivery - v91 (2026-10-31)
Tamper-resistant audit trail (migration 0057) + 14 more admin actions recorded + access-control scan test. Apply after v90: `sahayak-v91-audit-trail-delta.zip`; `npm run db:migrate`; deploy. The founder is applying several versions together (v90 onward, in order).

## Previous delivery - v90 (2026-10-31)
Control Centre screens + tables, security fix, tests in the repository. Apply after v88 and v89: `sahayak-v90-control-centre-delta.zip`; `npm run db:migrate` (0055, 0056); deploy; open /admin/control and press "Load from documents". `npm test` now runs all tests. Founder next: apply it, look at the new pages, switch on leaked-password protection in Supabase Auth, push v82-v90 to GitHub, approve the Vercel link. Claude's recommended next builds: TASK-021/020/022/023, then TASK-032 and 030/031 (see docs/sahayak-control-centre/TASK_BACKLOG.md).

## Previous delivery - v89 (2026-10-31)
Documents only: `docs/sahayak-control-centre/` (start at SESSION_RESUME.md). Phase 0 audit of SAH-PROMPT-0009 done; nothing else started. Waiting for the founder to choose the next phase (recommended: registry tables and screens, tests into the repository, two security warnings). Apply after v88: `sahayak-v89-control-centre-docs-delta.zip` (no migration, no deploy needed).
Also open: push v82-v88 to GitHub (it has v81); approve the Vercel link to check the live site.

## Earlier delivery - v88 (see docs/BUILD_LOG.md)

## Delivery - v74 (2026-10-28)
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
- v85 (2026-10-30): "How sure are you?" on /review (migration 0053). Founder to do: `npm run db:migrate`; answer ~10 revision questions choosing a sureness each time and read the card at the bottom of /review.
- v86 (2026-10-30): self-explanation step in /learn (no migration). Founder to do: run a /learn session on one skill and answer 6 questions right; after the 2nd and 6th the tutor should ask you to explain in your own words. Tell me if it is too often or the wording is poor.
- v87 (2026-10-31): team menu matches real access (no migration). Founder decision pending: should a Finance / Technology / Content team member be allowed any of the pages that are still for you only? Default: no.
- v88 (2026-10-31): free AI capacity (migration 0054). Founder to do: `npm run db:migrate`; open /admin/ai-infrastructure and read the Free capacity panel; enter each live provider's real daily limit so capacity is counted; to add a provider (e.g. Cloudflare on a FREE Workers plan): set its key name on Vercel, check the CURRENT official terms, enter limits and ticks, set class and free flag, then switch it to active.
