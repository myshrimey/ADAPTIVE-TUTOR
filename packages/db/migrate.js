// Minimal migration runner for the MVP: applies schema.sql, then every file in
// migrations/ in filename order. For a project this size, a full migration
// framework (e.g. node-pg-migrate) is unnecessary overhead — add one when
// the schema needs to evolve after real data exists, not before.
//
// Run with: node packages/db/migrate.js
// Reads DATABASE_URL from apps/web/.env.local automatically (see load-env.js)
// — or from the shell environment if you set it there instead.

require('./load-env');
const { fail, describeDatabaseUrl } = require('./report-error');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in environment.');
  process.exit(1);
}

async function run() {
  // A very common first-run slip: pasting Supabase's template string without
  // replacing the bracketed password placeholder.
  if (/\[YOUR-PASSWORD\]|\[.*password.*\]/i.test(DATABASE_URL)) {
    const err = new Error('DATABASE_URL still contains the [YOUR-PASSWORD] placeholder');
    err.code = '28P01';
    throw err;
  }

  console.log(`Connecting as ${describeDatabaseUrl(DATABASE_URL)} ...`);
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const files = [
    path.join(__dirname, 'schema.sql'),
    ...fs
      .readdirSync(path.join(__dirname, 'migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => path.join(__dirname, 'migrations', f)),
  ];

  try {
    for (const file of files) {
      console.log(`applying ${path.relative(process.cwd(), file)}`);
      const sql = fs.readFileSync(file, 'utf-8');
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
  console.log('\nMigration complete.');
}

run().catch(fail);
