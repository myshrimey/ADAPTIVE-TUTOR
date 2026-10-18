# Build Log

One entry per work session. Newest entry on top.

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
