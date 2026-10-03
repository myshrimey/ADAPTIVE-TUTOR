# Local integration testing (no Supabase account needed)

`local-dev/` sets up a real Postgres + PostgREST stack that's close enough to a real
Supabase project to run the actual migration, seed scripts, and `packages/core` code
against — for verifying a schema or seed change before pointing it at a real project, or
in CI. This is genuinely exercising the real code (real `migrate.js`, real `seed.js`, real
`@supabase/supabase-js` client, real `packages/core` functions) against a real database —
not a mock.

**What it does NOT cover:** Supabase Auth (GoTrue) — `auth.uid()` is stubbed to always
return `NULL`, so owner-scoped RLS policies won't behave correctly under real per-user
auth here, only "does this SQL apply without error" and "does service-role access work"
are meaningfully testable this way. And no Gemini — nothing that calls
`AIProvider.complete()` can be exercised without real API credentials. The diagnostic
engine and mastery service call neither, which is why they're what the bundled
integration tests actually exercise.

## Setup

1. Install Postgres: `apt-get install postgresql postgresql-contrib` (or your platform's
   equivalent).
2. Download a [PostgREST release](https://github.com/PostgREST/postgrest/releases) —
   grab the `linux-static-x64` (or your platform's) tarball, extract the `postgrest`
   binary, and place it at `local-dev/postgrest` (`chmod +x` it). Not committed to the
   repo — it's a ~17MB third-party binary, and the download is a one-line step.
3. Run:
   ```bash
   ./local-dev/setup.sh
   ```
   This starts Postgres if it isn't running, creates idempotent roles
   (`service_role` with `BYPASSRLS`, mirroring what Supabase's service-role key grants;
   `postgrest_authenticator` as the login role PostgREST connects as), creates the
   `tutor_local` database with a stub `auth` schema, runs the real `packages/db/migrate.js`
   against it, starts PostgREST plus a small reverse proxy (`local-dev/rest-proxy.js`,
   needed because `supabase-js` always calls `/rest/v1/*` — real Supabase's hosted gateway
   rewrites that for you; bare PostgREST doesn't), and prints the env vars to use next.
4. Export what it printed, then run the real seed scripts exactly as documented in the
   main README:
   ```bash
   export SUPABASE_URL=http://localhost:3002
   export SUPABASE_SERVICE_ROLE_KEY=<printed JWT>
   npm run db:seed
   npm run db:seed:diagnostic
   ```

Run `./local-dev/setup.sh stop` to stop PostgREST and the proxy (leaves Postgres running,
since starting it is the slow part and it's harmless to leave up).

## Running the bundled integration tests

These exercise real `packages/core` code — `loadCurriculum`, `startDiagnostic`,
`answerDiagnosticQuestion`, `updateMastery` — against the seeded database, with no AI
provider involved (the diagnostic engine and mastery service are pure database/computation
logic).

```bash
# Create test students first (integration-diagnostic-flow.ts and
# integration-prerequisite-insertion.ts expect these fixed UUIDs):
sudo -u postgres psql -d tutor_local << 'SQL'
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'test1@internal.test') on conflict do nothing;
insert into users (id, auth_user_id, email) values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'test1@internal.test') on conflict do nothing;
insert into students (id, user_id, display_name, grade) values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Test Student 1', 'CBSE-10') on conflict do nothing;
insert into auth.users (id, email) values ('55555555-5555-5555-5555-555555555555', 'test2@internal.test') on conflict do nothing;
insert into users (id, auth_user_id, email) values ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'test2@internal.test') on conflict do nothing;
insert into students (id, user_id, display_name, grade) values ('44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', 'Test Student 2', 'CBSE-10') on conflict do nothing;
SQL

npx tsx local-dev/integration-diagnostic-flow.ts
npx tsx local-dev/integration-prerequisite-insertion.ts
```

**`integration-diagnostic-flow.ts`** runs a full diagnostic attempt for Maths (real HTTP
calls, real grading, real mastery seeding), deliberately answering every 3rd question
wrong, then verifies the resulting `mastery_states` rows against the mastery formula by
hand — a wrong diagnostic answer should produce exactly score 22
(`0.4·0 + 0.2·0 + 0.15·100 + 0.15·0 + 0.10·70`), a correct one exactly 97. If either number
drifts, either the formula or its weights changed — which might be intentional, but this
test will catch it either way.

**`integration-prerequisite-insertion.ts`** deliberately misses the Circles chapter's
anchor question, whose prerequisite (`apply-pythagoras-theorem`) is not itself an anchor,
to confirm the diagnostic's adaptive prerequisite-insertion actually splices in an extra
question rather than just being documented to.

## What this already caught

Running the real scripts against a real database (rather than only reading the code or
relying on `tsc --noEmit`, which can't see runtime dependency or SQL-idempotency issues)
found two real bugs before they reached a real deployment:

1. `pg` was never declared as a dependency anywhere in the workspace — `migrate.js`
   would crash on `require('pg')` on a clean `npm install` in any real deployment.
   `@supabase/supabase-js` had the same latent risk, working only by lucky hoisting from
   `apps/web`'s and `packages/core`'s own dependencies rather than being declared by
   whatever in `packages/db` actually imports it directly.
2. `docs/deployment.md` claimed all three scripts were idempotent, but `0002_rls_policies.sql`
   used bare `create policy` statements — Postgres has no `create policy if not exists`,
   so re-running the RLS migration against an already-migrated database crashed on the
   very first policy. Fixed by adding a `drop policy if exists` guard before each one;
   verified by running `migrate.js` three consecutive times against the same database.

Neither would have been caught by `tsc --noEmit` — one is a runtime-only dependency issue
in a plain `.js` file, the other is a SQL idempotency property no type checker reasons
about. This is the concrete case for keeping this local-dev stack around rather than
relying on static analysis alone.
