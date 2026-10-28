# SAHAYAK PROJECT MEMORY (single source of truth)

Read this first in every new Claude session. Update it after every major change. Never put passwords, keys, tokens or secrets in this file. Last updated: 2026-10-17 (v42).
Companion files: `CLAUDE.md` (working rules), `docs/RESUME_HERE.md` (exact next steps), `docs/BUILD_LOG.md` (history), `docs/DECISIONS.md`, `docs/DATABASE_SCHEMA.md` (generated table and policy list), `docs/V3_REQUIREMENTS_MAP.md` (v3 prompt vs code), `docs/COMMERCIAL_METRICS.md`, `docs/LAUNCH_CHECKLIST.md`.

## 1. Purpose and commercial model
Sahayak helps parents of CBSE Class X (2027) students see where their child stands, what holds them back, what to do next and whether it is working. Tutor is one part. Loop: assess, learn, practise, reassess, board readiness, parent intelligence.
Founder: Dr. Arvind Tiwari, Founder & Product Builder. Not a programmer: give plain, numbered, non-technical instructions.
Money: free tiers only (Vercel, Supabase, GitHub, free AI tiers). Offline UPI/QR payment; the founder activates accounts by hand. No payment gateway until validated.
Plans (all in `packages/core/plans/plans.ts`): Free (1 subject); Rs 1000 per subject per month; Rs 3300 per month for 5 subjects (till Feb 2027); Rs 15000 once for 5 subjects (till Mar 2027); Founding Family Programme Rs 4999 once, 5 subjects, till 31 Mar 2027, cap 50 places (test price). Prices are proposals to confirm.
Targets: 10, then 25, 50, 100 paying families; long-term gross margin 85%+ (revenue minus AI cost minus teacher cost, over revenue). Moat is a long-term strategy, not a current claim.

## 2. Architecture
- Monorepo: `apps/web` (Next.js App Router on Vercel), `packages/core` (business logic, single barrel `index.ts`; no Node-only imports because client components use it), `packages/db` (`schema.sql`, numbered `migrations/`, seed scripts).
- Supabase: Postgres + Auth + RLS. `createServerClient` (user session, RLS applies) for student reads/writes; `createServiceClient` (service role) only for server-derived writes and founder pages. Founder pages/routes gated by `ADMIN_EMAILS`.
- Sign-up closed: the founder creates students (`/admin/students`); teachers register as pending.
- AI: Gemini then Groq, free-tier first. Every call goes through `aiForStudent()` and is logged to `ai_usage` (counts, never text). Free plan uses free-tier models only.
- Migrations re-run on every `npm run db:migrate`: guarded backfills, drop policy before create, `add column if not exists`. Currently through 0020.

## 3. Database (see `docs/DATABASE_SCHEMA.md` for every column and policy)
Content: subjects, curricula, chapters, topics, skills, prerequisites, questions, diagnostic_tests, diagnostic_questions, previous_papers. Student: users, students, learning_profiles, student_profile_details, student_academic_history, learning_goals, student_access (plan, subject limit, end date). Evidence: diagnostic_attempts, diagnostic_answers, learning_sessions, question_attempts, mastery_states, misconceptions, messages, session_checkins, recovery_events, mock_exams, written_attempts, learning_events. Business: pilot_payments, feedback, ai_usage, teacher_profiles, content_reviews, subject_gate_signoffs.
Rule: students read their own rows through RLS owner policy; server-written tables (written_attempts, recovery_events, student_access) have no student write policy.

## 4. Routes
Public: `/`, `/pilot` (offer + plans + payment claim), `/check` (free readiness check), `/sample-report`, `/about`, `/trust`, `/contact`, legal pages, `/parent/[token]`.
Student: `/dashboard`, `/onboarding`, `/profile`, `/subjects`, `/diagnostic`, `/learn`, `/progress`, `/report`, `/plan` (v42), `/mock`, `/written`, `/papers`.
Teacher: `/teacher`, `/teacher/register`.
Founder: `/admin/students`, `/admin/payments`, `/admin/teachers`, `/admin/reviews`, `/admin/quality`, `/admin/metrics`, `/admin/funnel` (v42), `/admin/questions` (v42), `/admin/ai-costs`, `/admin/feedback`; CSV: `/api/admin/export/[sheet]` (funnel, students, sales, product, economics), `/api/admin/metrics/export`, `/api/admin/teachers/activity`.

