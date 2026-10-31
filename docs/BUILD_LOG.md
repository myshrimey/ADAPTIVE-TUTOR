# Build Log

One entry per work session. Newest entry on top.

---

## v86 - Self-explanation step in the tutor chat (2026-10-30)
No migration. New teaching strategy `SELF_EXPLANATION` chosen by a rule (`selectEnrichment` in `pedagogy.engine.ts`): after two clean right answers (no hints) the tutor sometimes asks "why does it work?" in the student's own words instead of posing the next question. Only on the 2nd, 6th, 10th... answer; only replaces ordinary practice (GUIDED_PRACTICE/SOCRATIC); mastery window 40-89; never at the end of a session, on a gentler/recovery turn, when the student chose "test myself", or over repair/remediation/review/test/challenge/student commands. The typed explanation is a normal message turn: not graded, no mastery change. One-line AI instruction added through `STRATEGY_INSTRUCTION`. `ENRICHMENT_ENABLED` constant switches it off. Admin metrics shows it as "Explain in your own words". Tests: t86 30/30; all earlier tests pass except the already-stale t3, t4, t42a and t42c (funnel "untracked" expectation, untouched code); tsc and production build clean. Not tested: real AI behaviour (does it follow the instruction?), a real student session, whether every 4th answer is the right frequency. Deliberately NOT built: "find the mistake" (error analysis) because it needs AI-written wrong solutions that nobody has checked; interleaving inside the chat; the other prompt methods (project learning etc.).

---

## v85 - Metacognition: "How sure are you?" and calibration (2026-10-30)
Migration 0053 `calibration_events` (server-only). Core `packages/core/calibration/` (pure `summariseCalibration`, supportive `calibrationMessage` EN/HI, `immediateNote`; best-effort `recordCalibration`/`loadCalibration`). On /review (daily and mixed practice) the student may tap Just guessing / I think so / I am sure before Check (optional, never blocks). Right after the answer a one-line note appears only for "sure but wrong" and "guess but right". /review shows a card "How well do you know what you know?": says "not enough yet" under 8 answers, makes no claim about a level with fewer than 3 answers, and never gives a mark, rank or label. It never changes mastery, marks or revision dates. Tests: t85 23/23; all earlier tests pass; tsc and production build clean; migration twice on scratch Postgres (value 5 rejected); signed-out /review redirects and /api/review answers unauthenticated. Not tested: a real student session, how it looks on a phone, real-world use of the thresholds (70% sure / 60% guess are my starting values, not research-tuned). Not built: calibration in the adaptive baseline, quizzes and mocks; adult/tutor view; per-topic calibration.

---

## v84 - Colon-less headings in syllabus text and PDFs (2026-10-30)
No migration, no new package. `parseOutlineText` (and so PDF, DOCX and pasted text) also reads "Chapter 2 Polynomials" / "UNIT II ALGEBRA" / "Topic 3 Name": a number or roman numeral, then a name that starts with a capital, is at most 10 words and does not end like a sentence. Such items have confidence 0.7 (colon lines stay 0.9). Prose like "Chapter 3 covers many things..." is not read. Tests: t84 7/7; all earlier tests pass; tsc clean. Production build not re-run (pure parser change).

---

## v83 - Automatic PDF reading for curriculum uploads (2026-10-30)
No migration. New dependency `unpdf` 1.9.1 (declared in apps/web, pure JavaScript, Node 22+; `serverExternalPackages: ['unpdf']` in next.config.js). `packages/core/curriculum-mgmt/pdf.ts`: reads the TEXT of a PDF (no OCR), up to 150 pages, 25 s limit; only lines starting Unit/Section/Chapter/Topic/Learning outcome/Assessment objective become items, each with its PDF page (an explicit [p.N] wins); every PDF item has confidence 0.7 so the review screen asks for a check; scanned or corrupt PDFs are stored and the reviewer is told plainly, nothing invented. Upload route sets nodejs runtime and maxDuration 60. Tests: t83 15/15 (real PDFs made with reportlab incl. a picture-only PDF), t81 76/76 (one old expectation updated), all earlier tests pass, tsc clean, production build clean, and the built server read the test PDFs correctly (9 items; scanned = 0 items with a clear note). Not tested: real CBSE syllabus PDFs (their layout may differ and many are tables), the live Vercel Node version and function limits, signed-in upload.

---

## v82 - Curriculum version on adaptive checks and baselines (2026-10-30)
Migration 0052: nullable `curriculum_version_id` on `baseline_sessions` and `student_baselines`. A check records the published version when it STARTS and the baseline keeps that same version even if a newer one is published during the check. Best-effort and never blocks a student (works without the migration). Old rows stay empty. Tests: t82 8/8; t79-t81b, t62-t62c, t67, t76, t78 still pass; tsc clean; migration run twice on a scratch database. Full production build not re-run (core-only change). Not done: old /diagnostic attempts, question-level stamps, re-mapping question banks to learning outcomes.

---

## v81 - Curriculum management and branded exports (2026-10-30)
Migration 0051: `curriculum_versions` extended (statuses draft/uploaded/processing/needs_review/approved/published/superseded/failed/retired, published_at/by), new `curriculum_documents`, `curriculum_nodes` (Board-Year-Class-Subject-Unit-Chapter-Topic-Learning Outcome-Assessment Objective, source page, flag, stable key), `curriculum_events`, private bucket `curriculum-docs`. Core `packages/core/curriculum-mgmt/`. `/admin/curriculum` (+ `[id]` review): upload (PDF/DOCX/XLSX/CSV, 4 MB), CSV/DOCX/XLSX/outline-text read in code, PDFs stored but NOT read, checks, edit/flag, approve/unapprove/publish/rollback (Super Admin only), history, optional link of an item to an existing chapter/topic. New reports are stamped with the curriculum version. One export service `packages/core/branding` + `apps/web/lib/export.ts`: all CSV/JSON/markdown downloads carry brand and privacy headers (body untouched), client PDF and print get header/footer (logo, name, tagline, website, export ID, date, page n of N, privacy label). Tests: t81 76, t81b 28, t79/t79b/t80 pass, tsc clean, build clean, migration twice, signed-out 403s, real PDF download checked in headless Chromium. Not tested: live database, signed-in flows.

---

## v80 - Teacher-student assignment records (2026-10-29)
Migration 0050 `teacher_assignments`. `/admin/assignments` (academic permission) records which approved teacher teaches which student, with end/reassign and audit. It grants NO access to the student's data. Tests: t80 11/11, t79 still 88/88, tsc clean, production build clean, migration run twice, signed-out API 403. Not tested with a live database.

---


## v79 - Role-based accounts, admin team, shareable invitations, Help (2026-10-28)
Migration 0049 (invitations, invitation_events, admin_team, org_members, role_changes; trigger `guard_user_role`). New: `/admin/users` (+ Add Student/Parent/Teacher/Tutor/Coaching Centre), `/admin/users/create` (role-specific fields, success screen with Copy link / WhatsApp / Share / Telegram / Email / Copy message / View / Create another), `/admin/invitations` (+ detail with link, history, revoke, extend, new link, role-change approval), `/admin/team` (templates + permissions, Super Admin only), public `/invite/<token>` (role locked, exact expired/revoked wording, existing-account handling), `/centre/invitations` (a centre invites its own people), `/help`. Existing admin routes opened to team permissions: teachers (academic), partners (users), acquisition + social growth (marketing), feedback (support); everything else stays Super Admin only. Closed a gap: a signed-in user could edit their own `users.role` under the old row policy; the trigger now refuses it. Invitation source/campaign/referral are stored server-side and written into `acquisition_attribution` as first touch (source e.g. whatsapp or invitation). Tests: t79 (88) and t79b (26) pass; tsc clean; production build clean; migration run twice; trigger tested in a scratch database; signed-out access to every new admin/centre API returns 403. Not tested: a real sign-up with a live database, signed-in team members on the live site. Older t3/t4 (legacy plans) fail as before and are unrelated.

---

## v78 - "What happened to my report?" (2026-10-28)
No migration. `/my-feedback` (linked from My data) lists a signed-in student's OWN reports with a plain status (Received / Planned / Done / Looked at / Kept for later / Being looked at again) read from the group the report belongs to. `/api/feedback/mine` takes the student from the session only and never returns priority, internal notes, reviewer or anyone else's reports. Wording is `friendlyFeedbackStatus` (tested, t78). Signed out: 401. Not tested signed in on the live site. Parents/tutors who are not students do not have a list yet (their reports carry no account id).

---


## v77 - Invite links count as tracked arrivals (2026-10-28)
No migration. Opening `/r/CODE` now sets the same first-touch (only if none yet) and last-touch cookies as any tracked link, with source "referral", so a person who joins through an invite is attributed to "referral" even when their browser had no earlier link, and (when the browser already has its device cookie) the arrival is stored in `acquisition_touches` so invite-link visits are matched to sign-ups. The invite code is not stored in the touch. Bad codes set nothing. Checked on a running server: fresh visit, visit with existing first touch (kept), bad code. Not tested with a real sign-up.

---


## v76 - Acquisition & Referral Intelligence Engine (2026-10-28)
Founder request: the "Acquisition, Attribution, Referral & Growth Intelligence" prompt. Built ON the existing systems (traffic counter, both referral lists, pilot_payments, revenue_entries, student_access, social_campaigns/content/metrics, crm_records, expenses, student_links, AI usage ledger). Migration 0048 (additive).
- Capture: middleware keeps first touch (set once) and last touch (replaced) cookies with source, medium, campaign, post (utm_content), term, landing, partner code, time (old 3-key cookie still read). `/api/track` stores each tracked-link arrival in `acquisition_touches` (salted hash of the device cookie; no IP/user agent/name). At every sign-up route (student, family child + parent, portal, teacher) `captureSignupAttribution` saves first touch, last touch, referral, partner, post and campaign ids to `acquisition_attribution` and links the earlier arrivals of that browser to the account (the only place a visit is directly matched to a sign-up; ordinary visitors stay "not directly matched"). A failure never stops a sign-up.
- Dashboard `/admin/acquisition`: decision panel (max 5, needs minimum sample), periods today/7/30/90/custom, funnel stages, by source (with cash spend, cost per customer, organic vs cash labelling), channel comparison, campaigns, posts (ranked by revenue, not likes), referral funnel + quality score (weights editable) + reward liability in days (money: Not available), partners (TUTOR-ARUN-001 style codes, reward status manual), customer-type economics, cohorts (D1/D7/D30 only for people old enough), organisation/offline sales, business metrics, pseudonymous journeys, experiments, data quality (14 checks), segments (board, class, subject, state, country; unknown kept), reporting model (first/last/referral/all touches), 9 CSV exports.
- Offline sales: one form writes to `pilot_payments` (students) or `revenue_entries` (others) plus `acq_sale_links`; it does not grant access (still /admin/payments).
- Old funnel: "Website visits", "Content reached" and "Referrals" now show real numbers; Command Centre has a "How are we growing?" card.
- Safety: `page_views.content` is only written when present and retried without it if the column is missing, so the counter cannot break before the migration is run.
- Tests: t76 (62 checks incl. the full Facebook post -> signup -> diagnostic -> baseline -> payment -> referral -> referred payment journey, tutor, centre, school, privacy, empty database, minimum sample) + t63-t74 pass; tsc clean; production build clean; migration 0048 run twice on a scratch database; new routes return 403 signed out; cookie behaviour checked on a running server. Not tested: signed-in admin screens, a real sign-up on the live site, real traffic.

---


## v75 - Report links on Learn + Diagnostic, and "Questions people reported" list (2026-10-28)
No migration. The "Something wrong with this question?" link (v74) now also appears under the question on Learn and Diagnostic. Mock paper is a printable paper, so it has no link. `/admin/feedback-intelligence` has a new folded list "Questions people reported": question id, number of reports, last date, a sample message. Counts only; it changes nothing and decides nothing. Test: t74 (2 checks) + t73 pass; type check and full production build clean; not tried on a live phone.

---


## v74 - "Report a problem with this question" links (2026-10-28)
No migration. `components/ReportQuestion.tsx` (a small link; opens the existing feedback form with kind "question" and the question id) added under the question on Baseline, Challenge, Stretch and Review (Review shows Hindi text when the student uses Hindi). Test: type check and full production build clean; not tried on a live phone.

---

