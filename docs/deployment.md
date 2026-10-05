# Deployment

## Hosting

`apps/web` is a standard Next.js app — Vercel is the least-friction option (zero-config
for the App Router, and its Node runtime supports everything used here: `fetch`, the
Supabase SSR cookie helpers, Next's `redirect()`). Any Node host that runs `next build` /
`next start` works too; nothing in this codebase is Vercel-specific.

`packages/core` is bundled into `apps/web` via `transpilePackages` in `next.config.js` —
no separate deployment step for it.

## Environment variables (production)

Set all of these on the host (see `apps/web/.env.example` for the full list with comments):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from the Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only**, never expose to the browser; used for every
  write RLS blocks the client from making directly (mastery, question_attempts, misconceptions,
  learning_events — see `packages/db/migrations/0002_rls_policies.sql`)
- `GEMINI_API_KEY` — from Google AI Studio
- `GROQ_API_KEY` — optional, free account at console.groq.com. When set, it's tried
  automatically if every Gemini attempt fails (`packages/core/ai-provider/factory.ts`) — a
  different company's free tier, so the two being overloaded at once is unlikely. The app
  runs fine without it, just with less redundancy.
- `SUPABASE_URL` — same value as `NEXT_PUBLIC_SUPABASE_URL`, used by the non-Next scripts
  (`packages/db/migrate.js`, `seed.js`, `seed-diagnostic.js`, `eval/run-eval.ts`) which don't
  have access to Next's env loading
- `DATABASE_URL` — the Postgres connection string, for `migrate.js` only
- `BOLT_FRONTEND_ORIGIN` — only if you're taking the cross-origin integration path in
  `docs/bolt-integration.md`; leave unset otherwise
- `ADMIN_EMAILS` — comma-separated email(s) allowed to view `/admin/feedback`. Leave unset
  and that page stays closed to everyone, including you.

## Database setup (production Supabase project)

Run once, in order:

```bash
npm run db:migrate           # schema.sql + migrations/0002_rls_policies.sql
npm run db:seed              # CBSE Class 10 Maths curriculum
npm run db:seed:diagnostic   # diagnostic question bank (must run after db:seed)
```

All three are idempotent — safe to re-run if a deploy is repeated against the same database.

## Deploying to Vercel (step by step)

This assumes you already have a production Supabase project migrated and seeded (see
above) and a Gemini API key. Vercel is a web dashboard — nothing here needs a terminal
beyond the `git push` you'd do anyway.

1. **Push this project to a GitHub repo** (if it isn't already). Vercel deploys from a repo,
   not a zip upload.
2. **Go to vercel.com → Add New → Project**, and import that repo.
3. **Set the Root Directory to `apps/web`.** This is the one setting that's easy to miss —
   the repo root is the npm workspace, but the Next.js app itself lives in `apps/web`.
   Vercel auto-detects Next.js once the root directory is set correctly; leave Build Command
   and Output Directory on their defaults.
4. **Add every environment variable** from `apps/web/.env.example` under
   Project Settings → Environment Variables (the "Environment variables (production)" list
   above has what each one is for). Set them for the Production environment at minimum.
5. **Deploy.** Vercel gives you a `*.vercel.app` URL (or your own domain, if you've attached
   one under Project Settings → Domains).
6. **Point Supabase at the real URL** — two settings, both under
   Authentication → URL Configuration in the Supabase dashboard:
   - **Site URL** → your Vercel URL (e.g. `https://your-app.vercel.app`)
   - **Redirect URLs** → add the same URL plus `/reset-password` (e.g.
     `https://your-app.vercel.app/reset-password`) — `resetPasswordForEmail`'s `redirectTo`
     is silently dropped if it isn't on this allowlist, exactly like it was for localhost.
7. **Re-test the full real-auth flow against the live URL**, not just localhost: sign up with
   a real email, confirm, sign in, land on onboarding or the dashboard correctly (see the
   Pre-launch checklist below for the rest of the smoke test).
8. Every `git push` to the branch Vercel is tracking redeploys automatically — there's no
   separate "deploy" step after the first one.

## Pre-launch checklist

0. **No Supabase project yet, or want to sanity-check a schema/seed change first?**
   `local-dev/` sets up a real local Postgres + PostgREST stack and runs the actual
   `migrate.js`/`seed.js`/`seed-diagnostic.js` against it — see `local-dev/README.md`.
   This is how the schema, RLS migration idempotency, and the full seed pipeline (all 14
   Maths + 10 Science chapters) were actually verified against a real database rather than
   only read and type-checked; it's what caught the two bugs below.
1. **Run the eval harness** with production-equivalent credentials:
   ```bash
   npm run eval
   ```
   Section A (grading-mechanism check) must pass — it's a hard gate, the script exits 1 if it
   doesn't. Section B needs `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `GEMINI_API_KEY` set
   to run at all; read its printed transcripts for pedagogical quality and hallucination — those
   two dimensions need a human judgment call, the script won't self-grade them.
2. **Confirm RLS is actually on**, not just defined: `packages/db/migrations/0002_rls_policies.sql`
   enables RLS on every student-owned table, but if the migration was run against a database
   where RLS was later manually disabled for debugging, it stays off until re-enabled. Check in
   the Supabase dashboard under Authentication → Policies, or `select relrowsecurity from
   pg_class where relname = 'mastery_states';` should return `t`.
3. **Verify the service-role key is server-only** — grep the client bundle if unsure:
   `createServiceClient()` in `apps/web/lib/supabase-server.ts` must never be imported from a
   file that ends up in a client component. It currently isn't (only route handlers and the
   dashboard server component use it), but this is worth re-checking after any future UI change.
4. **Confirm `GEMINI_API_KEY` billing/quota** is set up for expected launch volume — Section B
   of the eval run gives a rough per-turn latency number, but real cost depends on Gemini's
   current pricing, which this codebase deliberately doesn't hardcode (see Cost Control,
   `docs/architecture.md` §13, for what keeps token usage down per turn).
5. **Smoke-test the full loop manually** once deployed: sign up → onboarding → diagnostic →
   `/learn` session → answer a few questions → `/session/complete` → `/dashboard` shows updated
   mastery. This is the MVP's own definition of done (`docs/architecture.md`, end) — walk it
   for real before calling launch complete, the eval harness doesn't replace this.
6. **Submit a test note through the feedback widget** (bottom-right on every page) and confirm
   a row lands in the `feedback` table — see "Reading submitted feedback" below, since there's
   no in-app admin view yet.

## Reading submitted feedback

The feedback widget (bottom-right on every page) writes to a `feedback` table with no admin UI
in front of it yet — by design, nothing but the service role can read it back (see
`packages/db/migrations/0003_feedback.sql`). To read what's come in:

- **Supabase dashboard → Table Editor → `feedback`** — simplest option, works immediately,
  no extra setup.
- Or query it directly: `select created_at, rating, message, contact_email, page from
  feedback order by created_at desc;` via the SQL Editor or any Postgres client connected
  with the service-role/`postgres` credentials (RLS doesn't apply to those).

If this becomes a frequent check, the next real step is a small `/admin/feedback` page
gated on a specific `auth.users` id — not built now because it's speculative ahead of
actual usage volume.

## What's intentionally not here yet

`packages/core/ai-provider/claude.provider.ts` is a stub — Gemini Flash is the only wired
provider for this MVP, per the PRD. pgvector-based question retrieval, spaced-repetition
scheduling beyond the mastery formula's retention component, and multi-subject content are
all deliberately deferred — see "What to build next" at the end of `docs/architecture.md`.