## 5. Key logic (packages/core)
`diagnostic`, `learner-model`, `mastery`, `misconceptions` (taxonomy, likely causes), `pedagogy` (session plan, recovery), `orchestrator` (tutor sessions), `checkins`, `engagement`, `readiness` (bands), `reports` (parent report, 30-day change), `mock`, `written` (AI-suggested marks), `planning` (study plan), `question-intelligence` (observed difficulty), `metrics` (founder metrics, funnel, economics, CSV), `quality` (ten gates), `plans`, `access`, `ai-provider`, `i18n` (English + Hindi dictionary), `branding/founder.ts`.

## 6. AI integrations
Tutor replies (`prompts/tutor.prompt.ts`), explanations, answer evaluation, written-answer marking (`written/written-answer.service.ts`; student text is quoted data; marks capped by key points covered). No prompt or answer text is stored in `ai_usage`.

## 7. Environment variable NAMES (values live only in Vercel and your own `.env`; never commit)
NEXT_PUBLIC_SUPABASE_URL (public), NEXT_PUBLIC_SUPABASE_ANON_KEY (public), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (secret), DATABASE_URL (secret, used only to run migrations), GEMINI_API_KEY (secret), GROQ_API_KEY (secret), ADMIN_EMAILS (founder emails), SIGNUPS_OPEN, AI_FREE_PROVIDERS, BOLT_FRONTEND_ORIGIN.

## 8. Feature status (2026-10-17)
Built: diagnostic and learning persistence, check-in and confidence trend, parent report with evidence and "insufficient evidence", readiness bands, staged assessments and typed mocks, typed written-answer practice (paid), plans and offline payments, teacher review, quality gates, public readiness check, founder metrics, 30-day change report, study plan, funnel and economics, question statistics, Founding Family plan, new menu, new homepage headline.
Not built: handwritten mock with photo upload and OCR/vision marking and teacher review queue; formal CBSE blueprint mock and PDF paper; Challenge Mode; student data export/delete; Hindi Course A/B; animated diagrams; automatic teacher pay; marketing content (not code).
Subject status: Maths Standard and Science ready/pilot per `subjects.status`; no subject has passed all ten gates yet.

## 9. Known limits and open items
Never exercised with real Supabase, a live AI provider, a real browser or two real accounts in the build environment; founder reports v34-v37 deployed and working. Written-answer marking quality unchecked. Refund terms are a draft. Board exam start in the study plan (`BOARD_EXAM_START` = 2027-02-17) is a planning assumption until CBSE publishes the date sheet. Funnel cannot see website visits, content reach or referrals. Founder to confirm: prices and GST, refund periods, About/Trust wording, Supabase sign-up OFF, AI_FREE_PROVIDERS, two-account privacy test (including recovery_events and written_attempts), teacher review of pilot questions, gate sign-offs.

## 10. Deployment and testing
Each delta zip has `INSTRUCTIONS.txt`. Typical: copy files over the project, `npm install`, `npm run db:migrate`, `npm run build`, push to GitHub (Vercel deploys). Before calling work done: `npx tsc --noEmit -p apps/web/tsconfig.json` clean, full `npm run build` clean (font workaround in `CLAUDE.md`), plain-words description of what was tested and what was not.

## v54 pricing decisions (2026-10)
Founding Family 7,999 (5 subjects); individual/1-subject 1,499; subject plans 1,499/2,499/3,499/4,999/6,999; handwritten mock 499 list (399 offer allowed); Tutor 3,499/mo (20 students); Centre 9,999/mo (50). All editable at /admin/pricing. Supersedes the older 4,999/14,999 constants. Free plan stays. Founder to supply UPI/QR text and economics assumptions; handwritten credit charging is OFF until the founder enables it.

