# Adaptive AI Tutor — MVP

CBSE Class 10 Maths adaptive 1-to-1 tutor. See `docs/architecture.md` for the full design
(architecture diagram, schema, API spec, mastery algorithm, orchestration flow, 7-day plan).

## Day 1 checklist

- [x] Repo structure (`apps/web` Next.js app, `packages/core` domain logic, `packages/db` schema + seed)
- [x] Database schema (`packages/db/schema.sql`)
- [x] Curriculum seed data (`packages/db/seed/cbse-class10-maths.json`)
- [x] Supabase client + server helpers (`apps/web/lib/supabase-client.ts`, `supabase-server.ts`)
- [x] Auth middleware stub (`apps/web/middleware.ts`)
- [x] Domain type stubs for every `packages/core/*` module
- [ ] Run the migration against a real Supabase project (you do this — see below)
- [ ] Run the seed script against that project

## Day 2 checklist (this update)

- [x] `curriculum.service.ts` — loads the full curriculum tree and resolves prerequisite chains
- [x] `learner-state.service.ts` — hydrates the full `LearnerState` from Supabase (mastery, misconceptions, recent performance, preferences, session history)
- [x] `preferences.service.ts` — evidence-based preference updates (observable signals only, never sentiment/personality)
- [x] `analytics/events.ts` — `logEvent` implemented for real, via a service-role client scoped to `packages/core/db/service-client.ts`
- [x] `GET /api/curriculum`, `GET /api/curriculum/topics/:topicId`
- [x] `GET /api/student/profile`, `POST /api/student/onboarding`
- [x] Onboarding UI (`app/onboarding/page.tsx`) → diagnostic placeholder (`app/diagnostic/page.tsx`)
- [ ] Diagnostic engine itself, mastery service — Day 3

## Day 3 checklist (this update)

- [x] `mastery.service.ts` — `updateMastery()` computes the 5 weighted components from real `question_attempts` (recent accuracy, applied-question performance, consistency via variance, independent performance, retention with a documented spaced-gap fallback) and persists to `mastery_states`
- [x] `diagnostic/engine.ts` — adaptive ~12-15 question diagnostic: one anchor question per topic in curriculum order, with a prerequisite-check question spliced in (once per anchor, capped at `MAX_QUESTIONS`) whenever an anchor is missed
- [x] Diagnostic result classifies skills into `strengths` / `weakSkills` / `prerequisiteGaps` (a miss counts as a gap when something else that was also missed depends on it) and recommends a starting skill
- [x] Diagnostic completion seeds coarse initial `mastery_states` per touched skill, refined later by real session attempts
- [x] Diagnostic question bank seed (`packages/db/seed/cbse-class10-maths-diagnostic.json`) + loader (`seed-diagnostic.js`)
- [x] `POST /api/diagnostic/start`, `POST /api/diagnostic/answer`, `GET /api/diagnostic/result/:attemptId`, `GET /api/mastery`
- [x] Diagnostic page now drives the real question flow
- [ ] Tutor orchestrator, AI provider wiring — Day 4

## Day 4 checklist (this update)

