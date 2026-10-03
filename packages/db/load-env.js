// Loads apps/web/.env.local so packages/db/*.js scripts (and eval/run-eval.ts)
// pick up SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL / GEMINI_API_KEY
// automatically — no manual `export $(...)` needed, which doesn't work at all
// on Windows cmd.exe (no `export`) and is easy to get wrong even in bash/zsh.
//
// Next.js already auto-loads apps/web/.env.local for `npm run dev` — this just
// gives the standalone scripts the same behavior. A variable already set in
// the shell environment (e.g. in CI) takes precedence over the file, since
// dotenv never overwrites an existing process.env value by default.
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '..', 'apps', 'web', '.env.local');

const anythingSetInShell = process.env.DATABASE_URL || process.env.SUPABASE_URL;

// dotenv silently no-ops on a missing file, which then surfaces later as a
// bare "Missing DATABASE_URL in environment" with no clue why. Say so here
// instead, with the exact path checked, so this is a 5-second fix, not a
// guessing game. (Stay quiet if the variables are set in the shell instead,
// e.g. in CI — that's a legitimate setup, not a mistake.)
if (!fs.existsSync(envPath)) {
  if (!anythingSetInShell) {
    console.error(`\nNo .env.local found at:\n  ${envPath}\n`);
    console.error('Copy apps/web/.env.example to apps/web/.env.local and fill in your real values, then try again.\n');
  }
} else {
  const result = require('dotenv').config({ path: envPath });
  if (result.error) {
    console.error(`\nFound .env.local at ${envPath} but couldn't parse it: ${result.error.message}\n`);
  }
}