## v54b (2026-10-20)
Tutor/centre seats + shared credit pool (founder activates after checking payment; seats enforcement OFF by default). Parents can buy for linked children. Board Readiness / Exam Rescue / Preparation Programme pages exist and need a paid plan (founder can open them via setting entitlements.enforce=false). Handwritten review statuses added. Exam dates remain empty until the founder enters them.

## v55 (2026-10-21)
Founder Command Centre is the admin home. CRM, funding/investor CRM, schools, expenses, tasks, change log, project memory with export. All founder-entered; nothing invented. Funding probabilities and thresholds are assumptions the founder edits.

## v55b (2026-10-21)
AI Gateway built before v56. All AI calls go through one gateway: provider registry in the database (5 existing + 16 unverified candidates, class F), routing (primary -> fallback -> rest, free before paid, unreliable providers to the back), free-quota tracking with 80/90/100% handling, spend limits, per-student call limit, cost log per call (model, task, tokens, images, list price, billed, free-quota flag), contact-detail removal, benchmark starter set, admin page /admin/ai-infrastructure. Free-only mode is ON; paid providers are never used unless the founder turns the paid rule on with both daily and monthly caps. NOTHING about any provider's current free tier/price/terms was verified: the founder must check official documentation before switching any new provider on. Tests: 115 + 12 new; migration 0032 twice on Postgres 16; not tested live.

## v56 (2026-10-21)
Two-board architecture (BOARD_EXAM_1/2, dates empty until the founder enters them in /admin/pricing > boards) and four independent languages (app, question, learning, report). Hindi translations get automatic checks and a teacher review page. Hindi/mixed handwriting is stricter. Subject requests are collected. Not built: Hindi for diagnostics/practice, improvement-since-Board-1 history. Next: v57 Student Engagement & Retention Engine.

## v57 (2026-10-22)
Engagement engine: daily mission, Sahayak XP (admin-configurable, anti-farming), personal bests, 22 achievements, streaks with friendly wording, Mistake Book, Weakness Battle, Comeback, Daily Challenge, Boss, Study Journey, optional nickname leaderboard, tutor/centre challenges, parent weekly summary, admin engagement dashboard. Founder to review XP values at /admin/engagement-settings. Friend challenge and referral not built.

## v58 (2026-10-22)
Hindi engagement screens, friend challenge, referral loop (no automatic rewards), A/B result screens. Social features OFF until switched on in /admin/engagement-settings.

## v59 (2026-10-22)
AI intelligence and economics audit + completion. Request-level ledger (request id links attempts; exact model/version; quota type; cost layers; pricing snapshot; quality result; admin-only routing explanation), routing by capability / quality / cost ceiling / latency with an optional lowest-cost objective, economics dashboard with projections (100 to 100,000 students), feature economics, per-evaluation contribution and MARGIN_AT_RISK (target price Rs 499, margin threshold 85% editable), 80/90/100% cost protection for every limit, benchmark scope and comparison, model switch simulator, Command Centre AI block. Nothing about any provider's current price, free quota or terms is verified; founder must check official documentation. Apply order: ...v57, v58, v59 (migration 0036).

## v60 (2026-10-23)
Diagnostics are now a fixed 20 questions. Every answer box (diagnostic, quiz, practice chat, mock, challenge, written) blocks the wrong kind of characters, warns, and has a symbol keypad for maths and science. Admin "Fill to 1,000" writes diagnostic questions to reach 1,000 per subject (code-written where answers can be computed, otherwise AI plus a second check; all need review); "Owed" explained on the page. Referral links for students, parents, teachers, tutors and centres on homepage, sign-up, dashboard, profile and portals; reward = bonus access days to both when the friend finishes a real first diagnostic (founder chose automatic; OFF until he sets the days at /admin/referral-rewards). Apply order: ...v58, v59, v60 (migration 0037). Open: founder decides the number of days; free-plan days wait for a paid plan; 1,000 target depends on AI quota.