- [x] `GeminiProvider` — real implementation, calls the Gemini REST API directly (`gemini-2.0-flash`, no SDK dependency); requires `GEMINI_API_KEY`
- [x] `pedagogy.engine.ts` — the ordered strategy-selection rule table + difficulty mapping + a keyword-based student-command parser ("hint", "give me an example", "make it easier", "challenge me", "I don't understand", "explain differently")
- [x] `tutor.orchestrator.ts` — the real 15-step loop: loads learner state, resolves the objective, checks direct prerequisites (redirects to `PREREQUISITE_REPAIR` on a gap), selects strategy + difficulty, builds the tutor prompt, calls the AI provider, and — for answer turns — grades deterministically or via the evaluation prompt, detects/records misconceptions, updates mastery, logs `question_answered`, and recomputes the next strategy
- [x] `question-engine/selector.ts` — prefers a bank question matching skill+difficulty; generates via the AI provider (validated before being served/persisted) only when the bank is thin
- [x] `misconceptions/taxonomy.ts` — real two-stage detection: a deterministic sign-flip check first, LLM classification (constrained to the question's own `misconception_tags`) as fallback
- [x] `session-summary.service.ts` — the Session Engine's completion summary: recomputes final mastery, pulls the session's `question_attempts`, and makes one LLM call to phrase the structured facts (never asked to invent them)
- [x] `POST /api/session/start|message|answer|hint|complete`, `GET /api/sessions`
- [x] `/learn` page — a real chat UI driving the session, question flow, hints, and end-of-session redirect to `/dashboard`
- [ ] Adaptive difficulty refinement, richer misconception patterns, dashboard, analytics wiring — Day 5-6

## Day 5 checklist (this update)

- [x] `question-engine/grading.ts` rewritten as real structured comparison — order-independent root lists (`x = -2, -3` == `x = -3, -2`) and order-independent expression terms (`x^2 - 2x - 15` == `-2x + x^2 - 15`), not naive string equality. Verified against all 14 seeded diagnostic answers plus a dedicated test set.
- [x] `misconceptions/taxonomy.ts` — added a second deterministic check (close-numeric-miss → `ARITHMETIC_ERROR`) alongside the existing sign-flip check, before falling back to the LLM stage
- [x] `pedagogy.engine.ts` — `nextDifficulty()`: a one-step-up/down response to the answer just graded, blended with the mastery-band baseline, so difficulty adapts within a session rather than only across full state reloads
- [x] Orchestrator now poses the next question in the *same* answer-turn response when the next strategy calls for one (`GUIDED_PRACTICE`/`INDEPENDENT_TEST`/`CHALLENGE`/`REVIEW`), using `nextDifficulty()` — no extra round trip needed for the adaptive loop to keep moving
- [x] Real hint tracking — `learning_sessions.hint_count_for_active_question` increments on every `HINT` strategy turn, resets when the active question changes, and now actually populates `question_attempts.hints_used` (previously always `0`, silently flattening mastery's "independent performance" component)
- [ ] Dashboard, analytics wiring — Day 6

## Day 6 checklist (this update)

- [x] `/dashboard` — server component: progress by chapter (skills + mastery band, chapter average), recent session history, "continue learning" CTA. Redirects to `/onboarding` if the student record doesn't exist yet.
- [x] Analytics wiring completed — all 11 required event types (`signup`, `onboarding_completed`, `diagnostic_started`, `diagnostic_completed`, `session_started`, `question_answered`, `hint_requested`, `lesson_completed`, `mastery_changed`, `session_completed`, `return_session`) now have real call sites, verified by grep, not just listed in the type union
  - `lesson_completed` fires from `mastery.service.ts` when a skill first crosses into `strong`/`mastered` — the MVP's stand-in for "unit completed" since the schema has no separate lesson concept
  - `return_session` fires from `/api/session/start` when the student has any prior *completed* session
- [x] `docs/bolt-integration.md` — two integration paths (port Bolt's components into `apps/web`, recommended; or run Bolt standalone and call this API cross-origin) with the concrete cookie/CORS caveats for the second path
- [x] Opt-in CORS on `/api/*` via `BOLT_FRONTEND_ORIGIN` (unset by default — the API stays closed to cross-origin calls until explicitly configured)
- [ ] Full eval run, bug fixing, deployment — Day 7

## Day 7 checklist (this update)

- [x] **Eval harness implemented for real** (`eval/run-eval.ts`, `npm run eval`) — two sections:
  - Section A: grading-mechanism self-check, no network needed, runs every time. Verified live in this environment: **18/18 checks pass** (all 14 seeded diagnostic answers self-match, plus 4 curated near-miss cases). Deliberately broke it and confirmed the exit-code gate actually fails (exit 1, clear stderr) before restoring — this isn't just code that looks like it would work.
  - Section B: live orchestrator run against `eval-set.json`, skipped with a clear message when `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`GEMINI_API_KEY` aren't set (verified — it skips cleanly rather than crashing). Reports latency automatically; pedagogical quality and hallucination are explicitly left for human review of the printed transcript, not auto-graded — self-grading with the same model that generated the response isn't a reliable check.
- [x] **Two real bugs found and fixed** by re-auditing every Supabase `.select()` against its call sites (not just trusting the type-checker, which can't see column names since there's no generated Supabase schema type — noted as a known gap below):
  1. The free-text ("step" type) answer-grading path selected `id, skill_id, question_type, expected_answer, difficulty` but never `prompt` — then passed the *skill name* into the evaluation prompt as a stand-in for the actual question text. The model was grading free-text reasoning against no real question context.
  2. After grading an answer, when the next strategy poses a new question in the same turn, the tutor prompt reported the *old* question's difficulty instead of the new one's.
- [x] `docs/deployment.md` — hosting, env var checklist, migration/seed order, and a concrete pre-launch checklist (RLS actually-on verification, service-role key isolation, the eval run, and a manual smoke test — the eval harness doesn't replace walking the real loop once)
- [ ] **Known gap, worth flagging rather than hiding**: there's no generated Supabase TypeScript schema (`supabase gen types typescript`), so `tsc --noEmit` passing does *not* mean every `.select()` string matches real columns — both bugs above were exactly this class of error, caught only by manual audit. Wiring in generated types would turn this class of bug into a compile error; worth doing before scaling past the MVP.

## Beyond Day 7: more chapters and a second subject (this update)

Adding content surfaced a real architecture gap rather than being pure data entry — worth
being explicit about what changed and why:

- [x] **Maths expanded from 4 to 8 chapters**: added Arithmetic Progressions, Triangles,
  Coordinate Geometry, and Introduction to Trigonometry (31 skills total now, up from 14).
- [x] **Science added as a second subject** under the same CBSE/Class 10 curriculum —
  Chemical Reactions and Equations, Acids/Bases/Salts, Life Processes (6 skills, 3 diagnostic
  questions). Proves the "support other subjects without redesigning the core learner
  architecture" requirement for real, not just in the abstract.
- [x] **Diagnostic anchor strategy changed from one-question-per-topic to
  one-question-per-CHAPTER** (`diagnostic/engine.ts`'s `getAnchorSkillIds`). The original
  4-chapter pilot anchored per topic (12 anchors) and stayed within the "~8-15 questions"
  target by luck as much as design — at 8 Maths chapters, per-topic anchoring would have
  produced ~20 anchors before any adaptive insertions, blowing well past the target. Chapter-
  level anchoring keeps diagnostic length roughly proportional to chapter count, which is what
  actually stays true as content scales; topic-level granularity still gets assessed properly
  during real tutoring sessions via the question bank, just not during initial triage.
  Verified: Maths now produces exactly 8 anchors (within the 8-15 target, room to grow via
  prerequisite insertions up to 15); Science produces 3 (a 3-chapter subject correctly
  produces a shorter diagnostic — not a bug, just what proportional scaling looks like for a
  smaller pilot subject).
- [x] **Fixed a real pre-existing bug this surfaced**: `learning_goals` had no `subject_id`,
  so `learner-state.service.ts` always resolved objectives from `curriculum.subjects[0]` —
  harmless with one subject, silently wrong with two (a Science-onboarded student would still
  get Maths skills as their objective). Added `subject_id` to `learning_goals`, threaded it
  through onboarding (`subject` field, defaults to `'maths'`), `learner-state.service.ts`
  (prefers the active goal's subject, falls back to the curriculum's first subject only for
  pre-existing goal rows), and `/api/diagnostic/start` (derives the default subject from the
  student's active goal instead of hardcoding `'maths'`).
- [x] **Fixed a second, more serious pre-existing bug**: `runOrchestratorTurn` re-derived the
  tutoring objective from learner state on *every turn* via `resolveCurrentObjective()`,
  instead of pinning to the skill the session was actually created for. With one subject this
  could only drift within Maths; the real risk it exposes is `learning_sessions.skill_id`
  (which `session-summary.service.ts` computes before/after mastery against) silently
  diverging from whatever skill the orchestrator actually taught mid-session, corrupting the
  completion summary. Fixed by reading `learning_sessions.skill_id` directly as the fixed
  objective for the session's lifetime — `resolveCurrentObjective()` is now only called by
  `/session/start` to pick a skill for a *new* session, never inside the per-turn loop.
- [x] `seed.js` and `seed-diagnostic.js` generalized to loop over every
  `cbse-class10-*.json` / `*-diagnostic.json` file in `packages/db/seed/` automatically —
  adding a third subject later is "drop two seed files," not "edit the loader."
- [x] Onboarding UI now asks which subject (Maths/Science); dashboard shows progress grouped
  by subject instead of only the first one.
- [x] Verified, not just asserted: a referential-integrity check (every `requires` slug and
  every diagnostic question's `skill_slug` resolves, no duplicate skill slugs within a topic)
  passes for both subjects — 31 Maths skills / 18 diagnostic questions, 6 Science skills / 3
  diagnostic questions, zero dangling references. All 25 grading-mechanism checks in
  `npm run eval` still pass (21 seeded answers self-match + 4 curated near-miss cases).

## Completing both syllabi (this update)

Extended both subjects from their pilot chapter sets to their full standard CBSE Class 10
syllabi (Constructions and a handful of the more volatile/recently-revised Science chapters —
Sources of Energy, Periodic Classification, Heredity and Evolution, Our Environment,
Management of Natural Resources, The Human Eye — deliberately left out for now, flagged here
rather than silently omitted; straightforward to add later following the same pattern).

- [x] **Maths: 8 → 14 chapters.** Added Some Applications of Trigonometry, Circles, Areas
  Related to Circles, Surface Areas and Volumes, Statistics, and Probability. 41 skills total
  (up from 31), all prerequisite chains verified to resolve.
- [x] **Science: 3 → 10 chapters**, now spanning all three disciplines instead of just
  Chemistry/Biology — added Metals and Non-metals, Carbon and its Compounds (Chemistry);
  Light – Reflection and Refraction, Electricity, Magnetic Effects of Electric Current
  (Physics); Control and Coordination, How do Organisms Reproduce? (Biology). 18 skills total.
- [x] **One skill (`apply-pythagoras-theorem`) got a diagnostic question added retroactively**
  even though it isn't a chapter anchor — it's now a direct prerequisite of two different
  chapters' anchors (Trigonometry and the new Circles chapter), and without a diagnostic
  question of its own, the adaptive prerequisite-insertion step would silently no-op whenever
  either anchor was missed. Caught by tracing prerequisite references during content-writing,
  not by a test — worth knowing the diagnostic engine degrades quietly (skips the insertion)
  rather than erroring when a referenced prerequisite has no seeded question, so this class of
  gap doesn't announce itself.
- [x] **Deliberately kept every new prerequisite within its own subject.** The schema and
  orchestrator would technically allow a Science skill to require a Maths skill (prerequisites
  are just `skill_id -> skill_id`, and mastery is tracked globally, not per-subject) — a couple
  of the new Science skills (mirror formula, Ohm's law) are realistic candidates for that, since
  they genuinely lean on algebra. Left un-cross-referenced anyway: doing so would let a Science
  session silently redirect into teaching Maths content mid-conversation, with no UX designed
  for that jump (the tutor prompt has no way to say "we're pausing Science for a Math
  prerequisite"). Noted as a real design boundary, not just left out by omission.
- [x] Chapter-anchor counts land cleanly in range: Maths now produces exactly 14 anchor
  questions (top of the 8-15 target, verified by simulating the selection logic against the
  seed JSON directly); Science moved from 3 anchors (below target) to 10 (comfortably within
  it) now that it has real breadth.
- [x] Extended `eval-set.json` with 6 new cases covering the new Maths chapters and all three
  Science disciplines, so a live `npm run eval` run exercises the expanded content too.
- [x] Verified, not asserted: referential-integrity check re-run against the completed syllabi
  — 0 dangling prerequisites, 0 dangling diagnostic-question skill references, 0 duplicate
  skill slugs, 0 chapter anchors missing a diagnostic question, across both subjects. Grading-
  mechanism self-check: **39/39 pass** (35 seeded answers — including trickier ones added this
  round like `-15`, `1/3`, and the hyphenated `Counter-clockwise` — plus 4 curated near-miss
  cases). No code changes were needed in the dashboard, onboarding, or seed scripts to support
  the larger content set — confirms the multi-subject architecture work from the previous
  round was the right fix, not just a workaround for the two-subject case specifically.

**To actually run a tutoring turn you need `GEMINI_API_KEY` set** (get one from Google AI Studio) — everything else in this scaffold works without external API calls except this.

## Setup

Works the same on macOS, Linux, and Windows (cmd.exe or PowerShell) — every script below
reads `apps/web/.env.local` directly, so there's no shell-specific `export`/`set` step.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Supabase project. From **Project Settings → API**, copy the project URL, the
   `anon` key, and the `service_role` key. From **Project Settings → Database → Connection
   string → URI**, copy the connection string for `DATABASE_URL`.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in every value (Supabase
   URL/keys, `DATABASE_URL`, and `GEMINI_API_KEY` from Google AI Studio).
4. Apply the schema and RLS policies:
   ```bash
   npm run db:migrate
   ```
5. Seed the curriculum (both subjects — Maths and Science):
   ```bash
   npm run db:seed
   ```
6. Seed the diagnostic question bank (must run after step 5 — it resolves skills by slug):
   ```bash
   npm run db:seed:diagnostic
   ```
7. Run the app:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

Optional: `npm run eval` runs the grading self-check (no credentials needed) and, once
steps 2–3 are done, a live orchestrator run against Gemini too.

### Real accounts instead of anonymous sign-in (this update)

Anonymous sign-in was a fast way to unblock testing, but it's the wrong architecture for
real use: progress lives in one browser's cookies, so clearing cookies or switching devices
loses it, and there was no way to distinguish one student from another on a shared laptop.
Replaced with real email/password accounts — sign up, sign in, forgot password, and a
working sign-out (added because it's now actually needed: without it, a second student on
the same laptop would be continuing the first student's account).

**Two things to configure in Supabase before this works — both silent-failure traps like
the anonymous-sign-ins one, so set them now rather than debugging blind later:**

1. **Authentication → URL Configuration → Redirect URLs.** Add
   `http://localhost:3000/reset-password` (and your real deployed URL + `/reset-password`
   once you deploy). Supabase silently ignores any `redirectTo` that isn't on this exact
   list — the email still sends, but the link in it won't take the user anywhere useful.
2. **Authentication → Providers → Email → Confirm email.** Decide on this deliberately:
   - **Off** — `signUp()` returns a working session immediately, same fast flow as
     anonymous sign-in had. Fine for a controlled demo with people you trust.
   - **On** (Supabase's default for new projects) — the app correctly shows a "check your
     email" message and requires signing in after confirming (see `handleSignUp` in
     `app/page.tsx`), but this depends on Supabase's built-in email sending, which free-tier
     projects rate-limit heavily — plan for a real SMTP provider (Settings → Auth → SMTP
     Settings) before relying on this for more than a couple of test accounts at once.

### Onboarding merged into the home page (this update)

Moved at your request: the name/subject form that used to live on a separate `/onboarding`
page (reached via a click from the landing page) is now directly on `/` — no extra page,
no extra click, and it makes "no sign-up form to fill out first" literally true instead of
just implied. `/onboarding` still exists as a one-line redirect to `/`, so an old bookmark
or shared link doesn't 404; the dashboard's not-signed-in fallback now redirects to `/` too.

Also fixed the flow around the anonymous-auth propagation delay you hit: rather than
require a manual "Try again" click every time, the page now retries quietly every 4 seconds
on its own while the session hasn't started yet — since the most common cause (a
just-flipped Supabase dashboard toggle) resolves within a minute or two by itself. The
manual retry button is still there for a real failure.

### Real bug found on first real use: no sign-in existed anywhere

Once `db:migrate` and both seed commands succeeded, the onboarding form failed with
`unauthenticated`. Root cause: `/api/student/onboarding` (correctly) requires a real
Supabase Auth session before it will create a student record, but **no page in the app
ever created one** — there was no login, no signup, nothing. This had been invisible
through every previous round of testing, because none of it exercised a real browser
session against a real Supabase Auth service.

Fixed with `supabase.auth.signInAnonymously()`, called automatically on the onboarding
page before the form renders — matching what the landing page's copy already promised
("no sign-up form to fill out first"). Verified the loading state and the
retry-on-failure UI render correctly; **could not verify the success path** — that needs
Supabase's real Auth service (GoTrue), which was never part of the local Postgres+PostgREST
stand-in stack (see `local-dev/README.md`'s own stated limits). This is the one thing to
check first when testing next.

**Before it will work: enable Anonymous Sign-Ins.** Off by default on every Supabase
project. Dashboard → Authentication → Sign In / Providers → Anonymous Sign-Ins → on.
Without this, onboarding will show a clear error naming this exact setting, rather than
a bare "unauthenticated".

Anonymous sessions are real, permanent-until-cleared sessions (a real `auth.users` row,
a real cookie) — not a demo hack. Supabase's own documented upgrade path
(`supabase.auth.updateUser` with an email/password) converts one to a full account later
without losing data, so this is a legitimate long-term choice for a low-friction signup,
not just a stopgap.

### Troubleshooting first-time setup

| You see | What it means | Fix |
|---|---|---|
| `No .env.local found at ...` / `Missing DATABASE_URL` | The scripts read `apps/web/.env.local`, and it isn't there. A fresh unzip never contains it (it holds secrets). | Copy `apps/web/.env.example` to `apps/web/.env.local` and fill it in. On Windows, check the file isn't really named `.env.local.txt`. |
| `password authentication failed for user "postgres"` (`28P01`) | You reached the database, but the password in `DATABASE_URL` is wrong. | Replace the `[YOUR-PASSWORD]` placeholder (brackets included). Simplest reliable fix: Supabase > Project Settings > Database > **Reset database password**, choose letters and numbers only, paste it in. |
| `ENOTFOUND` / `ETIMEDOUT` on the database host | Supabase's "Direct connection" string is IPv6-only on newer projects; your network is IPv4. | Use the **Session pooler** connection string instead. |
| `Could not find the table 'public.curricula'` (`PGRST205`) or "the API returned an empty error" during seeding | The tables don't exist — `db:migrate` failed or wasn't run. | Run `npm run db:migrate` and confirm it ends with `Migration complete.`, then seed. |
| `npm warn ... allow-scripts ... esbuild` | npm's new install-script notice. Harmless here — `tsx` runs fine without it. | Ignore. |
| `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` (Windows) | Node crashing on `process.exit()` while sockets close. | Fixed in this version; if you still see it, it's hiding a different real error above it. |

## Repo layout

```
apps/web/            Next.js app (routes are thin — they call packages/core services only)
packages/core/        Framework-agnostic domain logic: learner model, curriculum, mastery,
                       pedagogy, orchestrator, AI provider abstraction
packages/db/           schema.sql, RLS migration, curriculum seed data, seed script
eval/                  Internal evaluation set + runner (Day 7)
docs/architecture.md   Full design doc
```

Rule that keeps this maintainable: **API route handlers never contain logic.** They parse
the request, call one `packages/core` service, return JSON. This is what lets Gemini be
swapped for Claude, or Next API routes be swapped for FastAPI, without touching domain code.

## Live-testing round (this update)

No Supabase project or Gemini credentials were available to test against directly, so this
round built a real local Postgres + PostgREST stack (`local-dev/`) instead of stopping at
"it type-checks" — genuinely running the real `migrate.js`, `seed.js`,
`seed-diagnostic.js`, and `packages/core` functions against a real database. Full
walkthrough and how to reproduce it: `local-dev/README.md`.

- [x] **Found and fixed a real, deployment-breaking bug**: `pg` was never declared as a
  dependency anywhere in the workspace. `migrate.js` would crash with `Cannot find module
  'pg'` on the very first run after a clean `npm install` in any real deployment — this is
  a plain `.js` file, so `tsc --noEmit` passing never had a chance to catch it.
  `@supabase/supabase-js` had the same latent risk, working only by lucky hoisting from
  `apps/web`'s and `packages/core`'s own dependencies. Both now declared explicitly in root
  `package.json`.
- [x] **Found and fixed a second real bug**: `docs/deployment.md` claimed all three
  scripts were idempotent, but `0002_rls_policies.sql` used bare `create policy`
  statements — Postgres has no `create policy if not exists`, so re-running `migrate.js`
  against an already-migrated database crashed on the first policy. Added a
  `drop policy if exists` guard before each of the 23 policies. Verified by running
  `migrate.js` three consecutive times against the same real database — not asserted,
  actually re-run and confirmed stable.
- [x] Real `schema.sql` + the fixed RLS migration applied cleanly to a real Postgres 16
  instance — every table, index, FK, and policy, zero errors.
- [x] Real `seed.js` and `seed-diagnostic.js`, run via `npm run db:seed` /
  `npm run db:seed:diagnostic` exactly as documented, loaded all 14 Maths chapters (41
  skills, 41 prerequisite edges) and all 10 Science chapters (18 skills, 8 prerequisite
  edges) through the real `@supabase/supabase-js` client over real HTTP, against a real
  PostgREST-fronted database.
- [x] Real `packages/core` diagnostic engine run end-to-end (`local-dev/integration-diagnostic-flow.ts`):
  started a real diagnostic attempt, answered all 14 questions (every 3rd deliberately
  wrong), and confirmed completion. The resulting `mastery_states` scores were hand-verified
  against the mastery formula, not just eyeballed: a single wrong diagnostic answer produces
  exactly 22 (`0.4·0 + 0.2·0 + 0.15·100 + 0.15·0 + 0.10·70`), a correct one exactly 97, and
  `updateMastery()` on a skill with zero real `question_attempts` produces exactly 7
  (retention-default-only). All three matched a hand-computed prediction exactly.
- [x] Real adaptive prerequisite-insertion confirmed firing (`local-dev/integration-prerequisite-insertion.ts`):
  deliberately missed the Circles chapter's anchor question, confirmed the diagnostic
  spliced in its prerequisite's question (`apply-pythagoras-theorem`, not itself an anchor)
  rather than just being documented to — 15 questions asked instead of 14, and the inserted
  skill confirmed by name.
- [ ] **What's still genuinely unverified**: everything that calls `AIProvider.complete()`
  — the tutor orchestrator's actual Gemini calls, prompt quality, and the free-text
  evaluation path. No network access to Google's API was available in this environment.
  This remains the one part of the system that needs a real `GEMINI_API_KEY` and a human
  reading the transcripts, exactly as `eval/run-eval.ts`'s Section B already describes.

## Presentable frontend (this update)

Every page was bare `<h1>`/`<form>` markup until now — fine for verifying logic, not
something to show a student or parent. Replaced with a real design system, built following
a deliberate brief rather than defaulting to generic SaaS styling (no cream+terracotta, no
uniform rounded card grid, no arrow-suffixed buttons).

- [x] **Brand: "Sahayak"** (Hindi/Sanskrit — "helper," used in Indian educational contexts
  for a teaching assistant) with an angle mark (∠) as the wordmark glyph — ties directly to
  the Geometry chapters rather than being an arbitrary logo.
- [x] **Design tokens** (`app/globals.css`): Ink `#1b2a4a` (deep indigo) on Paper `#fbf9f4`
  (warm off-white), Marigold `#e8a33d` as the one accent — deliberately not the generic
  terracotta-on-cream combination. Fraunces (display) + IBM Plex Sans (UI) + IBM Plex Mono
  used *only* for actual numeric mastery scores, where tabular figures genuinely help.
- [x] **Signature visual device**: mastery shown as a swept protractor arc
  (`components/MasteryArc.tsx`), not a generic progress ring or bar — the score maps to an
  angle, which is thematically exact for a Geometry/Trigonometry-teaching tutor rather than
  arbitrary decoration.
- [x] All five pages rebuilt on the same system: a real landing page with hero + a genuinely
  sequential 3-step explainer (diagnostic → adaptive session → mastery tracking — numbered
  treatment earned here since it's an actual sequence, not padding), styled onboarding with
  a proper subject-picker, a redesigned diagnostic question flow, a chat-style `/learn`
  session UI, and a dashboard using the mastery arc per subject/chapter.
- [x] **Actually screenshotted, not just reviewed as code**: `next build` fails in this
  sandbox specifically because `next/font/google` fetches font files from
  `fonts.googleapis.com` at build time, which is outside this environment's network
  allowlist (works fine on a real machine with normal internet access). Rather than ship
  unverified, temporarily swapped in system-font fallbacks, ran a real headless Chromium
  against a real `next dev` server, and reviewed actual screenshots of the home, onboarding,
  learn, and dashboard pages — catching layout/spacing/color issues a code read alone
  wouldn't have, then restored the real Google Fonts loading before shipping. Also confirmed
  for real (not assumed): the dashboard's auth-guard genuinely redirects to `/onboarding`
  when there's no session, rather than erroring.
- [ ] **Still worth doing before a real demo**: session-history and chapter-progress rows on
  the dashboard are plain text once populated with real data (only checked empty/redirect
  states here, since that needs a live backend this environment can't provide) — worth a
  once-over with real seeded data before showing it to anyone. The `/learn` chat's empty
  state is a little bare when there's no backend response yet; only matters if the API is
  slow to respond.

## Next.js version (found during first real setup, later resolved)

`npm install` warned that `next@14.2.5` has a security vulnerability. Checked against the
real registry: bumped to `14.2.35`, the last release on the 14.x line (clears the
"deprecated" flag, no breaking changes, still type-checks) — but `npm audit` still reports
Next.js advisories, because **no patched release exists on 14.x at all**; every fix is in
15.5.x (advisories list fixes at `>=15.5.24`) or 16.

What that means in practice:
- **Local testing on your own machine: fine.** Most advisories concern features this app
  doesn't use (verified: no rewrites, no `next/image`, no server actions, no edge runtime);
  the Windows-server RCE only matters if *hosted* on Windows; localhost isn't exposed.
- **Putting it on the public internet for students and parents: upgrade first.** A few
  advisories (Server Components DoS / cache poisoning) apply to any App Router app.
- The upgrade to 15.5.x is a real migration, not a version bump: React 19, and `cookies()`
  and route-handler `params` become async (touches `lib/supabase-server.ts`,
  `middleware.ts`, and the two dynamic `[id]` API routes). Deliberately not bundled into
  first-run debugging, so a framework change can't be confused with a setup problem.

## Real accounts instead of anonymous sign-in, onboarding on the home page (this update)

Confirmed working end-to-end for the first time: real signup → confirmation email → click
the link → land on the home page → correctly routed to the name/subject step rather than
back to a sign-up form.

- **Anonymous sign-in replaced with real email/password auth.** The first working version
  gated onboarding behind `supabase.auth.signInAnonymously()`, which is architecturally
  wrong for this product — anonymous sessions lose all progress on a cookie clear or device
  switch, and can't tell two students apart on a shared family laptop. `app/page.tsx` now
  has real Sign Up / Sign In / Forgot Password forms, `app/reset-password/page.tsx` handles
  the password-recovery email link, and `SiteHeader` has a working Sign Out.
- **Onboarding merged into the home page.** `/onboarding` is now just a redirect to `/` for
  old links; the name/subject step renders inline on `/` once a session exists and the
  account hasn't finished it yet.
- **Added: session check on page load.** `page.tsx` previously only resolved the
  signed-in-vs-needs-onboarding state right after a submit, so a user who already had a
  valid session (a returning visit, or a second tab) would see the Sign Up form instead of
  being routed on automatically. A `useEffect` now calls `supabase.auth.getSession()` on
  mount and, if a session exists, runs the same routing logic sign-in uses — showing a
  brief "Checking your session…" line instead of flashing the auth form first.
- **Real SMTP needed for multi-user testing.** Supabase's built-in email sender is capped at
  2 emails/hour project-wide (and on some plans only delivers to the project owner's own
  address), which isn't enough to let several real students sign up. Point
  Authentication → Emails at a custom SMTP provider — Gmail SMTP (`smtp.gmail.com:587`, an
  App Password, 500/day, sends to any recipient) is the fastest path with no domain needed;
  Resend is a free alternative but won't deliver to anyone but your own account until a
  domain is verified.
- Also required in the Supabase dashboard: **Redirect URLs allowlist**
  (Authentication → URL Configuration) must include your app's origin, or
  `resetPasswordForEmail`'s `redirectTo` is silently dropped.

## Gemini model deprecation (this update)

Google retired `gemini-2.0-flash` (the model `GeminiProvider` was hardcoded to). Fixed by
updating the `GEMINI_MODEL` constant in `packages/core/ai-provider/gemini.provider.ts` to
`gemini-3.8-flash`, currently Google's latest stable Flash model. If this happens again,
check `GEMINI_MODEL` is the only place the model name is hardcoded — intentionally, per the
AI-provider-abstraction rule, so a model swap never touches `TutorService` or anything else
in the codebase.

## Next.js upgraded to 15.5.27, in-app feedback added (this update)

Public deployment prep, prompted by wanting real students/parents to try the live app.

- **Upgraded `next` 14.2.35 → 15.5.27**, `react`/`react-dom` 18 → 19, `@supabase/ssr`
  0.4 → 0.12. This was a real migration, not a version bump, now done:
  - `cookies()` (`apps/web/lib/supabase-server.ts`) and route `params`
    (`api/curriculum/topics/[topicId]`, `api/diagnostic/result/[attemptId]`) are async in
    Next 15 — every call site now `await`s them.
  - `@supabase/ssr` 0.5+ dropped the old `get`/`set`/`remove` cookie interface for
    `getAll`/`setAll` — updated in both `lib/supabase-server.ts` and `middleware.ts`.
  - Verified with a real `next build`: clean compile, clean type-check, all 22 routes
    generated, including the new feedback route below.
  - This clears the "no patched release on 14.x" advisory noted above — 15.5.27 is past the
    `>=15.5.24` fix line.
- **Added an in-app feedback mechanism** so real trial users can say what's broken or
  confusing without leaving the page:
  - `packages/db/migrations/0003_feedback.sql` — a `feedback` table, RLS allows insert from
    anyone (signed in or not — a parent evaluating the app before their child signs up
    should be able to leave feedback too), no select policy for anon/authenticated (only the
    service role, or a direct database query, reads it back — see
    `docs/deployment.md`, "Reading submitted feedback").
  - `POST /api/feedback` (`apps/web/app/api/feedback/route.ts`) — takes a message, optional
    1–5 rating, optional contact email, attaches `student_id` when there's a session but
    never requires one; logs a `feedback_submitted` analytics event.
  - `components/FeedbackWidget.tsx` — a small floating "Feedback" tab, bottom-right on every
    page (mounted once in `app/layout.tsx`), open to a rating + message form, a "thanks"
    state on submit.
