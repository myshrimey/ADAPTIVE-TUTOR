# Integrating a Bolt-generated frontend

The PRD allows either a Next.js/React frontend or an existing Bolt-generated one. This
scaffold ships with the former (`apps/web`) because it needed *something* to call the API
routes during Days 1-6. If you have real Bolt output, there are two ways to bring it in —
pick based on how much of Bolt's generated code you want to keep driving the UI.

## Path A (recommended): port Bolt's components into `apps/web`

Bolt output is typically a Vite + React SPA with its own routing and components, but no
backend of its own — it's usually wired to call an external API or a Supabase client
directly from the browser. Since `apps/web` already has auth, the API routes, and RLS
wired up, the lowest-risk path is:

1. Copy Bolt's component files into `apps/web/app/<route>/` — e.g. Bolt's onboarding
   screen replaces the markup in `app/onboarding/page.tsx`, keeping the existing
   `fetch('/api/student/onboarding', ...)` call intact underneath it.
2. Do the same for diagnostic, learn, and dashboard — Bolt's visual design, this
   scaffold's data layer.
3. Bolt-generated components that call Supabase directly (common for simple CRUD) should
   be repointed at the `/api/*` routes instead, since mastery/question_attempts/misconceptions
   writes need the service-role logic in `packages/core` (RLS deliberately blocks direct
   client writes to those tables — see `packages/db/migrations/0002_rls_policies.sql`).
   Reads that don't need that (e.g. `GET /api/curriculum`) can go either way.

This keeps one deployable app, one auth flow, and doesn't need CORS at all.

## Path B: run Bolt's app standalone, call this API cross-origin

If Bolt's app needs to stay a separately deployed SPA (its own hosting, its own build
pipeline), it calls this project's `/api/*` routes as an external API instead.

1. Deploy `apps/web` (this becomes a pure API + auth backend; its own pages become
   optional/unused).
2. Set `BOLT_FRONTEND_ORIGIN` in `apps/web`'s environment to the Bolt app's origin
   (e.g. `https://your-bolt-app.example.com`) — `next.config.js` only sends CORS headers
   on `/api/*` when this is set, so the API stays closed by default.
3. Bolt's fetch calls need `credentials: 'include'` so the Supabase session cookie is
   sent cross-origin, and the cookie itself needs `SameSite=None; Secure` — set this in
   Supabase Auth's cookie options, which requires HTTPS on both origins (no exceptions,
   browsers won't send `SameSite=None` cookies over plain HTTP).
4. Bolt authenticates against the **same Supabase project** (same `NEXT_PUBLIC_SUPABASE_URL`
   / anon key) so the session Supabase Auth issues is valid against this API's RLS checks.

This path costs you two deployments and a cross-origin auth setup that's easy to get
subtly wrong (cookie flags, preflight `OPTIONS` handling on each route). Only take it if
Bolt's app genuinely can't be folded into `apps/web` — Path A is simpler for an MVP.

## What doesn't change either way

`packages/core` is framework-agnostic on purpose (see its files' own comments) — neither
path touches it. The orchestrator, mastery service, diagnostic engine, and every other
service keep working exactly as built regardless of which frontend calls them.