## v61 (2026-10-24)
Master upgrade prompt audited (docs/MASTER_UPGRADE_GAP_REPORT.md): most items already built. Added: Founder financial simulator (planning scenarios only), exam sessions, curriculum version register with approval steps, country prices (not used at checkout), audit log, student country/timezone/currency. Not built: tutor/centre batches and assignments, school role, Class XI/XII transition, TAM/SAM/SOM, international checkout. Apply order ...v59, v60, v61 (migration 0038).

## v62 (2026-10-24)
Adaptive diagnostic and baseline engine (no fixed length; prerequisite graph; per-domain baseline; learning path; reports for student/parent/tutor/centre), question provenance register (who uploaded/reviewed/asked), min 10 new questions owed per session per subject. Maths only has a Class 6-9 foundation graph. Not built: /learn driven by the path, auto re-check, student_misconceptions, other-subject foundation graphs. Apply order ...v60, v61, v62 (migration 0039).

## v63 (2026-10-25)
Challenge zone: harder olympiad / NTSE / IOQM / JEE-foundation / NEET-foundation-style questions (original, never copies of real papers) for topics the student has mastered (score >= 75 or demonstrated competency), 3 levels, once per question, daily limit, badges with no XP/money. Never writes mastery, readiness or marks. Questions are tier 'stretch' on the questions table and hidden from normal quizzes and the baseline. Admin: /admin/challenge-tier. Apply order ...v62, v63 (migration 0040). Not built: Class 11 content, per-exam syllabus maps, timed olympiad mock.

## v64 (2026-10-25)
Website traffic analytics at /admin/traffic (first-party, no cookies, no IP stored, bots/DNT/admin pages excluded; visitors are unique per day and summed). Plans & Pricing dropdown in the header for everyone. New logo and tagline "Measure Your Growth, Master Your Subjects." Diagnostic subject picker shows "Free plan: 1 subject per account" in bold. Apply order ...v63, v64 (migration 0041).

## v65 (2026-10-25)
Social links list in apps/web/lib/social.ts (Facebook on; Instagram, LinkedIn, YouTube hidden until the founder shares the addresses). Shown in the footer on every page and on /contact.

## v66 (2026-10-25)
Traffic page showed 0 after v64; added a Check-the-counter diagnostic and migration 0042 (schema cache reload). Cause unconfirmed until the founder reports the check result.

## v67 (2026-10-26)
Admin menu grouped into 8 categories (apps/web/lib/admin-menu.ts is the single list: add a page there). Feedback Intelligence at /admin/feedback-intelligence (rules, no AI; human decides; high-risk needs note + tested tick; migration 0043). /admin/roadmap lists what the big prompt asks that is built / partial / not built.

## v68 (2026-10-26)
Spaced revision: /review (Revise today), rules in packages/core/revision, table review_schedule (0044), built from student_competency_evidence. No AI.

## v69 (2026-10-27)
Tutor/centre: /tutor/attention and /centre/attention (who needs attention, batches, interventions), rules in packages/core/attention, migration 0045. Advisory; only students linked by their own code; no AI.

## v70 (2026-10-27)
Fading support: pedagogy/scaffold.ts picks 1 of 5 support levels per turn and tells the tutor (prompt line "Support:"). Optional mixed practice on /review. No migration, no new AI call.

- v72 (2026-10-27): Social Media Growth Engine at /admin/social-growth, migration 0046, manual publishing only (no platform connected), AI via gateway feature social_content.

- v73 (2026-10-28): Feedback Intelligence extras, migration 0047; priority formula visible; AI analysis optional, recommendation only.

- v75 (2026-10-28): report-question link also on Learn and Diagnostic; admin Feedback Intelligence shows 'Questions people reported' (counts per question id). No migration.
