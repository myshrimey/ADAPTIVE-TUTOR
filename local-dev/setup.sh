#!/usr/bin/env bash
# Spins up a real local Postgres + PostgREST stack that behaves enough like a
# Supabase project to run schema.sql, the RLS migration, seed.js,
# seed-diagnostic.js, and packages/core integration tests for real — without
# a Supabase account. Useful for CI, or for verifying a schema/seed change
# before pointing it at a real project.
#
# What this does NOT give you: Supabase Auth (GoTrue), so auth.uid() is
# stubbed to always return NULL — owner-scoped RLS policies won't behave
# correctly under real per-user auth here, only the "does this SQL apply
# without errors" and "does service-role access work" questions are
# meaningfully testable this way. And no Gemini — nothing in packages/core
# that calls AIProvider.complete() can be exercised without real credentials
# for that separately. The diagnostic engine and mastery service call neither,
# so they're the most valuable things to run against this stack.
#
# Usage:
#   ./local-dev/setup.sh          # starts everything, prints connection info
#   ./local-dev/setup.sh stop     # stops postgrest + the proxy (leaves Postgres running)
#
# Requires: postgresql, postgresql-contrib (apt), and a PostgREST binary at
# local-dev/postgrest (download from https://github.com/PostgREST/postgrest/releases
# — grab the linux-static-x64 tarball for your platform, extract the `postgrest`
# binary here).

set -uo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)

DB_NAME="tutor_local"
PG_PORT=5432
POSTGREST_PORT=3001
PROXY_PORT=3002
DB_URL="postgresql://postgres:localtest@localhost:${PG_PORT}/${DB_NAME}"

if [ "${1:-}" = "stop" ]; then
  pkill -f "local-dev/postgrest" 2>/dev/null
  pkill -f "local-dev/rest-proxy.js" 2>/dev/null
  echo "Stopped postgrest + proxy. Postgres itself is left running (pg_ctlcluster 16 main stop to stop it too)."
  exit 0
fi

echo "=== Starting Postgres ==="
pg_lsclusters 2>/dev/null | grep -q online || pg_ctlcluster 16 main start
sleep 1
su postgres -c "psql -c \"ALTER USER postgres PASSWORD 'localtest';\"" > /dev/null

echo "=== Roles (idempotent — create only if missing) ==="
su postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='service_role'\"" | grep -q 1 || \
  su postgres -c "psql -c \"CREATE ROLE service_role NOLOGIN BYPASSRLS;\""
su postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='postgrest_authenticator'\"" | grep -q 1 || \
  su postgres -c "psql -c \"CREATE ROLE postgrest_authenticator LOGIN PASSWORD 'pgrest' NOINHERIT;\""
su postgres -c "psql -c \"ALTER ROLE postgrest_authenticator PASSWORD 'pgrest';\"" > /dev/null # re-assert in case of drift
su postgres -c "psql -c \"GRANT service_role TO postgrest_authenticator;\"" > /dev/null

echo "=== Database + auth schema stub ==="
su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\"" | grep -q 1 || {
  su postgres -c "psql -c 'CREATE DATABASE ${DB_NAME};'"
  su postgres -c "psql -d ${DB_NAME} -c 'create extension if not exists pgcrypto;'"
  su postgres -c "psql -d ${DB_NAME}" << SQL
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid as \$\$ select null::uuid \$\$ language sql stable;
create or replace function auth.role() returns text as \$\$ select 'authenticated'::text \$\$ language sql stable;
SQL
}

echo "=== Running real migrate.js (schema.sql + RLS migration) ==="
DATABASE_URL="$DB_URL" node packages/db/migrate.js

echo "=== Granting service_role on current + future tables ==="
su postgres -c "psql -d ${DB_NAME} -c \"GRANT USAGE ON SCHEMA public TO service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;\""

echo "=== JWT for the service_role (minted locally — see local-dev/mint-jwt.js) ==="
JWT=$(node local-dev/mint-jwt.js)
echo "$JWT" > /tmp/adaptive-tutor-local-jwt.txt

if [ ! -x "local-dev/postgrest" ]; then
  echo ""
  echo "!! local-dev/postgrest binary not found. Download it from:"
  echo "   https://github.com/PostgREST/postgrest/releases"
  echo "   (grab postgrest-<version>-linux-static-x64.tar.xz, extract the 'postgrest' binary to local-dev/)"
  echo "Stopping here — Postgres and the schema are ready, but the REST layer isn't."
  exit 1
fi

cat > /tmp/adaptive-tutor-postgrest.conf << EOF
db-uri = "postgresql://postgrest_authenticator:pgrest@localhost:${PG_PORT}/${DB_NAME}"
db-schema = "public"
db-anon-role = "service_role"
server-port = ${POSTGREST_PORT}
jwt-secret = "$(node local-dev/mint-jwt.js secret)"
EOF

echo "=== Starting PostgREST + the /rest/v1 proxy ==="
./local-dev/postgrest /tmp/adaptive-tutor-postgrest.conf > /tmp/adaptive-tutor-postgrest.log 2>&1 &
node local-dev/rest-proxy.js > /tmp/adaptive-tutor-proxy.log 2>&1 &

for i in $(seq 1 15); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PROXY_PORT}/rest/v1/curricula" -H "Authorization: Bearer $JWT" -H "apikey: $JWT" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 1
done

if [ "$code" != "200" ]; then
  echo "Stack did not come up — check /tmp/adaptive-tutor-postgrest.log and /tmp/adaptive-tutor-proxy.log"
  exit 1
fi

echo ""
echo "=== Ready ==="
echo "export SUPABASE_URL=http://localhost:${PROXY_PORT}"
echo "export SUPABASE_SERVICE_ROLE_KEY=$JWT"
echo "export DATABASE_URL=$DB_URL"
echo ""
echo "Then: npm run db:seed && npm run db:seed:diagnostic"
echo "Or:   npx tsx local-dev/integration-diagnostic-flow.ts   (after creating a test student — see local-dev/README.md)"
