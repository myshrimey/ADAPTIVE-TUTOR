# Instructions for future Claude sessions working on Sahayak

Read these in order at the start of every session, before touching code:
1. This file (`CLAUDE.md`)
2. `PROJECT_CONTEXT.md`
3. `docs/DECISIONS.md`
4. The latest entries in `docs/BUILD_LOG.md`
5. `docs/RESUME_HERE.md`
6. Then check `git status` / git log and read the actual current code — don't assume this doc is perfectly in sync with it.

Confirm the next task with the founder before making any risky change (schema change, RLS change, anything touching payments or auth).

## Architecture and conventions
- Monorepo: `apps/web` (Next.js App Router) + `packages/core` (business logic, one export barrel at `packages/core/index.ts`) + `packages/db` (`schema.sql`, `migrations/`, seed scripts).
- Migrations live in `packages/db/migrations/*.sql`, numbered in order (currently through `0009`), applied with `npm run db:migrate`. Every `create policy` must be preceded by a matching `drop policy if exists` — Postgres has no `create policy if not exists`, and this repo's migrations must stay safely re-runnable.
- RLS ownership pattern used everywhere a table belongs to a student: `student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid())`.
- `createServerClient()` (in `apps/web/lib/supabase-server.ts`) is RLS-bound to the caller's session — use this for anything the student themselves reads/writes. `createServiceClient()` uses the service-role key and bypasses RLS — use ONLY for server-derived writes a client should never make directly, and never with a client-supplied ID that hasn't been re-derived from the authenticated session.
- AI calls go through `packages/core/ai-provider/factory.ts`'s free-tier fallback chain (Gemini, then Groq). Don't add a new AI provider unless there's a real dependency forcing it.

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
