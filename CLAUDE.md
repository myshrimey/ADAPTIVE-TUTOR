# Instructions for future Claude sessions working on Sahayak

Read these in order at the start of every session, before touching code:
0. `SAHAYAK_PROJECT_MEMORY.md` (single source of truth; update it after every major change; never put secrets in it)
1. This file (`CLAUDE.md`)
2. `PROJECT_CONTEXT.md`
3. `docs/DECISIONS.md`
4. The latest entries in `docs/BUILD_LOG.md`
5. `docs/RESUME_HERE.md`
6. Then check `git status` / git log and read the actual current code — don't assume this doc is perfectly in sync with it.

Confirm the next task with the founder before making any risky change (schema change, RLS change, anything touching payments or auth).

## Architecture and conventions
- Monorepo: `apps/web` (Next.js App Router) + `packages/core` (business logic, one export barrel at `packages/core/index.ts`) + `packages/db` (`schema.sql`, `migrations/`, seed scripts).
- Migrations live in `packages/db/migrations/*.sql`, numbered in order (currently through `0023`, where TWO files share the number (`0023_blueprint_handwritten.sql` and `0023_self_signup.sql`); both are re-runnable, keep both; every file re-runs on each `npm run db:migrate`, so one-time backfills must be guarded — see 0013's `do $$` blocks), applied with `npm run db:migrate`. Every `create policy` must be preceded by a matching `drop policy if exists` — Postgres has no `create policy if not exists`, and this repo's migrations must stay safely re-runnable.
- RLS ownership pattern used everywhere a table belongs to a student: `student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid())`.
- `createServerClient()` (in `apps/web/lib/supabase-server.ts`) is RLS-bound to the caller's session — use this for anything the student themselves reads/writes. `createServiceClient()` uses the service-role key and bypasses RLS — use ONLY for server-derived writes a client should never make directly, and never with a client-supplied ID that hasn't been re-derived from the authenticated session.
- AI calls go through the AI Gateway (v55b, `packages/core/ai-gateway/`, entry `createAIProvider({ service })` / `aiForStudent`). Providers live in the database (`ai_providers`), not in code. Don't add provider-specific code: add a registry row + a server environment variable (generic `openai_compatible` adapter).

## Product rules from the master prompt (founder-approved, 2026-10-15)
- Context affects the intervention; evidence determines the academic assessment. Mood/focus/confidence are stored in `session_checkins` and never written into `mastery_states`.
- Never label a child ("lazy", "weak", "careless", "anxious"). Use neutral, supportive wording. Never diagnose.
- Never promise marks, rank or a predicted board score. "Insufficient evidence" is an allowed answer.
- A subject is only `ready` after the quality gates in `docs/CONTENT_STATUS.md`. AI-generated content is `needs_review` until a person checks it.
- Subject availability comes from `subjects.status`, not hardcoded slug lists.

## Access, plans and roles (v36)
- Sign-up (v45, founder-approved 2026-10-18): families self-register with username + password (email optional) at `/api/auth/register` on the FREE plan; login at `/api/auth/login` (username or email). Supabase's own "Allow new users to sign up" stays OFF; accounts are made only by the server routes, with per-address and daily limits, a bot trap field and a required parent/guardian consent (`users.consent_at`). `SIGNUPS_CLOSED=true` closes it (the older `SIGNUPS_OPEN` setting is ignored). Paid plans are still set only by the founder (`/admin/students`). Teachers self-register as PENDING; the founder creates admin accounts. Never relax a role/plan check without the founder saying so.
- A student needs an active `student_access` row to start learning (`assertAccess`); subject count is limited by `subject_limit` (`assertSubjectAllowed`). Payment confirmation alone never grants access; since v54 an admin clicking "Verify payment and activate" on /admin/payments does (verifyAndActivate: idempotent, sets plan, subject limit, end date, credits). The older "Only record as paid" button still grants nothing.
- Teacher feedback (`content_reviews`) never changes `content_status`; only the founder does, at `/admin/reviews`.
- AI calls: the app code must get its provider from `aiForStudent()` (apps/web/lib/ai.ts) so the call is logged to `ai_usage` and the free plan stays on free-tier models; never store prompt or answer text in `ai_usage`. Prices live only in `packages/core/plans/plans.ts`.
- Never log or store a password the founder sets/generates; it is returned once to the admin UI only.

## Assessment, signals and quality gates (v38)
- Never invent question marks or cognitive levels; leave them NULL until a person sets them. Board-style papers use stated defaults.
- Chapter/subject checks and mocks never write to `mastery_states`.
- A subject becomes `ready` only through `/admin/quality` with all ten gates signed off by the founder.
- Engagement and likely-cause patterns describe what happened in answers, never the child; keep the neutral wording in `LIKELY_CAUSE_WORDING`.
- `/api/public/check` must never return answer keys or explanations.
- The 30-day report compares only with enough evidence and uses rule-written sentences; never add AI-written causes or predictions. `/admin/metrics` shows counts only.
- Regenerate `docs/DATABASE_SCHEMA.md` after every migration.
- Written-answer marks (`written_attempts`) are AI-suggested practice marks: server-written only, never fed into mastery/readiness without the founder deciding, and student text is passed to the marker as quoted data only.

## Plans, study plan, funnel (v42)
- A new plan code must be added in three places: `plans.ts`, the `student_access_plan_code_check` list in 0016, 0017 and the newest migration (all re-run), and the admin form. Founding Family: change price, cap or on/off only in `plans.ts`.
- Funnel/economics show counts the database holds; never estimate visits, referrals or margin. Gross margin is blank when there is no revenue.
- The study plan is rule-based from recorded evidence only; exam dates come ONLY from setting `boards` (v56 removed the hard-coded date; with no date the plan covers the next 12 weeks and says so).

## Files not to change casually
- `packages/db/migrations/0002_rls_policies.sql` and any RLS policy — a mistake here can expose one student's data to another. Read `docs/DECISIONS.md` and the security section of `PROJECT_CONTEXT.md` first.
- `apps/web/lib/supabase-server.ts` — the service-role/session-client distinction is the main safety boundary in this app.
- Anything under `packages/db/seed*` / `packages/db/seed/` — real question-bank content, not scratch data.

## Testing requirements
Before calling any change "done":
- `npx tsc --noEmit -p apps/web/tsconfig.json` must be clean.
- A full `npm run build` must succeed. The sandbox used to build this may block `fonts.googleapis.com` — if so, temporarily swap `apps/web/app/layout.tsx`'s `next/font/google` import for inline mock font objects, build, then restore the original file and confirm `git diff --stat apps/web/app/layout.tsx` is empty before finishing.
- For anything touching a money, auth, or RLS code path, describe in plain words what you verified and how — "I read the code and it looks right" is not a test result.

## Security rules
- Never put a service-role or other secret key in anything that reaches the browser, a migration committed to git, or these docs.
- Never weaken an RLS policy just to make a write succeed — fix the actual cause.
- Never let an unauthenticated user or an ordinary signed-in user mark their own payment as "confirmed." Only a founder-controlled, authenticated admin path may do that (reuse the existing `ADMIN_EMAILS` pattern from `/admin/feedback`).
- Never invent a UPI ID, QR code, merchant name, or bank detail. The founder provides and confirms these separately, outside of any file committed here.
- Never claim a deployment is complete, or a bug is fixed, without a stated test and its actual result.

## How to resume work
Read `docs/RESUME_HERE.md` — it always holds the exact next three tasks, current blockers, and what the founder needs to do. Update it (and `docs/BUILD_LOG.md`) before ending any session or hitting a usage limit.

## Devices, retired lessons, Hindi A/B (v43)
- Max 2 devices per account (`account_devices`, cookie `sahayak_did`); admins exempt; fail-open on errors. A website cannot read a machine's hardware/MAC address, so the record is cookie + IP + browser label only. Do not claim otherwise.
- `skills.retired = true` lessons (CBSE-removed for 2026-27) stay in the DB but must be filtered out of teaching, diagnostics, reports and plans.
- Hindi Course A (`hindi`) and B (`hindi-b`) are one subject for plan limits (`subjectFamily`) and mutually exclusive at sign-up. Seeds are generated by `packages/db/seed-generators/gen_hindi.py`; edit the script, not the JSON.
- Run `python3 scripts/qa-bank.py` after changing any seed; it writes `docs/QUESTION_BANK_AUDIT.md`.

## Data export / delete (v44)
- `/my-data`: families download their data (`/api/student/export`, session client only) or request deletion (`data_requests`, server-written with ids from the session). Only the founder executes deletion at `/admin/data-requests` (students cascade; feedback and learning_events are removed explicitly). Admin and teacher accounts are never deleted by that route. Payment records are deleted with the student: the founder must agree any retention rule with an accountant/lawyer and list it in the privacy policy.

## Blueprint papers and handwritten answers (v46-v47)
- Blueprint section layouts are PLANNING blueprints, not official; papers are labelled partial when the bank lacks 3/4/5-mark questions (marks are set only by a person). Challenge Mode only changes selection and time; never claim it is harder than the board paper. Printing uses the browser's print/Save-as-PDF (so Devanagari and maths render); no server PDF.
- Handwritten photos: private bucket `answer-sheets`, consent per student with a version (`HANDWRITING_CONSENT_VERSION`, still a DRAFT until a lawyer approves), image quality check on the server, AI marks are suggestions; uncertain, high-value and a 10% sample go to a teacher (no student name shown). Marks never feed mastery or readiness. AI-vs-teacher agreement at `/admin/handwriting`; do not call the AI marking reliable before about 100 teacher-checked answers per subject.
- `ANSWER_BANK_ENABLED` (packages/core/handwriting/config.ts) is OFF. Turn it on only after a lawyer approves the consent wording; when off, deleting an account deletes the photos and written answers.

## Figures and header (v48)
- Every question figure must render through `QuestionFigure` so it always shows a visible "Figure N. caption". The Admin link in the header shows only when `/api/me` says role = admin; never show it from client-side guesses. Migration `0024_figures_for_all_mapped_skills.sql` is re-runnable.

## Portals (v50)
- Roles: student, parent, tutor, centre, teacher, admin. Parent/tutor/centre accounts are made at `/api/portal/register` (tutor/centre `pending` until approved at `/admin/partners`). An adult sees a student ONLY through an ACTIVE `student_links` row created by a one-time code the student made at `/sharing`; every adult page checks `isLinked` on the server. Never add an RLS policy that lets adults read student tables. Student-facing pages must never show adult-facing reports or notes. Migration 0025 is re-runnable (migrations now go through `0025`).

## Saved test reports (v49)
- `test_reports` holds a STUDENT version and an ADULT version of every finished diagnostic/quiz/mock (saved by `apps/web/lib/reports.ts` from the submit routes; saving never blocks the test). The adult version has no RLS policy and must never be shown on a student-facing page or returned by a student API. Migrations now go through `0026`.

## Hindi medium (v51)
- Hindi question text lives in `question_translations` (AI-written, unreviewed until a teacher checks). Never alter English questions to add Hindi. Marking uses the English key; the Hindi short answer is an extra accepted answer. Keep the number-preservation check. Migrations now go through `0027`.

## Logo, equations, PDF, family sign-up (v52)
- Use `MathText` for every question prompt, option and explanation (never print raw maths text). Logo files are in `apps/web/public/`. PDF download is client-side (`lib/download-pdf.ts`). `/api/auth/register-family` makes a child and parent together, already linked; the student can still revoke at `/sharing`.

## Question growth and diagnostics (v53)
- Diagnostics never repeat a question for the same student while an unseen one exists (`engine.ts` seen-set). Generated questions need the second-solve check (`verifyGeneratedQuestion`) and stay `needs_review`. Growth is owed per session start (`question_bank_growth`, 0028); it is best-effort on free-tier AI. Migrations now go through `0028`.

- v54 commerce: prices, offers, limits, credits live in DB (`commerce_products`, `commerce_offers`, `commerce_settings`, `mock_credit_ledger`; migration `0029`), edited at /admin/pricing, never hard-coded. Price is always recomputed server-side (`quotePrice`). ₹499 handwritten mock is the list price (offer 399 allowed, never lower the list). Handwritten credits are charged only after success, once per exam (ledger ref `eval:<examId>`), and only when flag `handwritten.credits_required` is on (default OFF). Every price card shows "Terms & Conditions Apply.". Migrations now go through `0029`. Old `plans.ts` / `PlanCards` / `PilotPaymentForm` are unused leftovers.
- v54b: tutor/centre plans (`org_plans`, `org_credit_ledger`, migration `0030`) are switched on only by the founder at /admin/partners; seat limits apply only when setting `seats.enforce` is true (default false). Paid reports (Board Readiness, Exam Rescue, Preparation Programme) are gated by `hasFeature` using setting `entitlements` (founder-editable). Parents buy only for children with an ACTIVE `student_links` row (checked server-side in /api/commerce/purchase). Handwritten review statuses: AI_EVALUATED / HUMAN_REVIEW_REQUIRED / HUMAN_REVIEWED / FAILED / REPROCESSING (`review-status.ts`); a failed run never charges a credit. Exam dates live in setting `boards` and are EMPTY until the founder enters them; never hard-code them. Migrations now go through `0030`.
- v55 Founder Command Centre (admin only, migration `0031`): `/admin` now redirects to `/admin/command-centre`; the older dashboard is `/admin/overview`. Every number carries ACTUAL / ESTIMATED / ASSUMED / "Insufficient data"; never fill in a missing figure. Funding/investor facts are entered by the founder only: unknown stays NULL and shows "UNKNOWN — VERIFY"; each record needs source, verified date, confidence; never invent investor data, cheque sizes or eligibility; investment documents always say LEGAL/CA/CS ADVICE REQUIRED. No child-level data in CRM, investor metrics or exports. Fit scores and stage probabilities are the founder's own assumptions (settings `fit_weights`, `funding_probabilities`, `crm_probabilities`, `rag`). First-touch source is stored on `users.source` from cookie `sahayak_src`. Migrations now go through `0031`.

- v55b AI Gateway (migration `0032`, admin `/admin/ai-infrastructure`): every AI call goes through `GatewayAIProvider` (task tier -> route -> budget -> quota -> health -> adapter -> cost log). Never call a provider directly from a page, component or route; never put a key in the database or browser (a registry row holds only the NAME of a server env variable). Tier 0 work (marks, %, XP, streak, leaderboard, badge, attendance, progress, counts, ranking) must never call AI: `assertAiAllowed` refuses it. Defaults are SAFE: `free_only_mode` true, paid providers need `allow_paid_fallback` + BOTH daily and monthly caps; a free provider never silently becomes paid. New providers start as candidate / class F and can be switched on only after all 9 verification checks, a verified date and the official documentation URL are entered (the five pre-existing providers are exempt but show NOT VERIFIED). Nothing about any provider's free tier, price, quota or data policy was verified by Claude: those fields are blank / "UNKNOWN - VERIFY" until the founder checks CURRENT official documentation. UI wording about free AI is only `FREE_CORE_NOTICE`; never claim unlimited or forever-free. Contact details are stripped from text before it leaves (`minimiseText`). `ai_usage` still stores NO prompt or answer text. If the registry cannot be read, the old key-by-key chain is the safety net. Migrations now go through `0032`.

- v56 Two boards + four languages (migration `0033`): the setting `boards` holds BOARD_EXAM_1/BOARD_EXAM_2 labels, dates, enabled flags, optional subject lists and the programme name; dates are EMPTY until the founder enters them. Readiness and the programme (`packages/core/boards`) never predict marks; they say "Insufficient data" and use the line "Estimated readiness based on Sahayak assessment evidence." Four independent language choices (app, question, learning, report) live in `learning_profiles`; use `languagesForStudent()` / `getReportLang()`, never read the cookie directly for report or tutor language. Languages are rows in `supported_languages` (adding one needs no schema change). A Hindi question version that failed `validateTranslation` or was rejected is never shown; the fallback to English is stated. Hindi/mixed handwriting goes to a teacher unless the AI reading is HIGH confidence; an unsupported language always goes to a teacher. Language conflicts are reported, never silently replaced. Migrations now go through `0033`.

## Engagement engine (v57)
- v57 Student Engagement & Retention Engine (migration `0034`, code `packages/core/engagement/`, setting `engagement` edited at /admin/engagement-settings). Priority order is LEARNING > RETENTION > ENGAGEMENT > GAMIFICATION. It is pull-based and idempotent: `afterActivity()` = syncSources -> refreshStreak -> unlockAchievements -> refreshMission; never award XP anywhere else. XP lives only in `xp_transactions`, unique per (student_id, ref); the daily cap applies to challenges only; no XP for opening the app, clicking, repeated submits, rushed answers (flagged for internal review, never an accusation) or recently seen questions. Challenges are served one question at a time and the answer key is returned only after answering; challenges never write `mastery_states` (the student is told so). Weakness Battle never declares mastery. Error categories come only from an already-detected misconception tag, otherwise "Not yet categorised". Leaderboards are opt-in, nickname only (`checkNickname`), hidden below `min_members`, ranked by learning measures only. Admin metrics show "Insufficient data" below 5 and label engagement-vs-improvement as an association, not a cause. Notices are in-app only. Friend challenge and referral are flag/architecture only (no screens, no automatic money rewards). Tutor/centre challenges show counts and averages only. Migrations now go through `0034`.
- v58 (migration `0035`): Hindi for engagement screens uses `packages/core/engagement/i18n.ts` (`E(key, lang)` for screen text, `trE(text, lang)` for sentences the engine writes in English; unknown text stays English, never guessed; wording is a draft for a Hindi teacher to read). Friend challenge (`friend.ts`, `/friend`) and referral (`referral.ts`, `/invite`) are OFF until the founder switches them on; friend challenge shows a friend's nickname and score only after both have played; the v58 student-only referral (`referral.ts`, `/invite`) never creates XP, discounts or payments (its reward is set by hand at /admin/engagement/referrals); the v60 referral for all roles is separate - see the v60 section. A/B results (`ab.ts`, /admin/engagement/ab) are labelled an association, "Insufficient data" under 5 per group. Migrations now go through `0035`.

## AI ledger and economics (v59)
- v59 (migration `0036`, code `packages/core/ai-gateway/{economics-settings,economics,ledger}.ts`, admin `/admin/ai-economics` and `/admin/ai-requests`, setting `ai_economics`). Every AI attempt row carries a `request_id` (all attempts of one request share it), the exact model + version, quota type, five cost layers and the pricing snapshot used at the time. Never describe a whole provider as free: quota type belongs to an exact model/plan row; a free quota is a subsidy and unit economics use the LIST price (`economic_cost_inr`). `actual_cost_inr` stays NULL unless known; provider invoices are typed in at /admin/ai-economics (`ai_reconciliations`). `route_explanation` and every economic figure are ADMIN ONLY: never return them from a student, parent, tutor or centre route. Routing can also use capability, quality minimum, cost ceiling and latency limit per task (setting `ai_economics`); a quality minimum removes models with no benchmark score (never guessed). Handwritten evaluation: contribution = selling price - total variable cost, `MARGIN_AT_RISK` below the configured threshold; costs the founder has not entered show as missing. Spend limits warn at 80%, critical at 90%, block at 100% (non-essential stops; essential work continues only on approved free routes; nothing silently becomes paid). Deterministic work (marks, %, XP, streaks, badges, leaderboard, progress, subscription status, billing) must never call AI. Migrations now go through `0036`.

## Fixed diagnostic, answer checking, keypad, bank fill, referrals (v60)
- v60 (migration `0037`, code `packages/core/answers/input.ts`, `question-engine/generators.ts`, `referral/referral.ts`, component `AnswerInput`). Every new diagnostic has exactly `DIAGNOSTIC_LENGTH = 20` questions: one anchor per chapter, extra "filler" questions (round-robin from the chapters' other skills) when a subject has fewer than 20 chapters; a miss inserts a prerequisite check and drops the last unanswered filler so the length stays 20. In-progress attempts started before v60 keep their old plan (cap 15). Never write "8-15" again.
- Answer boxes: use `AnswerInput` for every place a student types an answer (it filters wrong characters while typing, warns, and shows a symbol keypad). The kind (number / text / expression / choice) is a HINT only (`inputKindOf(type, expected)`); the answer key never goes to the browser. The server re-checks the format before marking where a wrong format can be refused without losing the question (diagnostic, challenge); quiz and mock are batch-graded so they check in the browser only. `grading.ts` normalises keypad symbols (square, cube, root, pi, minus sign, division sign, subscripts) so a typed symbol equals the stored plain-text key.
- Question bank: the target is 1,000 diagnostic questions per subject (`DIAGNOSTIC_BANK_TARGET`). `/admin/question-bank` has "Fill to 1,000". Computer Applications style subjects are filled by code (`CODE_GENERATORS`: logic, addresses, spreadsheets, loops, HTML, number systems; the key is computed, so it cannot be wrong); everything else uses the AI plus the second independent solve. All stay `needs_review`. Every session/diagnostic start also runs a fill step. Speed depends on the free AI quota; never promise a date for reaching 1,000.
- Referral for every role (student, parent, teacher, tutor, centre): link `/r/<CODE>` sets cookie `sahayak_ref`; sign-up routes call `attachReferralFromCookie`. When the friend finishes a real first diagnostic (at least `min_answers` answers) `qualifyReferralsForStudent` gives bonus access days to both, once (`bonus_days_ledger.ref` is unique). Founder choice 2026-10-23: free extra days, automatic. Setting `referral` in `commerce_settings` (rewards OFF until the founder saves the days and switches them on). Days extend a paid, unexpired `access_until` immediately; on the free plan they are held and added by `verifyAndActivate`. Teachers, tutors and centres are not paid in days: their reward is held for the founder. Caps: rewarded invites per person, sign-ups per internet address, minimum answers. Referral never creates XP, discounts or payments. Counts only, no names, in any screen. Migrations now go through `0037`.