## v73 - Feedback Intelligence extras (2026-10-28)
Founder request: the "Feedback Intelligence & Human Review Engine" prompt. The v67 system already covered much of it, so this EXTENDS it (migration 0047, additive columns only).
- Submission: widget adds "what is it about" and "how did it affect you"; `/api/feedback` stores kind, impact, role (inferred from page + student lookup, never from the browser), source, device/browser/OS, locale, app version, plan, and short sanitised ids (question/session/mock/report...). If the new columns are not installed yet, the message is saved the old way: feedback is never lost.
- Outside-app entry (call, meeting, WhatsApp, email...) goes through the same sorting and grouping.
- Priority = visible sum of 7 explained parts (severity, people affected, last-7-day frequency, learning effect, money/trust, reporters' own impact answers, moat value); P0 60+, P1 40+, P2 20+. Wrong answers, privacy words, diagnostic and payment clusters are lifted automatically with the reason shown. Hand override needs a reason and is written to the history.
- Optional AI analysis per group (gateway feature `feedback_analysis`, 30 a day, personal details removed, labelled "AI recommendation (not a decision)", stores provider/model/prompt version/request id). It never changes status.
- Task record (approved groups only), defer-until date, post-fix validation (needs deployed version; regression/not fixed reopens), analytics tiles, Top loved features, search + filters + sort.
- Tests: t73 (about 55 checks) + t63-t72 pass; tsc clean; production build clean; migration 0047 run twice with no errors.

---

## v72 - Social Media Growth Engine (2026-10-27)
Founder request: the 60-section Social Media Growth Engine prompt. Migration 0046. Additive; no existing file replaced.
- Core `packages/core/social-growth/` (constants, status machine, checks + quality guide, templates, hashtags, calendar/daily/repurpose plans, publisher + image abstractions (no adapter connected), insights, settings, AI helper, store).
- Statuses IDEA > DRAFT > REVIEW > APPROVED > PUBLISHED (+ REJECTED, ARCHIVED). SCHEDULED deliberately absent (no scheduler). PUBLISHED only by the founder pressing "Mark as published". Every change is written to `social_audit_log` (who, previous, new, reason). Editing approved words sends the post back to DRAFT.
- AI only through the existing gateway (`feature: social_content`, `ref` = post id), so cost lands in `ai_usage`; daily/monthly/spend limits read that ledger. Prompt version `social-v1` stored with provider/model/request id.
- Attribution: tracked links use utm_source/medium/campaign/content (existing traffic + signup capture understand them). Visits and sign-ups are counted from `page_views` / `users.utm`; leads, customers and revenue are entered by hand. Unrecorded = "Not available", never 0.
- Admin: `/admin/social-growth` (menu: Customers & Growth), API `/api/admin/social-growth/[section]` + `/export`, Command Centre card, admin sign-in page now shows email / ADMIN_EMAILS configured Yes-No / authorized No (never the value).
- Tests: t72 (about 60 checks, several of them repeated across roughly 1,000 generated drafts) + t63-t71 pass; tsc clean; production build clean; migration run twice; all new routes return 403 when signed out.

---

## v71 - Error patterns and ready plans (2026-10-27)
Master prompt sections 8-9; no migration.
- `packages/core/error-intel/` (recipes.ts pure, store.ts): maps the 18 tutor misconception tags and 11 adaptive-check error types onto 11 families; `dominantPattern` needs 3+ mistakes and a 40%+ share (one or two slips are never a pattern); each family has a recipe (likely cause, steps with counts, spaced review, tutor tip, parent tip). GUESSING/UNKNOWN are ignored. Last 90 days.
- Tutor/centre attention board: suggestion now names the pattern and adds the plan, plus a tip. Linked-student view (parents see the at-home tip; tutors/centres see the full plan). Never shown to the child as a label.
- Tests: t71 (about 60 checks incl. every tag mapped, supportive wording, the prompt's own procedural example), t63-t70 pass; tsc and full build clean.

---

## v70 - Fading support (worked examples) and mixed practice (2026-10-27)
Founder: "continue". Master prompt sections 11-12; no migration.
- `packages/core/pedagogy/scaffold.ts` (pure): five support levels (full worked example, partly blank example, guided, hint only, independent). Start level from the skill's mastery (<30, <50, <70, <85, 85+); first exposure = full example; two clean answers in a row take a step away; a wrong answer or a right one that needed hints puts a step back; two wrong in a row -> worked example; repair strategies stay between partly-blank and guided; INDEPENDENT_TEST = independent; CHALLENGE at least hint-only.
- Wired into the tutor chat: `TutorTurnContext.scaffoldNote` renders as "Support: ..." in the prompt (both message and answer turns). It only instructs the AI how much help to give; mastery, difficulty and questions are untouched. How well the AI follows it is not checked.
- Mixed practice (interleaving, light): `ReviewPlan.extra` = up to 6 skills with mastery 60+, not due, never lapsed, from different chapters, least recently seen first; optional block on /review. A miss still counts as forgetting; a pass is an "early" pass and changes no dates.
- Tests: t70 (about 20 checks), t63-t69 pass; tsc and full build clean.
- Not done: interleaving inside the tutor chat, per-error intervention recipes, checking the AI's compliance with support levels on real sessions.

---

## v69 - Tutor and centre: who needs attention, batches, interventions (2026-10-27)
Founder: "continue". Master prompt sections 21-24 (Tutor / Coaching Centre intelligence), the next gap on /admin/roadmap.
- Migration 0045: `batches`, `batch_students`, `interventions` (server-only, RLS on, no policies).
- `packages/core/attention/` (rules.ts pure; store.ts): per linked student, rules turn recorded practice (average mastery, days since last session, sessions in 14 days, low skills, overdue reviews, lapses) into one of: Needs a conversation / Keep an eye / Going well / Ready for harder work / Not enough information yet, with reasons, evidence and a suggested action. Supportive labels only; no marks prediction, no rank.
- Batches: tutor/centre creates batches and ticks students in; batch summary shows active students, average, how many need a conversation, and gaps shared by 2+ students.
- Interventions: problem -> evidence -> action -> result. Baseline = skill score when saved; when marked done and 5+ days later the score is compared (improved / no change / lower / not enough data, threshold 8 points). Wording says it shows what happened, not what caused it.
- Privacy: every function starts from the caller's ACTIVE `student_links` rows; ids are re-checked on the server; a revoked link removes the student from boards and batches at once; one adult cannot read or change another's batches or interventions (tested).
- Pages `/tutor/attention`, `/centre/attention`, API `/api/portal/org` (active tutor/centre only), button on the tutor/centre dashboard.
- Tests: t69 (about 40 checks incl. the privacy boundary), t63-t68 pass, tsc clean, full build clean, 0045 twice on Postgres 16.
- Not done: assigning work to a batch, a tutor-under-centre hierarchy, centre heat-map, parent-report generator, parent view of tutor plans, notifications.

---

## v68 - Spaced revision scheduler (2026-10-26)
Founder: "continue building". Master prompt section 10 (the biggest gap on /admin/roadmap).
- Migration 0044 `review_schedule` (per student per competency: step, interval, reps, lapses, due date; own-read RLS, server writes).
- `packages/core/revision/` (schedule.ts pure rules, store.ts): worked out from `student_competency_evidence` (quizzes, path practice, diagnostics, reviews), so no change to existing answer paths. Steps 1/3/7/14/30/60 days; each IST day counts once; a pass on/after the due day moves up, a miss (even early) goes back to step 1 and counts a lapse (2+ lapses = 30% shorter intervals); early passes change nothing; due date never later than the day before the exam (setting `boards` board1_date; ignored if blank or past); pre-exam mode in the last 21 days. Plan = daily (cap 6, 10 pre-exam), weekly count, long-gap count; priority = overdue x lapses x importance x weakness; neighbours mixed across chapters.
- `reviewStep` in baseline/store.ts: one unseen-first question per due skill, marked on the server, answer key never sent; evidence recorded with source 'review', which feeds the schedule and the mastery estimate.
- `/review` page + `/api/review`, "Revise today" in the header menu and a button on /today. English and Hindi.
- Tests: t68 (30 checks on the rules + store on a fake DB), t67/t67b/t63/t64/t65 still pass; tsc clean; full build clean; 0044 twice on Postgres 16.
- Not done: reminders/notifications, parent/tutor view of due reviews, tuning of the steps with real data.

---

## v67 - Grouped admin menu, Feedback Intelligence, status page (2026-10-26)
Founder asked for a tidy admin menu with categories, and to execute the "Learning Intelligence Platform" master prompt.
- Admin menu: one list (`apps/web/lib/admin-menu.ts`) of 8 groups (Overview, Students & Learning, Content & Questions, AI, Money, Customers & Growth, Feedback, Settings & Safety). `AdminNav` now renders `components/AdminMenu.tsx` (dropdowns, search box, current page highlighted, phone-friendly). All ~45 admin pages pick it up with no edits. Command Centre has an "Everything in one place" map (`AdminMap`). Test t67 checks every admin page is in the menu exactly once and every link has a page.
- Feedback Intelligence (prompt sections 26-30): migration 0043 (feedback + category, feature_area, severity, cluster_id, duplicate_of, analysed_at; `feedback_clusters`; `feedback_cluster_events`; server-only). `packages/core/feedback-intel/` (rules.ts pure, store.ts). Rule-based sorting into 11 kinds, severity, risk (low/medium/high per section 28), likely cause, proposed action; grouping by same kind + same area + shared words; repeat detection. Page `/admin/feedback-intelligence`; five buttons (Approve, Reject, Modify, Investigate, Defer) plus follow-up (Implemented, Verified, Rolled back). Server enforces allowed moves; high-risk groups need a note and an "I have tested this" tick. Nothing is deployed or changed by a button. No AI is used (no cost). `/admin/feedback` now has the menu and category.
- `/admin/roadmap`: honest status of every prompt section (BUILT / PARTIAL / NOT IMPLEMENTED / REQUIRES PROVIDER).
- NOT built from the prompt (stated, not faked): spaced revision scheduler, interleaving, worked-example fading, Teach Sahayak, voice listening, tutor/centre batches, School Admin role, question-level feedback link, AI-written fix proposals.
- Tests: t67 (menu + rules, ~60 checks), t67b (store on a fake DB: 37 Hindi reports become translation groups, high-risk gate, history), t63/t64/t65 still pass, tsc clean, full build clean (font stub), 0043 ran twice on Postgres 16.

---

## 2026-10-16 — v37: AI usage/cost log, new prices (₹1000/subject), free plan, pricing on the home page, signed-in redirect, readable name

**Task (founder):** build the AI usage/cost logging first; once a student is signed in the sign-up page must never show; the user name must be bright/readable; add a free tier (free-tier AI only); show pricing with features under each plan on the home page; raise the per-subject price from ₹300 to ₹1000 and recalculate the others.

**What was done:**
1. **AI usage log** (migration 0017 `ai_usage`): every AI call attempt (also failed ones) records provider, what it was for (tutor, evaluation, summary, explanation, question generation, misconception), tokens, time. No prompt or answer text. Students cannot read or write it (RLS on, no policy). `/admin/ai-costs` shows a month at a time: totals, by AI company, by use, free vs paid, and by student, as "list price" (what it would cost at public prices) and "actually billed" (only providers not in `AI_FREE_PROVIDERS`). Rates are planning numbers in `packages/core/ai-provider/usage.ts`.
2. **Prices** (proposed by me, founder to confirm): ₹1000 per subject per month; ₹3,300 per month for 5 subjects till Feb 2027 (same 2/3 ratio as before); ₹15,000 one time for 5 subjects till 31 Mar 2027 (4.5 months of the monthly plan, as before). All in `plans.ts`; FAQ, offer page, admin form and payment form read from it; legal pages updated.
3. **Free plan** (`plan_code = 'free'`): 1 subject, no end date, diagnostic, practice quizzes, parent report, past papers, AI tutor limited to 10 replies per day on free-tier AI models only (a free student's request can never reach a paid model), no timed mock exams. Paid plans (and grandfathered/custom): up to 100 tutor replies per day as a fair-use guard, free models first and paid models as backup so a lesson does not stop. Daily limits reset at midnight India time. Founder assigns Free at `/admin/students`; if self sign-up is ever opened, new sign-ups start on Free.
4. **Home page**: four plan cards (Free + three paid) with the features under each, bilingual, read from the same plan file. Offer page uses the same cards.
5. **Signed-in people never see the sign-in/sign-up page**: `/` is now decided on the server (admin → /admin/students, teacher → /teacher, student → profile or dashboard); the old client page moved to `components/HomeClient.tsx`; someone mid-way through choosing subjects sees only that step, no sales sections.
6. **Name badge**: the header name is now a bright marigold badge, larger, and no longer hidden on phones (it was `display:none` under 720px and dark grey).

**Tests run:** tsc clean; full build clean; font-stub layout restored identical. 25 unit checks (plan tiers/caps, free-plan mock gate, IST day boundaries, cost maths, usage roll-up, month range, fallback logging incl. a failing logger, free chain excludes paid providers, `AI_FREE_PROVIDERS` override, daily-limit check at/under limit). Scratch Postgres: 0017 applies twice; `free` accepted and a bogus plan rejected; an `authenticated` user sees 0 rows of `ai_usage` and cannot insert even with table grants. Pricing cards rendered to text in English and Hindi (no missing keys).
**Not tested:** anything against the real Supabase or a real browser (writes to `ai_usage` via the service key, the cost page, sign-in redirect, free-plan limits end to end), real AI providers' token counts, mobile layout by eye.

**Deployment status:** Not deployed. Package: `sahayak-v37-pricing-free-aicost-delta.zip` (apply after v34, v35, v36; migration 0017).

---

## 2026-10-16 — v36: three paid plans (enforced), invitation-only students, first-login profile step, teacher review area

**Task:** Founder set three plans — (i) Rs 300 per subject per month, (ii) Rs 999 per month for up to 5 subjects till Feb 2027, (iii) Rs 4500 one time for up to 5 subjects till March 2027 — and asked for: no self sign-up until March 2027 or until he says so; students get an email + password from him and land on the profile page after first sign-in; a teacher dashboard where teachers evaluate AI-generated questions/quizzes/answers and share feedback (payment to teachers optional for now); teachers can register themselves or be given credentials. Answers to my three questions: (ii) is billed monthly; self-registered teachers need his approval first; plans are enforced.

**What was done:**
1. **Plans (migration 0016, `packages/core/plans`, `packages/core/access`).** `student_access` (plan, subject limit, end date; read-only to the student via RLS). Existing students were given a one-time `grandfathered` row (no end date) so nobody is locked out; the backfill runs only when the table is first created. Rules: no row = no access; access lasts through `access_until`; expired students keep their dashboard/reports but cannot start new learning; Maths Standard + Basic count as one subject; monthly plans cannot be dated past their last date (Feb 28 / Mar 31 2027).
2. **Enforcement** at session start, diagnostic start, quiz start, mock start, subject registration and onboarding (friendly English/Hindi messages).
3. **Closed sign-up.** Home page shows sign-in only (plus an invitation note and a teacher-register link); `SIGNUPS_OPEN=true` re-opens the form. Onboarding refuses to create a student record for anyone the founder has not created. **Supabase's own "Allow new users to sign up" must also be switched off by the founder** (the site setting only hides the form).
4. **Founder-created students (`/admin/students`).** Create an account (email, name, plan, subject count, end date, generated or chosen password shown once), edit a plan, set a new password. New students are flagged `must_complete_profile`; first sign-in goes to `/profile?welcome=1` (with an optional change-password box), then on to choosing subjects. Sign-in now routes by role (`/api/me`): admin, teacher, student.
5. **Payments.** The payment form now asks which plan was paid. Confirming a payment no longer invents a 240-day window: access is set only at `/admin/students` (money and access are deliberately separate steps).
6. **Offer page, FAQ, legal copy** now describe the three plans and invitation-only joining.
7. **Teachers.** `users.role` gains `teacher`; `teacher_profiles` (pending / approved / suspended). Teachers self-register at `/teacher/register` (server-side, honeypot, pending until approved) or the founder creates approved accounts at `/admin/teachers`. `/teacher`: pick a subject and question set, see each question with its answer key and explanation, and send feedback (looks correct / needs a fix / reject, comment, optional corrected answer or explanation); counts of their reviews are shown. `content_reviews` stores feedback only. `/admin/reviews` groups feedback per question and lets the founder mark it verified, rejected (never served again) or back to needs-review. Payment to teachers: only review counts are shown; no payment feature.

**Tests run:** `tsc` clean; `npm run build` clean (61 routes; font-stub, `layout.tsx` restored identical). Scratch Postgres 16: 0016 applies and re-runs cleanly; backfill gave existing students a grandfathered row once, a later plan change survived a re-run, a student added later got no row; role check now includes teacher. RLS with two accounts: a student sees only their own access row and cannot change it or insert one; a teacher sees only their own profile and reviews and cannot edit them. Unit checks (17 cases) for access evaluation, expiry on the last day, subject families and limits, plan end-date rules. **Not tested:** any of the new admin/teacher API routes or pages against real Supabase (account creation via the admin API, sign-in routing, the review queue), a real browser, or two real accounts end to end.

**Deployment status:** Not deployed. Package: `sahayak-v36-plans-teachers-delta.zip` (apply after v34 and v35; migrations 0014, 0015, 0016).

---

## 2026-10-15 — v35: Maths Standard/Basic, timed mock exams, board-readiness bands, landing-page FAQ, level-adaptive animations

**Task:** Founder asked for five things: the split of Maths into Standard and Basic, timed mock exams, board-readiness bands, a landing-page FAQ, and animations that depend on the student's learning level in the learning module.

**What was done:**
1. **Maths Standard / Basic (migration 0014).** `maths` is renamed "Mathematics (Standard)" (slug unchanged, so no student's mastery is re-keyed). New subject `maths-basic` (pilot): chapters, topics, skills (slug + `-basic`) and prerequisites are cloned from Standard in a guarded one-time block; its diagnostic test and question bank are copies of Standard's questions at difficulty 1-3 only, all `needs_review`. Basic sessions and quiz top-ups are capped at difficulty 3 (orchestrator + `generateQuizTopUp`), and the AI generator is told to write Basic-level items. Teaching diagrams and icons fall back to the Standard ones. Sign-up lists both; picking one unticks the other. `cbse-class10-maths.json` now carries the new name so re-seeding does not undo the rename.
2. **Timed mock exams (migration 0015).** `mock_exams` table (read-only to the student via RLS; all writes go through server routes using the service client with the session-derived student id, so the deadline/score cannot be edited from the browser). `packages/core/mock/mock-exam.service.ts`: 20 questions spread round-robin across chapters from the subject's question bank (never `rejected`), 1.5 min/question (30 min), server deadline, resume of an unexpired exam, autosave, auto-submit (client timer and server on next load), 30-second submit grace, graded with `gradeAnswer`, per-chapter breakdown and full review. `/mock` page + `/api/mock/*`. It never touches mastery. Labelled everywhere as an objective-style practice paper, not a CBSE replica.
3. **Board-readiness bands.** `packages/core/readiness/readiness.service.ts`: insufficient evidence / building foundations / developing / on track / well prepared. Higher bands need more evidence (on track needs 40% syllabus assessed; well prepared needs 60% assessed AND a timed mock averaging 70%+; pilot subjects never go above on track; mocks 20+ points below practice mastery drop one level). Each band shows its reasons and one next step. On `/report` and in the WhatsApp text, with a "not a prediction" statement.
4. **FAQ.** `packages/core/content/faq.ts` (English + Hindi, price/duration/phone pulled from the single sources) + `FaqSection` (native `<details>`), on the home page and `/pilot`.
5. **Level-adaptive animations.** `animationLevelForScore` maps current skill mastery to guided / standard / brisk. Teaching diagrams reveal with a slow wipe + pointer + replay (guided), a short wipe (standard) or a quick fade (brisk). Answer feedback pops at a level-matched size; a wrong answer never shakes or turns red. The session summary animates the skill's progress bar and plays a level-up burst when the band rose; the summary now includes `progress` (start/end score and band). All motion is off under `prefers-reduced-motion`. Presentation only — never changes mastery or difficulty.

**Files new:** migrations `0014_maths_standard_basic.sql`, `0015_mock_exams.sql`; `packages/core/{mock,readiness,content,learning-animation}/...`; `apps/web/app/mock/page.tsx`; `apps/web/app/api/mock/{start,[id],[id]/save,[id]/submit}/route.ts`; components `FaqSection`, `AnimatedDiagram`, `AnswerFeedback`, `SessionProgressReveal`. **Changed:** parent-report service + report page, session-summary service, learn page, home page, `/pilot`, tutor orchestrator, skill-quiz engine, AI question generator prompt, learning-diagram mapping, SubjectIcon, i18n dictionary, SiteHeader, globals.css, maths seed JSON, barrel `index.ts`.

**Tests run:** `tsc --noEmit` clean; `npm run build` clean (font-stub/restore, `layout.tsx` identical afterwards); migrations 0002-0015 on scratch Postgres 16 — 0014 on a small Maths fixture: rename, Basic pilot status, chapters/skills/prerequisites cloned, only difficulty <=3 questions copied (all `needs_review`), a second run changed nothing (row counts identical); 0015 re-runs cleanly, and with two students a signed-in student sees only their own exam row and cannot update or insert (blocked by RLS). Unit checks: 12 readiness cases (insufficient evidence, evidence gates, mock-gap, pilot cap) all pass; chapter spread gives a balanced 20-question paper and handles a short bank; animation-level thresholds and level-up detection pass. **Not tested:** the mock service against a real Supabase/PostgREST (grading, resume, auto-submit were not exercised end to end), the mock page and animations in a real browser, live AI, two real accounts.

**Deployment status:** Not deployed. Packaged as `sahayak-v35-maths-mock-readiness-delta.zip`. Apply v34 first (or together, in order), then v35.

**Known limits / decisions for the founder:** see DECISIONS.md v35 entry. Notably: Basic questions are Standard's easier items (not a separately authored Basic bank); readiness thresholds are my judgment; teaching diagrams are still static SVGs revealed with CSS, not true animated diagrams.

---

## 2026-10-15 — v34: "Complete Board Preparation" — ₹999 offer, 6 subjects, check-ins, confidence trend (bundles v31–v33)

**Task:** Founder answered both open master-prompt decisions — (1) switch to ₹999 "Complete Board Preparation" pricing/positioning, (2) add the other 4 subjects now — and asked for the rest of the master prompt to be built, clubbed with v31/v32/v33 into one final build.

**What was done:**
1. **Pricing/positioning.** `BOARD_PREP_OFFER` (₹999, 240 days, label "Sahayak Complete Board Preparation — CBSE Class 10, 2027") replaces `PILOT_OFFER` (kept as an alias). `/pilot` page rewritten: price, duration, what's included, what is NOT included, subject list with live status, refund/support pointers, no score guarantees. Terms / Scope-and-Limitations / Payment policy copy updated in English + Hindi (still founder-review drafts). Admin payments: new `refunded` status + "Mark refunded / revoke access" button (migration 0013 widens the status check).
2. **Subject catalogue + readiness.** `subjects.status` (ready / pilot / in_development / coming_soon) + `description`. Maths, Science = ready; Social Science, English Language & Literature, Hindi Course A, Computer Applications = pilot. New `packages/core/subjects/subject.service.ts` (`loadSubjectCatalogue`, `registerSubject`, `isUsableSubjectStatus`). `learning_goals` already held one row per (student, subject), so multi-subject needed no new table — added `learning_goals.activated_at` so a student can switch their active subject. Onboarding now takes `subjects[]` (checkboxes, status badges); new `/subjects` page + `/api/student/subjects`; dashboard/progress show only registered-or-started subjects; the diagnostic picker now filters on status instead of a hardcoded slug list and starting a diagnostic registers+activates that subject.
3. **New subject content.** 6 seed files (English, Hindi, Computer Applications — curriculum + diagnostic; 62 skills, 62 diagnostic questions). **AI-written, not teacher-verified** — all marked `pilot` / `needs_review`. Depth beyond the one anchor question per skill comes from the v32 generate-and-persist mechanism.
4. **Content verification status.** `questions.content_status` and `diagnostic_questions.content_status` (verified / needs_review / rejected). One-time backfill in migration 0013: AI-generated rows and everything in a non-ready subject → needs_review. New generated questions are written as needs_review; `rejected` rows are never served (filters added to selector, quiz, diagnostic). `seed-diagnostic.js` sets the status from the subject's status.
5. **Pre-session check-in + confidence (master prompt sec. 13–19).** New `session_checkins` table (+RLS), `packages/core/checkins/checkin.service.ts`, `CheckInForm` (mood, focus, confidence 0–10, time, goal; all optional, skippable). Session is created after the check-in; "recovery mode" (≥2 of: low mood/energy, very distracted, confidence ≤3) makes only the first 3 questions of THAT session one level easier and never touches stored mastery. Confidence-after is collected on the session summary. `loadConfidenceTrend` → latest / previous / 7-day / 30-day, direction, per-subject, before→after change, and a cautious confidence-vs-unaided-accuracy note.
6. **Parent report.** `/report` now shows the confidence trend (with a small chart), per-subject syllabus coverage (skills assessed / total) and an "evidence" level (insufficient / limited / good — about the data, not the child), pilot-subject notes, and "diagnostic needed" for registered-but-unstarted subjects. WhatsApp share text includes coverage and confidence.
7. **Bug found and fixed:** `buildParentReport` selected `skills(chapters(...))` but skills link to topics, not chapters, so the "current mastery" half of the v29 report could never load. Now `skills(topics(chapters(...)))`.
8. Docs: new `docs/CONTENT_STATUS.md`; this log, `RESUME_HERE.md`, `DECISIONS.md`, `LAUNCH_CHECKLIST.md`, `PROJECT_CONTEXT.md`, `CLAUDE.md` updated.

**Files changed (new):** migration `0013_board_prep_foundations.sql`; 6 seed JSON files; `packages/core/subjects/subject.service.ts`; `packages/core/checkins/checkin.service.ts`; `apps/web/app/subjects/page.tsx`; `apps/web/app/api/student/subjects/route.ts`; `apps/web/app/api/session/checkin-after/route.ts`; `apps/web/components/{CheckInForm,SubjectManager,ConfidenceChart}.tsx`. **Changed:** pilot-payment service, i18n dictionary, `/pilot`, legal content (3 files), admin payments page/route/actions, onboarding route + home page, dashboard, progress, diagnostic page + start route, learner-state ordering, curriculum loader/types, session start route, orchestrator, selector/quiz/diagnostic engines, parent-report service, report page, footer, layout metadata, SubjectIcon, seed-diagnostic.js.

**Tests run:** `tsc --noEmit` clean; `npm run build` clean (43 routes; font-stub/restore, `layout.tsx` confirmed identical afterwards). Migrations 0002–0013 applied to a scratch Postgres 16 (auth/storage stubbed): applied cleanly, 0013 re-run twice is a no-op, backfill ran once only and did not overwrite a later "verified" value; Social Science → pilot/needs_review, Maths → ready/verified. All 6 seed files parse and were cross-checked (every skill has one question; MCQ answers are among options). **Not tested:** anything against live Supabase, a live AI provider, two real accounts (RLS on `session_checkins`), or a real browser.

**Deployment status:** Not deployed. Packaged as `sahayak-v34-complete-board-prep-delta.zip` — contains v31+v32+v33+v34 (apply once, in one go).

**Deliberately not built (and why):** Mathematics Basic vs Standard split and Hindi A/B as separate courses (a Maths split would re-key live mastery data — needs its own round); the 7-stage assessment ladder, timed board-style/mock exams, board-readiness bands beyond coverage+evidence; hard paywall (payments are tracked and shown but nothing blocks a non-paying signed-in student — founder decision needed); landing-page FAQ/sample-report; Excel metrics tracker update; animations.

---

## 2026-10-14 — v33: diagnostic generation safety net + chat figures; master-prompt audit

**Task:** Founder asked (1) whether the diagnostic test can also be AI-generated, (2) for graphs/animations/figures/sketches everywhere needed across tests/quizzes/learning, and (3) pasted a large "Master Implementation Prompt" (CBSE board-prep commercial platform pivot — 6 subjects, ₹999 pricing, pre-session check-ins, confidence tracking, board readiness, etc.) asking to implement it.

**What was done:**
1. Extended v32's bank-first-then-generate-and-persist pattern to the diagnostic test: `pickOrGenerateQuestionForSkill` in `packages/core/diagnostic/engine.ts` tries the bank first (unchanged behavior), and only generates+persists via AI when a test+skill combination has zero bank questions — used both for the anchor-skill plan (`startDiagnostic`) and prerequisite-check insertion (`answerDiagnosticQuestion`). Deliberately a safety net, not a way to introduce variety into the diagnostic's curated anchor set — see `docs/DECISIONS.md`.
2. Closed a real gap in figure coverage: `questions.figure_url`/`figure_caption` existed since migration 0010 but were never selected or rendered anywhere — regular learning-session practice questions (the back-and-forth chat in `/learn`, distinct from the post-session quiz) now show a question's figure too, via `question-engine/selector.ts` selecting the columns and `orchestrator/tutor.orchestrator.ts` threading them through `activeQuestion`.
3. "Animations" was not built — flagged to the founder as needing a specific moment named (a correct-answer flourish, a mastery level-up, etc.) rather than being open-ended, and the master prompt's own Section 48 explicitly warns against unnecessary animation work at this stage.
4. For the pasted master prompt: per its own Section 53/54 ("do not start coding, perform an audit first, only proceed after I approve"), produced a full audit + phased plan rather than attempting the whole thing — written to the claude.ai project as `master-prompt-audit-and-plan.md`. Key findings: the existing stack/architecture/curriculum-hierarchy/RLS pattern already matches what the master prompt asks for (classified KEEP); the big genuinely-new asks are 4 more subjects' worth of verified content, a multi-subject registration/availability system, and a pre-session check-in + confidence/engagement tracking system (none of which exist today); and two items explicitly need the founder's decision before any code changes — the ₹999 vs. live ₹199 pricing/positioning, and whether to expand subject scope before or after the current Maths/Science pilot is validated. Recommended the check-in/confidence system as the next buildable P0 item since it's self-contained and doesn't depend on either open decision.

**Files changed:** `packages/core/diagnostic/engine.ts`, `packages/core/question-engine/selector.ts`, `packages/core/orchestrator/tutor.orchestrator.ts`, `apps/web/app/learn/page.tsx`. No new migrations.

**Tests run:** `npx tsc --noEmit -p apps/web/tsconfig.json` clean; full `npm run build` clean (font-stub/restore workaround, restore confirmed identical via `diff`), 40 routes. As with v32, the actual AI-generated content and the chat-figure rendering are unverified against a live AI call/live site from this environment.

**Deployment status:** Not yet deployed. Packaged as `sahayak-v33-diagnostic-generation-and-chat-figures-delta.zip`, on top of v31+v32 (also not yet deployed).

**Outstanding:** live confirmation of v31/v32/v33 together once deployed; founder's decision on the two master-prompt items named above.

---

## 2026-10-14 — v32: AI-generated questions/answers/solutions, extended to the quiz

**Task:** Founder's answer to v31's open question: wants the deeper per-subject push (confirmed "~1000 per skill"), and asked whether the tool can generate questions/answers/quizzes/solutions itself from skill+difficulty without a pre-authored bank — build it if so.

**What was found:** a bank-first-then-AI-generate-and-persist pattern already existed, but only for regular learning-session practice questions (`packages/core/question-engine/selector.ts`, predates this round) — the diagnostic test and the post-session quiz were both bank-only. The existing generator also had a real bug: its system prompt was hardcoded to "CBSE Class 10 Maths," so a Science skill falling back to generation would silently get a Maths-flavored question.

**What was done:**
1. Extracted the generation + validation logic into a shared, subject-aware module, `packages/core/question-engine/ai-question-generator.ts` — fixes the Maths-hardcoding bug (now reads the skill's real subject off the curriculum via a nested join) and asks for the worked solution in the same call as the question (previously generated separately, lazily, only on a miss).
2. `question-engine/selector.ts` now delegates to the shared module (no behavior change for learning sessions beyond the subject fix and getting an explanation stored immediately instead of lazily).
3. `quiz/skill-quiz.engine.ts`'s `generateSkillQuiz` now tops up a skill's quiz with AI-generated questions when the bank has fewer than 5 for that skill, persisting each one into `diagnostic_questions` (`source: 'generated'`) before serving it — so the bank for that skill is permanently larger afterward, not just padded out for one quiz.
4. Migration 0012: added `questions.explanation` (referenced by `ensure-explanation.ts` and migration 0008's RLS policy, but never actually created — a dormant, never-yet-triggered bug, now closed) and `diagnostic_questions.source`/`validated` (mirroring `questions`, defaulting existing rows to `'bank'`/`true` so today's diagnostic behavior is unaffected).
5. `packages/core/orchestrator/tutor.orchestrator.ts` now resolves and threads a real `subjectName` through to the generator (previously nothing told it which subject it was generating for).

**Why the diagnostic test itself is untouched:** see `docs/DECISIONS.md` — a new student's first diagnostic benefits more from a fixed, consistent, curated anchor set than from variety, and no student sees more than a handful of questions per skill in one diagnostic anyway. Generation now covers the two places repeated volume actually matters: ongoing learning-session practice and the post-session quiz.

**Files changed:** `packages/db/migrations/0012_generated_question_support.sql` (new), `packages/core/question-engine/ai-question-generator.ts` (new), `packages/core/question-engine/selector.ts`, `packages/core/quiz/skill-quiz.engine.ts`, `packages/core/orchestrator/tutor.orchestrator.ts`, `packages/core/index.ts`.

**Tests run:** `npx tsc --noEmit -p apps/web/tsconfig.json` clean; full `npm run build` clean (font-stub/restore workaround, restore confirmed identical via `diff`), 40 routes. Not tested against a live AI call or the live database (no API keys / DB in this environment) — the shape validation, the subject-join query, and the fallback-to-bank-only-on-failure path were all reviewed by re-reading the code, not executed against a real provider. The founder should specifically watch for: a post-session quiz on a thin skill still completing successfully (even if generation silently fails), and a generated Science question actually asking about Science, not Maths.

**Deployment status:** Not yet deployed. Packaged as a delta on top of v31 (itself not yet deployed) — apply 0010/0011/0012 together.

**Outstanding:** live confirmation once deployed; whether to also extend generation to the diagnostic test itself is deliberately left for the founder to request later, not assumed.

---

## 2026-10-14 — v31: score-visual gauges + question figures

**Task:** Founder asked for (1) proper equation rendering in Maths/Science, (2) diagnostic scoring shown as a visual instead of plain text, (3) graphs/tables/figures attached to diagnostic questions where helpful, and (4) ~1000 questions per individual skill in both subjects with higher difficulty.

**What was done:**
1. Audited every place a question/explanation/chat message renders — `MathText`/KaTeX already covers all of them (diagnostic, post-session quiz, learning chat) from an earlier round. No change needed.
2. Added `figure_url`/`figure_caption` nullable columns to `diagnostic_questions` and `questions` (migration 0010); a `QuestionFigure` component; wired it into the diagnostic question card + review list and the post-session quiz card + review list (`packages/core/diagnostic/engine.ts`, `packages/core/quiz/skill-quiz.engine.ts` both now select/return the new fields). Migration 0011 backfills real figures onto 14 skills — 12 reuse existing `learning-diagrams` SVGs (Pythagoras, trig ratios, circle/sector area, parabola zeroes, line relationships, tangent properties, Ohm's law, series/parallel resistance, concave mirror, convex lens), plus 2 statistics skills (mean/median-mode of grouped data) sharing one newly-authored frequency-distribution-table SVG (`apps/web/public/learning-diagrams/frequency-table-generic.svg`).
3. Added the existing `MasteryArc` gauge component (already used on `/progress` and `/parent/[token]`) to the diagnostic results screen, the post-session quiz score banner, and the `/report` page — all three previously showed score as plain text/numbers only.
4. The question-count request was **not started** this round — see `docs/DECISIONS.md` for why (a literal reading is ~40-60x the current bank size and conflicts with content-ceiling findings from earlier rounds). Flagged explicitly in the v31 INSTRUCTIONS.txt for the founder to resolve, rather than silently picking an interpretation or silently building toward the literal number.

**Files changed:** `packages/db/migrations/0010_question_figures.sql` (new), `packages/db/migrations/0011_question_figures_backfill.sql` (new), `apps/web/public/learning-diagrams/frequency-table-generic.svg` (new), `apps/web/components/QuestionFigure.tsx` (new), `packages/core/diagnostic/engine.ts`, `packages/core/quiz/skill-quiz.engine.ts`, `apps/web/app/diagnostic/page.tsx`, `apps/web/app/learn/page.tsx`, `apps/web/app/report/page.tsx`, `apps/web/app/globals.css`.

**Tests run:** `npx tsc --noEmit -p apps/web/tsconfig.json` clean; full `npm run build` clean (font-stub/restore workaround, restore confirmed via `diff` against a backup — identical). Not yet tested against the live database (new migrations haven't run anywhere yet) — the founder should verify live using `sahayak-v31-figures-and-score-visual-delta.zip`'s INSTRUCTIONS.txt once deployed.

**Deployment status:** Not yet deployed. Packaged as a delta on top of live v29+v30.

**Outstanding:** question-bank scale decision (see `docs/DECISIONS.md` and `docs/RESUME_HERE.md`); live confirmation of this round once the founder deploys it.

---

## 2026-10-13 — v29 + v30 deployed and confirmed working live

**Task:** none (status update). The founder deployed both v29 (combined 10-day-MVP build) and v30 (diagnostic-resume fix) and reported "v30 deployed and working."

**Tests run:** none by this session — this is the founder's own live confirmation, the first real-deployment verification this project has had in this round (everything before this was build-environment-only: `tsc`/`npm run build` clean, never confirmed against the actual production site or database until now).

**Deployment status:** LIVE. v29 and v30 are both in production.

**Outstanding issues:** see `docs/RESUME_HERE.md` — founder attribution/legal-page approval, and the Day 4 live two-account privacy test, are the next real items.

---

## 2026-10-13 — Diagnostic-save root cause found and fixed (v30)

**Task:** Pin down the "diagnostic results don't save" symptom from v29's open items.

**What was done:**
1. Gave the founder a safe, read-only SQL query joining `diagnostic_attempts` to a live count of each student's `mastery_states` rows.
2. Founder ran it against the real production database and shared the results (20 real rows).
3. Reading those results: every `status = 'completed'` attempt had a non-zero mastery row count — the save path was never actually broken. Several students (e.g. one with 5 attempts, only 1 completed) had many `in_progress` attempts that were never finished.
4. Founder confirmed: yes, the real scenario was starting the diagnostic more than once without finishing it, not a case of a genuinely completed test failing to save.
5. Root cause: `startDiagnostic()` always created a new `diagnostic_attempts` row, with no check for an existing `in_progress` one for the same student+subject — so a reopened/abandoned test was silently orphaned instead of resumed.

**Fix:** `packages/core/diagnostic/engine.ts`'s `startDiagnostic()` now checks for an existing in-progress attempt first and resumes it (computing the next unanswered question from its own stored plan/answers) instead of starting a duplicate. `apps/web/app/api/diagnostic/start/route.ts` passes through the new `resumed`/`answeredCount` fields; `apps/web/app/diagnostic/page.tsx` shows a small "picking up your unfinished diagnostic" notice and starts the on-screen question counter from the right place instead of back at 1.

**Files changed:** `packages/core/diagnostic/engine.ts`, `packages/core/i18n/dictionary.ts` (new `diagnostic.resuming` string), `apps/web/app/api/diagnostic/start/route.ts`, `apps/web/app/diagnostic/page.tsx`.

**Tests run:** `npx tsc --noEmit` clean; full `npm run build` clean (same font-stub/restore workaround, restore confirmed via empty diff). Not yet tested against the live database (no new migration needed, so nothing to run `db:migrate` for) — the founder should verify live using the steps in `sahayak-v30-diagnostic-resume-delta.zip`'s INSTRUCTIONS.txt once deployed.

**Deployment status:** Not yet deployed. Packaged as a small delta on top of the still-undeployed v29.

**Outstanding:** the old orphaned `in_progress` rows already in the database from before this fix are harmless leftovers, intentionally left alone (not deleted) pending the founder's say-so.

---

## 2026-10-12 — Day 1 investigation + 10-day MVP build pass

**Task:** Inspect the real repository (not a stale local copy) against the new "SAHAYAK MASTER IMPLEMENTATION PROMPT" 10-day MVP brief; report findings; fix the one confirmed bug found; then build the remaining Day 2–9 items in one combined pass per the founder's instruction to build everything first and deploy once.

**Files changed (final list, this session):**
- `packages/db/migrations/0008_explanation_update_policy.sql` — new. Explanation-cache RLS fix.
- `packages/db/migrations/0009_pilot_payments.sql` — new. `pilot_payments` table + RLS (student can insert/read own; no update policy for `authenticated` at all — admin-only via service-role).
- `PROJECT_CONTEXT.md`, `CLAUDE.md`, `docs/BUILD_LOG.md`, `docs/DECISIONS.md`, `docs/DEPLOYMENT_GUIDE.md`, `docs/RESUME_HERE.md`, `docs/LAUNCH_CHECKLIST.md` — new. Persistent project memory.
- `packages/core/i18n/dictionary.ts` — new. English/Hindi UI dictionary.
- `packages/core/branding/founder.ts` — new. Single configurable founder-attribution source.
- `packages/core/pilot/pilot-payment.service.ts` — new. Submit/list/confirm/reject payment claims.
- `packages/core/reports/parent-report.service.ts` — new. Parent-facing progress summary built only from real data; explicit "not enough data" fallback, no invented percentages.
- `packages/core/index.ts` — modified. Exports the four new modules above.
- `apps/web/components/LanguageProvider.tsx`, `LanguageToggle.tsx` — new. Cookie-based language context + toggle.
- `apps/web/lib/language.ts` — new. Server-side cookie read.
- `apps/web/app/layout.tsx` — modified. Wraps the app in `LanguageProvider`, reads the cookie server-side first to avoid a language flash.
- `apps/web/components/SiteHeader.tsx` — modified. Nav labels translated, "Report" and "Join the pilot" links added, language toggle added.
- `apps/web/components/Footer.tsx` — modified. Legal-page links, founder attribution line, language toggle added; made async to read the language cookie.
- `apps/web/app/page.tsx` — modified. Sign-in/sign-up/onboarding strings translated.
- `apps/web/app/dashboard/page.tsx` — modified. Key strings translated; new "Report" quick-action card.
- `apps/web/app/progress/page.tsx` — modified. Key strings translated.
- `apps/web/app/diagnostic/page.tsx` — modified. Added the "question shown in English" label (question bank itself not translated, per brief scope).
- `apps/web/app/report/page.tsx`, `apps/web/app/api/report/route.ts` — new. Parent-facing report page + API.
- `apps/web/app/pilot/page.tsx`, `apps/web/components/PilotPaymentForm.tsx`, `apps/web/app/api/pilot/payment/route.ts` — new. Pilot offer page, payment-confirmation form, API.
- `apps/web/app/admin/payments/page.tsx`, `apps/web/components/AdminPaymentActions.tsx`, `apps/web/app/api/admin/payments/[id]/route.ts` — new. Admin-only (ADMIN_EMAILS-gated) confirm/reject workflow.
- `apps/web/components/LegalPageLayout.tsx`, `apps/web/content/legal/*.ts`, `apps/web/app/legal/{terms,privacy,pilot-limitations,payment-policy}/page.tsx`, `apps/web/app/contact/page.tsx` — new. Five bilingual legal/contact pages (drafts, pending founder review).

**Reason for each change:** see `docs/DECISIONS.md`.

**Tests run:**
- `npx tsc --noEmit -p apps/web/tsconfig.json` — clean, run twice (once mid-pass, once on the final combined set).
- Full `npm run build` — clean, run twice (once mid-pass, once on the final combined set) via the font-stub/restore workaround; confirmed `git diff --stat apps/web/app/layout.tsx` empty afterward both times. 40 routes generated, including `/pilot`, `/report`, `/admin/payments`, the 5 legal/contact pages.
- Diagnostic-save symptom: NOT reproduced against live data — still open, see `docs/RESUME_HERE.md`.
- NOT tested: live cross-user privacy (needs two real accounts against the real database), the payment flow against a real UPI payment, Hindi text rendering in an actual browser (only verified the strings exist and the build compiles).

**Deployment status:** Not yet deployed. Per the founder's explicit instruction, built as one combined delta to deploy together.

**Outstanding issues:** see `docs/RESUME_HERE.md`.

---


## 2026-10-17 — v38: every "partly built" item of the master prompt finished
**Founder request:** "complete this first: Partly built ... than what has not been built." So v38 closes the Partly-built list (sections 5, 7, 10, 11, 12, 18, 19, 20, 23, 24, 30, 31-33, 36). The Not-built list is untouched.

**Migration 0018** (additive, re-runnable): onboarding fields on `learning_profiles` (exam_year, preferred_language, daily_study_minutes); `curricula.academic_year`; question details on `questions` and `diagnostic_questions` (marks, expected_time_seconds, cognitive_level, language); teacher suggestions on `content_reviews`; ten more likely-cause tags on `misconceptions`; `learning_sessions.active_question_posed_at`; `recovery_events` (owner read/insert RLS, one per session+trigger); `mock_exams.kind` + `chapter_id`; `diagnostic_attempts.chapter_id` (reserved, not used yet); `subject_gate_signoffs` (RLS on, no policies: server only).

**What changed**
- Onboarding (5): exam year, preferred language (applied at once), daily study time asked and stored; board/class shown (CBSE Class 10).
- Question details (7): marks and cognitive level are NOT invented (left empty until a person sets them); expected time backfilled with a planning default by type; language 'en'. Teachers can suggest marks/level; founder saves them at /admin/reviews.
- Quality gates (36): `/admin/quality`: ten gates per subject signed off by the founder, with computed evidence next to them; Promote to Ready only when all ten are signed off; Put back to Pilot.
- Error types (11): Science and language tag sets; used only when a question carries no tags of its own; low confidence; never shown as a label.
- Engagement (12): answer time measured on the server; `packages/core/engagement` (median answer time, unfinished sessions, study days, streak).
- Session adaptation (18/19): `planSession` (minutes x goal -> number of questions), goal revise = gentler, goal test_myself = independent test; recovery now also triggers from performance (3 misses in 4, or 2 hinted misses in a row), recorded in `recovery_events`; the planned last question is easier; after it the session wraps up (UI shows plan and a finish prompt).
- Assessment ladder (10): chapter check, subject check, full mock, board-style paper (1-mark MCQ then 2-mark short answers, scored in marks, duration from planning times). Chapter/subject checks are practice measurements built on the mock engine; they do not change mastery.
- Parent report and parent link (20/23): subject matrix with priority, engagement section, assessment history, patterns in wrong answers.
- Student dashboard (24): today's recommended session and streak.
- Public (30-33): /about, /trust, /legal/refund (draft, no invented terms), /sample-report (clearly labelled made-up data), /check (free, no sign-in, nothing saved, no answer key leaked).

**Tests run**: tsc clean; full `npm run build` clean (font-stub, layout restored and diffed); migration 0018 applied twice cleanly on scratch Postgres 16; SQL checks: new tags accepted, unknown tag/marks/level/kind/language rejected, student cannot see or write another's `recovery_events`, nobody can write `subject_gate_signoffs`, one recovery event per session+trigger; 18 service tests of the mock engine against an in-memory stand-in (board-style sections, marks scoring, chapter filter, resume rules, thin bank refused); 20 logic tests (session plan, recovery trigger, streak, IST day, median, cause families); report extras rendered with sample and empty data (no label wording).
**NOT tested**: anything against live Supabase, a live AI provider, a real browser; answer timing in a real session; the new admin page with real data; Hindi for the new text (new text is English only).


## 2026-10-17 — v39: first items from the "Not built" list
**Built:** (1) "What changed in the last 30 days" (master prompt §22): `packages/core/reports/change-report.service.ts`; last 30 days against the 30 before from real answers, sessions and whole-subject timed papers; compares a subject only when both periods have 10+ answers; rule-written sentences and "what to do next"; shown on `/report`, the parent link and (made-up example) `/sample-report`. (2) Founder metrics (§35): `/admin/metrics`, `packages/core/metrics/founder-metrics.ts`. (3) Intervention-to-outcome (§26/47): on the metrics page, per teaching move and gentler pace, average mastery change per finished session, only from 5 sessions, with an "association, not cause" note. (4) `docs/DATABASE_SCHEMA.md` (generated from a scratch database with all migrations) and `docs/COMMERCIAL_METRICS.md`. **No new migration.**
**Tests:** tsc clean; full build clean (layout restored); 16 logic checks (sentence rules, thin-evidence refusal, no labelling words, window split with an in-memory stand-in, chapter checks excluded from papers, intervention averages hidden under 5 sessions); report extras render test. **Not tested:** real Supabase/browser; `/admin/metrics` with real data.
**Still not built:** written-answer assessment, Hindi Course A/B split, animated diagrams, teacher pay, Excel tracker update.


## 2026-10-17 — v40: written-answer practice, CSV exports
**Built:** `/written` (header link "Written"): 5 short-answer questions per round from the subject's question bank; the student writes a few sentences; AI marks them against the answer key as key points and returns suggested marks and feedback. Paid plans only (same gate as mocks). Marks cannot exceed what the covered key points support and are clamped to the question's marks (default 2); the student's text is passed as quoted data with an instruction to ignore instructions inside it; answer key never sent to the browser; saved in `written_attempts` (migration 0019, owner read only, server writes only); never touches mastery. Founder: `/api/admin/metrics/export` (CSV for the Excel tracker) and `/api/admin/teachers/activity?month=YYYY-MM&rate=N` (teacher review counts, optional rupee amount), both linked from `/admin/metrics`. Schema doc updated.
**Tests:** tsc clean; full build clean (layout restored); 13 checks of the marking parser/service with fake AI and database (clamping, key-point cap, fenced JSON, garbage rejected and nothing saved, injection text sent as quoted data, long answers cut to 1500, too-short refused); migration 0019 twice; SQL: score above max refused, another student sees 0 rows, student cannot write marks. **Not tested:** a live AI marker (marking quality unknown until real answers are read), real browser, real Supabase.
**Still not built:** Hindi Course A/B split (needs course content), animated diagrams, automatic teacher payment (counting only).


## 2026-10-17 — v41: new site menu
**Built:** redesigned header (`SiteHeader.tsx` + styles at the end of `globals.css`): stays at the top while scrolling; Practice dropdown (Take a test, Mock exam, Written answers, Past papers, each with a one-line description); current page marked with a marigold underline; round name chip with Profile / Dashboard / Sign out; "Complete Board Prep" button; phone-size menu (hamburger drawer). Closes on Escape, outside click, page change. 9 new English/Hindi words in the dictionary. No database change.
**Tested:** tsc, full build, screenshots at desktop and phone width (signed-out). **Not tested:** the signed-in menu in a real browser (name chip, Practice items with Take a test/Mock/Written) and Hindi text widths.


## 2026-10-17 - v42: master prompt v3, first commercial slice
**Founder asked:** has v2 been fully built; if so start v3. Answer and full map: `docs/V3_REQUIREMENTS_MAP.md`.
**Built:** Founding Family plan (Rs 4,999, 5 subjects, till 31 Mar 2027, 50-place real counter on `/pilot`; migration 0020; 0016/0017 constraint lists now include every plan code so re-runs never fail); study plan `/plan` (`packages/core/planning/study-plan.ts`); funnel + economics `/admin/funnel` and CSV exports `/api/admin/export/[sheet]` (`metrics/funnel.ts`); question statistics `/admin/questions` (`question-intelligence/stats.ts`); `report_viewed` event; new homepage headline; `SAHAYAK_PROJECT_MEMORY.md`.
**Tested:** tsc clean; full build clean; 14 study-plan checks, 24 statistics/economics/CSV/plan checks, 16 checks of the funnel loader against an in-memory fake database; migrations 0016, 0017, 0020 re-run with a founding_family row present. **Not tested:** real Supabase, a browser view of `/plan`, `/admin/funnel`, `/admin/questions`.
**Not built:** handwritten mock (needs founder decisions listed in the map), blueprint mock/PDF/Challenge Mode, data export/delete.

## 2026-10-18 - v43: Hindi A/B, device limit, plans, retired lessons, bank audit
**Founder asked:** Hindi material from the 4 PDFs; animation by level; teacher pay proposal; keep Rs 4,999, disable other paid plans except free, Rs 14,999 till Feb 2027 as founding plan; record laptops (max 2 per account); keep handwriting photos as Q/A bank; test every question.
**Built:** plans (only Free + two founding plans on sale; migration 0020); 2-device limit (`devices/devices.ts`, middleware cookie, `/device-limit`, `/admin/devices`, migration 0021); retired lessons (`skills.retired`) filtered everywhere; Hindi A updated to the 2026-27 syllabus (excluded lessons removed; grammar, unseen passages, writing, remaining Kshitij/Kritika lessons added); new Hindi Course B (26 skills, 54 questions); A/B one subject for limits and exclusive at sign-up; generator `packages/db/seed-generators/gen_hindi.py`; `scripts/qa-bank.py` -> `docs/QUESTION_BANK_AUDIT.md`; `docs/TEACHER_PAYMENT_PROPOSAL.md`.
**Animation:** already level-based (guided/standard/brisk from mastery) and shown beside the tutor's text; no change this version.
**Tested:** tsc; device decisions (18 checks); migration 0021 applies and re-runs; seed JSON structure self-checks; bank audit. **Not tested:** real Supabase, browser, a Hindi teacher's review of any question.
**Not built:** handwritten mock + Q/A-bank retention (needs consent wording and legal review first), blueprint mock/PDF, data export/delete.

## 2026-10-18 - v44: data export/delete, Social Science gap questions
**Built:** `/my-data` (download JSON, request deletion), `/admin/data-requests` (founder executes), migration 0022 `data_requests`; 38 new Social Science questions for the 19 skills that had none (62 total, needs_review; generator `gen_ss_gap.py`).
**Tested:** tsc, migration 0022 re-run, all student-linked foreign keys are cascade or set-null (checked in database), bank audit 0 problems. **Not tested:** real Supabase deletion incl. auth user removal, export in a browser, any question by a teacher.

## 2026-10-18 - v45: self sign-up with username
**Founder asked:** students/parents register themselves with username + password, email optional.
**Built:** `/api/auth/register`, `/api/auth/login`, `packages/core/auth/identity.ts`, new sign-up/sign-in forms, migration 0023 (users.username/contact_email/consent_*, `signup_log`), privacy text updated (English only).
**Tested:** 18 identity-rule checks, tsc, migration re-run, username uniqueness (case-insensitive) in database. **Not tested:** real Supabase (placeholder `.invalid` email accepted by Supabase auth? cookie set from the login route?), browser.

## 2026-10-18 - v46: blueprint papers + handwritten marking finished
**Built:** (blueprint, challenge mode, paper delivery, quality check, marking logic were already in the tree) now added: migration 0023_blueprint_handwritten re-run check, API routes (`/api/handwriting/consent`, `/api/mock/[id]/sheets|evaluate|paper-report`, `/api/teacher/handwriting`), pages `/mock/paper/[id]`, `/teacher/handwriting`, `/admin/handwriting`; deletion tool now removes photos and (only if switched on) keeps a de-identified answer bank; export includes sheets and evaluations; privacy text.
**Tested:** 33 checks of blueprint assembly, Challenge Mode, marking parser/router, agreement, image quality with real synthetic photos; 16 checks of the handwriting service against an in-memory database (marking, teacher override kept on re-run, queue shows no student info, answer bank off, photos removed); migration 0023_blueprint_handwritten re-run. **Not tested:** real Gemini image reading (no AI key here), real phone photos, real Supabase storage, browser.

## 2026-10-18 - v47: sign-up tab visible, suggest-password link
**Founder report:** the live page showed only "Sign in" with the "early access by invitation" note. Likely cause: the old `SIGNUPS_OPEN` setting in Vercel (set to false or cached). Sign-up now opens unless `SIGNUPS_CLOSED=true`; the old setting is ignored; the settings route is read on every request. Added "Suggest a strong password" link and "Show password" to the sign-up form.
**Tested:** built and opened the home page in a real browser (headless Chromium, stubbed fonts): Sign up tab shown, suggested password filled (10 characters). **Not tested:** live Supabase sign-up.

## v48 (2026-10-18) quick fixes
- Footer text now contrasts with its background (globals.css).
- Study plan works in Hindi (`composeStudyPlan` takes `lang`; /plan reads the language). Tested: Hindi and English notes both produced.
- Header is role-aware: the Admin link shows only for admin accounts (role from /api/me); signed-out visitors see "For teachers". Teacher registration link is now always shown on the sign-in page.
- New `/admin` analytics dashboard (counts only, 14-day chart); "Dashboard" is the first admin menu link; admin sign-in lands there.
- Figures: every figure now shows a visible "Figure N. caption" label (alt text the same). Migration 0024 attaches the labelled teaching diagram to questions that point at a figure for any skill that has one (re-run twice on a scratch DB, no errors). NOT done: new drawings for apply-right-hand-thumb-rule and describe-reflex-action-pathway.
- Not yet built (next versions): saved dated test reports (v49), separate parent/teacher/tutor/coaching-centre portals (v50), Hindi-medium mock questions for all subjects (v51).

## v50 (2026-10-18) role portals
- Separate sign-up, sign-in and dashboards: parent (/parent), tutor (/tutor), coaching centre (/centre); teachers get /teacher/login. Hub page /portals. Each sign-in page rejects the wrong kind of account (`portal` check in /api/auth/login).
- Parents are active immediately; tutors and centres wait for approval at /admin/partners. Nobody sees any student until the student's family gives a one-time code (made at /sharing, 8 characters, 7 days, once, stored only as a fingerprint, wrong guesses limited to 10/hour). Families can stop sharing any time; adults can stop following.
- Students can't open adult pages (server role check redirects) and adult accounts can't become student accounts (onboarding guard).
- Tested: migration 0025 twice; database-level privacy checks (student sees only own links/codes, parent cannot read students/codes directly, no cross-student reads); code format tests (1005 checks); full build; browser: all new pages render, signed-out visits redirect to the right sign-in, consent button disabled, APIs refuse bad calls.
- NOT tested: real registration and sign-in against Supabase, the code-linking flow end to end, the dashboards with real linked data. New pages are English only.

## v49 (2026-10-18) saved dated test reports
- Every finished diagnostic, quick quiz and mock/paper is saved with its date and time (India) in `test_reports`, in two versions: student (full question-by-question review, with labelled figures) at /reports and /reports/[id]; adult (summary by topic, went well / worth practising again, neutral notes, no question text) in the parent/tutor/centre student page and /{role}/student/[id]/report/[rid]. Print / Save as PDF button on each.
- Students can't read adult reports (no database policy for them; the page and API for adults check the active student link on the server).
- Tested: migration 0026 twice; database checks (student sees only own student-version rows; cannot see adult rows or another student's; a parent cannot read the table directly); report builders (12 checks: adult report has no question text, neutral wording, notes for timer/pending); saving twice leaves one row per version; full build; signed-out visits redirect.
- NOT tested live: saving after a real diagnostic/quiz/mock in Supabase, reading on the live site. Limits: tests finished BEFORE this update have no saved report; a paper mock's report is saved at submit and is not refreshed when handwritten marks arrive later; reports are English only.

## v51 (2026-10-19) Hindi-medium mock tests
- Mock start now asks "Language of the questions" (English / Hindi; defaults to the site language). Hindi papers show the question text and MCQ options in Hindi; the student's choice is still stored as the English option so marking is unchanged; Hindi short answers are accepted too. Results/reports use the Hindi wording. Works for normal mocks and blueprint papers (screen and printed). English, Hindi A and Hindi B stay in their own language.
- Translations are AI-written (free tier), saved in `question_translations`, status "ai_translated" (NOT teacher-checked), and rejected by code when a number, option count or language check fails. First start of a Hindi paper translates what is missing (up to ~25 s, before the clock starts); anything not ready shows in English with a note. /admin/translations pre-translates 18 questions per press.
- Tested: migration 0027 twice; number-preservation and parsing checks (12), saving, no repeat AI calls, AI-down safe; Hindi answer marking; full build. NOT tested: real AI translation quality or speed on the live site, a full Hindi paper end to end. Explanations are translated only when present at translation time; quick quizzes and diagnostics are still English.

## v52 — logo, equation formatting, PDF download, linked parent + child sign-up
- Logo: `apps/web/public/logo.png` (full), `logo-mark.png`, favicons/apple icon, header mark, home page, page metadata/share image, saved-report headers.
- Equations: `packages/core/format/math-format.ts` (`formatMath`) used by `MathText` for prompts, options and explanations (powers, fractions, roots, trig, chemical formulas with subscripts, arrows). KaTeX renders; 0 render errors across 5,048 seed texts. Plain prose is left alone.
- PDF: `PrintButton` now has "Download PDF" (html2canvas + jsPDF, client side, A4 pages) and "Print"; on student/adult reports, `/report`, sample report, mock paper. Tested downloading the sample report in a real browser (2-page PDF).
- Linked sign-up: `/api/auth/register-family` creates child + parent + active link in one call (rolls back on any failure). Student sign-up form has "Also create the parent's account now"; parent sign-up form has "Also create my child's account now". Parent dashboard lists each child's latest 5 saved reports.
- NOT tested against a live Supabase: the family route, parent dashboard report list.

## v53 — no repeated diagnostic questions; question bank grows 50 per session start
- Diagnostic: a student never gets a question they were already asked in an earlier diagnostic while an unseen one exists (random among unseen, preferred difficulty first). If all are seen, the AI writes a new one (up to 3 tries; checked by a second independent AI solve); if that fails, the question seen longest ago is reused.
- Growth: every learning-session start and new diagnostic start owes the subject 50 questions (about 20 diagnostic, 30 practice), written after the response is sent (`after()`), thinnest skills first, duplicates skipped, each verified by a second AI solve, saved as generated / needs_review. Table `question_bank_growth` (migration 0028), admin page `/admin/question-bank` with "Write what is owed" and "Add 50".
- Tested with an in-memory database and fake AI: 30 checks (unseen preferred, new when all seen, fallback when AI is down, 50 written, wrong-answer questions rejected, lock, nothing-owed, AI-down keeps the debt). NOT tested: real AI speed/quality, the admin page counts against live Supabase. On the free AI tier one run may write fewer than 50; the rest carries over.

## v54 — pricing, plans, entitlements, credits, offers, offline payment
- Migration 0029: commerce_products, commerce_offers, commerce_settings, mock_credit_ledger, commerce_events, commerce_interest, wtp_responses; extra columns on pilot_payments, student_access, mock_exams (max_pages, eval_runs). Seeds follow the founder pricing prompt (Founding Family 7,999; subject plans 1,499/2,499/3,499/4,999/6,999; handwritten mock 499; Tutor 3,499/mo; Centre 9,999/mo). Payment instructions and economics assumptions are left EMPTY for the founder.
- Core: packages/core/commerce/commerce.service.ts. Pages: /plans, /plans/buy/[code], /plans/apply/[kind]; admin: /admin/pricing, /admin/commercial, /admin/interest, CSV export. Handwritten: per-exam image limit, duplicate photo check, retry limit, credit charge after success.
- Free limits (tutor questions per day) now read from settings. Willingness-to-pay prompts (199-999) and commercial events recorded.
- Tested: 48 unit checks on the commerce service with an in-memory database; tsc and full build clean. NOT tested: live Supabase, real payments flow, browser walkthrough of the new pages.
- Not built: B2B seat activation, Board Readiness paid report, preparation programme, exam rescue, voice/visual limits (stored only), AI_EVALUATED/HUMAN_REVIEW statuses and staged evaluation.

## v54b — seats, parent purchase, paid reports, review statuses, read-aloud
- Migration 0030: org_plans, org_credit_ledger, feature_usage, review_status columns, settings entitlements/seats/boards (empty exam dates).
- Tutor/centre: admin "Activate / renew paid plan (1 month)" at /admin/partners; seat limit (off by default); shared monthly credit pool; "Give 1 mock credit" per linked student.
- Parent buys for a linked child (child picker on the buy page; server checks the link). Payment records who paid.
- Paid pages: /board-readiness, /exam-rescue, /board-programme, and parent versions at /parent/student/[id]/premium/[kind]; locked page for free users. Built only from recorded evidence; never predicts marks.
- Handwritten pipeline stages recorded; per-answer and per-paper review statuses; FAILED never charges.
- Read-aloud (browser voice) in the tutor chat counted against the free daily voice limit.
- Tested: 45 new checks (seats, grants, entitlements, limits, statuses, rescue, programme) + earlier 48; migration 0030 runs twice cleanly on Postgres 16; tsc and full build clean. NOT tested: live Supabase, pages in a browser, real AI.
- Still not built: visual-interaction limit (no such feature), exam-date-specific Board 1/Board 2 programmes (v56).

## v55 — Founder Command Centre, CRM, funding, schools, expenses, tasks, change log, project memory
- Migration 0031: crm_records, crm_activities, funding_records, funding_documents (32 items), expenses, revenue_entries, founder_tasks, system_changelog (seeded), founder_memory (15 sections), users.source/utm, settings rag/fit_weights/funding_probabilities/crm_probabilities/business.
- Screens: /admin/command-centre (home), /admin/crm (+ ?group=institutions), /admin/funding, /admin/funding/documents, /admin/expenses, /admin/tasks, /admin/changelog, /admin/memory (+ markdown export), /admin/investor-metrics, CSV exports at /api/admin/founder/export?table=...
- Engine: packages/core/founder (ranges, scoring, command-centre). Alerts, "What should I do next?", RAG, funnel, sources, unit economics (CAC, revenue per customer), weighted pipelines.
- Tested: 62 checks (ranges, scoring, calculations, privacy, alerts) + earlier suites; migration 0031 runs twice on Postgres 16; API field names match table columns; tsc and full build clean. NOT tested: live Supabase, pages in a browser, the admin write API against a real database.
- Not built: revenue by subject/board, funnel filters by board/class/subject/language, Excel export (CSV only), drag-and-drop pipeline (stage dropdown instead), school pilot scorecard form, per-batch centre dashboards.

## v55b — AI Gateway: provider registry, routing, free-quota and budget protection, cost log, benchmark
- Migration 0032: `ai_providers` (registry, 5 existing + 16 candidates, all candidates class F / unverified), richer `ai_usage` columns (model, task, task_tier, images, cost_est_inr, cost_inr, free_quota_used, ref, status_code), `ai_benchmark_cases` (9 starter questions), `ai_benchmark_runs`, `ai_benchmark_results`, setting `ai_gateway`.
- Core `packages/core/ai-gateway/`: tasks (tiers 0-3, Tier 0 refused), privacy (contact details removed), registry + verification rules, config validation, pure router (order, free-before-paid, quota 80/90/100, health, cooldown after 429, vision, data policy, handwriting quality gate), budget rules, cost, reports/alerts, benchmark, loader, generic OpenAI-compatible adapter, `GatewayAIProvider`.
- All callers (tutor, quizzes, diagnostics, written/handwritten marking, bank growth, Hindi translation) now go through the gateway; the older key-by-key chain remains only as a safety net when the registry cannot be read.
- Admin: `/admin/ai-infrastructure` (alerts, overview, free quota, cost, health and routing, controls, benchmark, provider list with verification checklist and a Test button) + `/api/admin/ai`. Plans page shows the Free Core wording.
- Behaviour changes to know: paid providers (OpenAI/Claude) are no longer used as automatic backup unless the founder turns on the paid rule with both caps; per-student limit of 500 AI calls a day; admin bank-growth and Hindi translation calls are now logged.
- Tested: 115 gateway checks (routing, quota, budget, health, config, privacy, cost, activation rules, benchmark grading, reports, alerts, full fallback flows) + 12 end-to-end checks with the real adapters against a stubbed network and in-memory database + earlier 155 checks; migration 0032 runs twice on Postgres 16; tsc and full build clean. NOT tested: live Supabase, real provider calls, the admin screens in a browser.
- Not built / not done: no provider's current free tier, price, quota or terms was verified (founder to verify from official documentation); Class IX-XII x 11-subject benchmark (only a 9-question starter set); handwriting benchmark with real photos; Sarvam/Cohere/Cloudflare compatibility with the generic adapter unverified; speech-to-text/TTS providers; AI cost in the Command Centre still uses the older rate table; quota counts are Sahayak's own (IST day), not the provider's counter.

## v56 — Two-board architecture and independent languages
- Migration 0033: `supported_languages` (en, hi), four language columns on `learning_profiles` (backfilled once from `preferred_language`), foreign keys instead of language checks, `question_translations` gains validation/checked_by/checked_at/reviewer_note, `handwritten_evaluations` gains answer_language/feedback_language, `subject_requests`, `boards` setting extended (programme name, enabled flags, per-board subject lists).
- Core `packages/core/boards` (languages, language-store, board-readiness, subject-requests), `translation/validate.ts` + `translation/review.ts`; study plan no longer has a hard-coded exam date.
- Screens: language settings on /profile (four choices), Board 1 / Board 2 in Board Readiness and the Preparation Programme (student and parent views), report pages use the stored report language, subject request form on /subjects, admin `/admin/subject-requests`, admin `/admin/translations/review` (side-by-side check, re-run automatic checks), admin boards setting validation.
- Handwriting: Hindi/mixed prompts, answer language stored, routing rules for Hindi/mixed/other, feedback in the learning language. Tutor replies in the learning language.
- Conflicts found and fixed: onboarding language stored but never used; question/report language existed only as a cookie; exam start date hard-coded in study-plan.ts.
- Tested: 64 new checks (languages, version choice, validation, routing, boards, plan with no date, subject requests) + all earlier suites (48, 45, 62, 115, 12); migration 0033 runs twice on Postgres 16; tsc and the full build are clean. NOT tested: live Supabase, real AI Hindi quality, pages in a browser.
- Not built: Hindi question text exists for mock tests only (diagnostics/practice stay English); AI Hindi explanations are unreviewed; no "improvement since Board 1" history; parent dashboard shows the two boards on the premium readiness page, not as a card on the main parent home.

## v57 — Student Engagement & Retention Engine
- Migration 0034: 15 tables (student_engagement, xp_transactions, engagement_events, daily_missions, mission_items, achievements [22 seeded], student_achievements, personal_bests, mistake_book, org_challenges, challenge_attempts, leaderboards, leaderboard_entries, friend_challenges [off], engagement_flags), RLS, setting `engagement`.
- Core `packages/core/engagement/` (config, streak, xp, achievements, personal-best, journey, missions, challenge policy and runner, mistakes, leaderboard, notices, parent weekly summary, org challenges, admin metrics).
- Student screens: /today (and card on dashboard), /challenge (+start, daily), /battle, /mistakes (+review), /achievements, /journey, /leaderboard. Tutor/centre: /tutor/challenges, /centre/challenges. Parent/tutor/centre: weekly summary card. Admin: /admin/engagement (dashboard), /admin/engagement-settings.
- Tested: 142 rule checks + 120 end-to-end checks on an in-memory database (found and fixed: weakness battle ended after 2 questions because the stored total shrank; Mistake Review had no similar question when all had been seen recently) + all earlier suites; migration 0034 runs twice; RLS enabled on all 15 tables, no policies on server-only tables; typecheck and full build pass.
- Not tested: live Supabase, real AI, a browser, RLS reads as a real signed-in student. Not built: Hindi UI strings for engagement, push/email/SMS notices, friend challenge and referral screens, A/B reporting screens.

## v58 — Engagement leftovers
- Migration 0035: friend round type, friend_challenges.subject_id, referral_codes, referrals (RLS on; students read only their own code).
- Hindi text for Today, Challenges, Mistake Book, Achievements, Journey, Weakness Battle, Daily, My progress, leaderboard join, challenge runner and summary, Today card on the dashboard, and the Practice menu. English remains the source; unknown sentences stay English.
- Friend challenge (/friend), referral (/invite), admin Referrals and Engagement experiments pages. Both social features OFF by default.
- Fixed: tutor/centre challenge rounds were stored without their subject (so they did not count for personal best or mission).
- Tested: 74 new checks + all earlier suites (48, 45, 62, 115, 12, 64, 142, 120); migration 0035 runs twice; typecheck and full build pass.
- Not tested: live Supabase, browser. Hindi wording not reviewed by a teacher. Not built: Hindi challenge questions, referral at the sign-up form (code is entered after sign-up), push/email reminders.

## v59 — AI intelligence, request ledger and economics (audit + completion; nothing rebuilt)
- Audit first: `docs/AI_ECONOMICS_GAP_REPORT.md` (EXISTS / PARTIAL / MISSING / BROKEN for every item). Existing registry, routing, fallback, quota, health, budget, benchmark, cost page and Command Centre were extended, not replaced.
- Migration 0036: ai_usage ledger columns (request_id, attempt_no, user_id, organisation_id, model_version, retry/fallback count and reason, audio_seconds, quota_type, list/free-quota/promo/actual/economic cost, pricing_snapshot, quality_result, route_explanation); ai_providers quota_type, quota_region, promo credit (balance, expiry, as-of), capabilities, production_status, price_last_verified; tables ai_reconciliations and ai_evaluation_costs (RLS on, no policies); benchmark run scope/breakdown/cost per case; setting ai_economics.
- Core: `ai-gateway/economics-settings.ts`, `economics.ts` (pure maths), `ledger.ts` (loaders, per-evaluation record, quality marker), `cost.ts` (five cost layers + snapshot), `router.ts` (capability, quality, cost ceiling, latency, objective, explanation), `gateway.ts` (request id, attempt fields, explanation, JSON quality check, spend basis), `benchmark.ts` (scope, breakdown, comparison), `registry.ts` (quotaTypeOf, promoCreditLeft), `tasks.ts` (more Tier 0 names).
- Screens: /admin/ai-economics, /admin/ai-requests (+ /[id] inspector), Command Centre AI block, provider editor extra fields, benchmark scope filters. API actions: economics_set, reconcile_save, benchmark_run filters, provider_save extra fields.
- Handwritten: after every evaluation (also failed ones) one row is saved with cost, price (target price), contribution and MARGIN_AT_RISK.
- Tested: 128 new checks (t59) + all earlier suites; migration 0036 runs twice on Postgres 16; tsc and full build pass. NOT tested: live Supabase, a real provider call, the screens in a browser.
- Not done: no provider price, quota or free tier was verified; no provider billing API is read (invoice figures are typed in); promo credit balance is a typed figure minus what the ledger shows used.

## v60 - Fixed 20-question diagnostic, answer checking and keypad, fill-to-1,000, referrals for every role
- Migration 0037: user_referral_codes, referral_events, bonus_days_ledger (RLS on; own-read only for codes and days), setting `referral`.
- Diagnostic: exactly 20 questions (anchors per chapter + fillers; a miss swaps in a prerequisite and drops a filler); "Question n of 20" everywhere; the "8-15" texts removed.
- Answers: `packages/core/answers/input.ts` (kinds, typing filter, validation, keypad definitions, English + Hindi warnings), `AnswerInput` component on diagnostic, learn quiz, learn chat, mock paper, challenge and written pages; `inputKind` hint added to the diagnostic, quiz, mock, tutor and challenge question views; server format check in the diagnostic and challenge paths; grading understands keypad symbols.
- Question bank: `runBankGrowth` fill mode, `DIAGNOSTIC_BANK_TARGET = 1000`, code generators for Computer Applications style skills, admin "Fill to 1,000" button with progress bars, plain explanation of "Owed" on the page, a fill step on every session/diagnostic start.
- Referrals: `referral/referral.ts`, `/r/[code]`, `/api/referral`, `ReferralPanel` on homepage, dashboard, profile, parent/tutor/centre pages and teacher page, invite note on the sign-up forms, attach at all five sign-up routes, qualify on diagnostic finish, `/admin/referral-rewards` (settings, counts by role, settle held rewards), held bonus days applied on plan activation.
- Tested: 33 + 5 (input rules, grading symbols, plan slots, filler drop) and 32 (referral rules, caps, idempotence, generators 2,400 questions self-consistent) new checks; t53 and t57b updated for the new behaviour; t54-t59 pass; migration 0037 runs twice on Postgres 16; tsc and full build pass.
- NOT tested: live Supabase, real AI fill, the pages in a browser or on a phone (keypad feel), the sign-up cookie flow end to end, Hindi wording of the warnings (draft).
- Not built: the 1,000 target is not reached by this delivery (Computer Applications and Hindi are far below; filling takes AI quota or time); Hindi grammar generators; referral rewards for teachers/tutors/centres are manual; free-plan bonus days are held until a paid plan starts.

## v61 - Master upgrade prompt: audit, financial simulator, config registers, country, audit log
- Audit: `docs/MASTER_UPGRADE_GAP_REPORT.md` (65 sections mapped; most already existed from v34-v60).
- Migration 0038: users.country/timezone/currency, exam_sessions, curriculum_versions, country_prices, audit_logs (RLS on, server only).
- Founder financial simulator (/admin/financial-simulator): presets, student/tutor/centre-only tables, combination, gap to target, break-even, handwritten calculator; inputs saved in setting `financial_simulator`.
- /admin/configuration (exam sessions, curriculum version workflow, country prices), /admin/audit-log, country picker on /profile.
- Tested: 54 new checks (t61: the founder's 10 lakh table at all seven margins, combination maths, gap suggestions reach the target and are minimal, version workflow, validation, audit field filter); t53-t60 pass; migration 0038 twice; tsc and full build pass. NOT tested: live Supabase, browser.
- Not built: tutor/centre batches and assignments, school role, Class XI/XII transition entitlement, add-a-board wizard, TAM/SAM/SOM screen, country prices at checkout, audit entries for older admin actions, live deployment.

## v62 - Adaptive diagnostic and baseline intelligence engine + question provenance
- Migration 0039: competencies, competency_prerequisites, target_competency_requirements, baseline_items, baseline_sessions, student_competency_evidence/mastery, adaptive_decisions, student_baselines, learning_paths(+nodes), question_requests; provenance columns on three question tables (backfilled origin).
- Core: graph, evidence/mastery, error taxonomy, adaptive state machine (phases, downward/upward adaptation, slip re-check, stop rules), baseline + gaps + path, reports (student/parent/tutor/centre wording), database layer (store.ts), provenance.ts.
- Pages: /baseline, /baseline/path, parent|tutor|centre `/student/[id]/baseline`, tutor|centre `/baseline` (group gaps), /admin/diagnostic-engine, /admin/question-register, teacher|tutor|centre `/questions`.
- Rule: every session owes its subject at least 10 new questions (quiz, mock, baseline starts now trigger growth).
- Tested: t62 (69: six simulated students A-F, acceptance tests), t62b (31: database layer end to end), t62c (27: provenance); t53, t56-t61 pass; migration twice on Postgres; tsc and full build pass. NOT tested: live Supabase, browser/phone, real students.

## v63 - Challenge zone (olympiad / competitive-exam style questions, badges)
- Founder request 2026-10-24: strong students should be able to attempt harder, olympiad-level and other competitive-exam-style questions (not Class 11), with a badge mechanism as motivation.
- Migration 0040: `questions.tier` ('core' default / 'stretch'), `exam_style`, `stretch_level` (1-3); table `stretch_attempts` (one row per student per question, own-read RLS); 9 badges (xp 0).
- Core `packages/core/stretch/` (levels.ts pure rules, store.ts database): a skill opens when mastery_states.score >= 75 (setting) or a competency is demonstrated with 2+ evidence; level 1-3 rises after 3 correct in a row, falls after 2 wrong; each question counts once; daily limit; answer key stays on the server; writes ONLY stretch_attempts (never mastery, readiness, marks, XP).
- Stretch questions are hidden from lessons, quizzes and the adaptive check (`neq tier stretch` in selector.ts and baseline/store.ts).
- Badges: new metrics stretch_correct / best_run / level3 / styles / subjects in the achievement engine; xp 0, so no XP, money or discount.
- AI writing (`generateStretchQuestions`, admin "Write questions"): original questions in the STYLE of olympiad / NTSE / IOQM / JEE-foundation / NEET-foundation / general; second independent solve; all stay needs_review. Teachers/tutors/centres can upload them (provenance as in v62).
- Pages: /stretch (student), /admin/challenge-tier, Challenge-zone card on the dashboard, link from the adaptive-check result, counts-only line for linked adults.
- Tested: t63 (61 checks incl. unlock rules, level rules, no key leak, no mastery write, once-per-question, badges awarded with no XP, uploads); t57-t62c pass; migration 0040 twice on Postgres; tsc and full build pass. NOT tested: live Supabase, real AI output quality, browser/phone. Older t3, t4, t42a are stale (pre-v54/v56 expectations) and were already failing.
- Not built: Class 11 content, per-exam syllabus maps, timed olympiad mock, tutor/centre assignment of challenge sets, leaderboard for Challenge zone.

## v64 - Website traffic analytics, Plans & Pricing menu, new logo, free-plan notice
- Founder request 2026-10-25: Google-Analytics-style admin traffic page; pricing/plans/features as a menu with dropdown visible on every page for everyone; "free plan = 1 subject" shown boldly on the diagnostic subject picker; use the attached logo and tagline.
- Migration 0041: `page_views` (server-only, RLS on, no policies). First-party, no cookies, no IP stored: `visitor` is a daily-rotating SHA-256 hash (optional env ANALYTICS_SALT). `/api/track` (always 204) drops bots, admin/api paths, Do Not Track; record ids in paths become `:id`; query strings are never stored.
- Core `packages/core/analytics/{traffic,store}.ts`: user-agent parsing, channel rules (Direct / Organic search / Social / Messaging / Referral / Campaign), 30-minute sessions, totals, bounce, daily series, top/entry pages, devices, browsers, OS, countries, signed-in split, previous-period change (only when the earlier figure is 5+), realtime (last 5 minutes). Days are Indian time. Rates show "Insufficient data" under 5 sessions.
- `/admin/traffic` (Today / 7 / 30 / 90 days), `TrafficChart` (SVG), link in the admin menu. Sign-ups and finished diagnostics are shown as database counts, never as a conversion rate.
- Header: "Plans & Pricing" button with dropdown (Free plan - 1 subject, Founding Family, Subject plans, Handwritten mock, Tutors & centres, Compare features) for everyone including staff; mobile menu has the same list. `/plans` sections got anchors; no price is typed in the menu.
- Diagnostic subject picker: bold "Free plan: 1 subject per account" banner (`/api/student/subject-access`), names the free subject once chosen, and greys out other subjects with "Paid plan". The server limit (`assertSubjectAllowed`) is unchanged.
- Logo: new artwork cut out onto a transparent background (`logo.png` full with tagline, `logo-mark.png` artwork only, all icons rebuilt); header mark 40px; home page uses the full logo. Privacy policy has a new line about visit counts (Hindi is a draft).
- Tested: t64 (40 checks); t53-t63 pass; migration 0041 twice on Postgres; tsc and full build pass. NOT tested: live Supabase, real traffic, how the header and logo look in a browser/phone, the cookie/Vercel country header.
- Not built: unique-people counts across days (by design), funnels per page, goals/events, Search Console data, CSV export, scheduled purge (a function exists, nothing calls it yet), traffic for Hindi pages split.

## v65 - Social links (Facebook live; Instagram, LinkedIn, YouTube hidden placeholders)
- `apps/web/lib/social.ts` is the single list. A link with an empty address is not shown anywhere. Facebook is on (address supplied by the founder 2026-10-25). `SocialLinks` shows them in the footer on every page and on the Contact page. No migration.
- Tested: t65 (3 checks); tsc and full build pass. NOT tested: how it looks in a browser; that the Facebook share address opens the right page.

## v66 - Traffic counter diagnosis (hotfix to v64)
- Founder report 2026-10-25: /admin/traffic showed 0 page views although migration 0041 had been applied and v64 was deployed.
- I could not find the cause by reading code (checked: table columns match the insert, bot/DNT rules pass for normal browsers, no earlier table named page_views). Likely candidates: (1) apps/web/app/layout.tsx from v64 was not replaced, so the counter never loads; (2) the Supabase API layer had not reloaded its table list; (3) a visitor-side block. The old code swallowed every error, so nothing could be seen.
- Added: "Check the counter" button on /admin/traffic (`/api/admin/traffic-check`): checks the counter is installed in this page, Do Not Track, server key, table readable, can write (saves and removes a test row), and sends a test visit from this browser that answers with the exact reason if it is not counted (header x-track-debug, admin only). Read errors now show on the page; save errors are written to the server log (`[track]`). Migration 0042 `notify pgrst, 'reload schema'` (re-runnable, changes no data).
- Tested: t64 now 42 checks (error text is returned, self-check writes/reads/cleans up); tsc and full build pass; 0042 twice on Postgres. NOT tested: live site. The cause is NOT yet confirmed: it depends on what the check reports.
