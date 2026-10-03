// Turns the handful of failures a first-time setup actually hits into
// plain-language next steps, instead of a raw stack trace. Used by migrate.js,
// seed.js, and seed-diagnostic.js.
//
// Also sets process.exitCode instead of calling process.exit(): on Windows,
// process.exit() while network sockets are still closing can trigger a libuv
// assertion ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING) ...
// src\win\async.c") that buries the real error in noise.

function describeDatabaseUrl(url) {
  // Never prints the password — just enough for the user to spot a wrong
  // host or username at a glance.
  try {
    const u = new URL(url);
    return `${decodeURIComponent(u.username)}@${u.hostname}:${u.port || '5432'}`;
  } catch {
    return '(could not parse DATABASE_URL — if the password contains characters like @ # / ? : % it must be URL-encoded)';
  }
}

function fail(err) {
  const code = err && err.code;

  // supabase-js throws plain objects (not Error instances), and depending on
  // the server's response they can arrive with no message at all — never
  // print "[object Object]".
  let message = err && err.message;
  let emptyApiError = false;
  if (!message) {
    const json = typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err);
    emptyApiError = json === '{}';
    message = emptyApiError ? 'the API returned an empty error' : json;
  }

  console.error(`\nFAILED: ${message}${code ? ` (${code})` : ''}\n`);

  if (code === '28P01') {
    console.error(
      [
        'The password in DATABASE_URL was rejected (or is still a placeholder). Fix, in order of likelihood:',
        '  1. The URL still contains the placeholder, e.g. [YOUR-PASSWORD] — replace it, including the square brackets.',
        '  2. The password has special characters (@ # / ? : % etc). Easiest fix: in Supabase go to',
        '     Project Settings > Database > Reset database password, choose letters and numbers only,',
        '     and paste that into DATABASE_URL.',
        '  3. You reset the password in Supabase but not in apps/web/.env.local.',
        '  Note: the username must be "postgres" for the direct connection string, or "postgres.<project-ref>"',
        '  for the pooler connection string. Copy the whole string from Supabase rather than editing it.',
      ].join('\n')
    );
  } else if (['ENOTFOUND', 'ETIMEDOUT', 'ENETUNREACH', 'EHOSTUNREACH', 'EAI_AGAIN'].includes(code)) {
    console.error(
      [
        'Could not reach the database host. Supabase\'s "Direct connection" string is IPv6-only on newer',
        'projects, and many home networks are IPv4-only. Use the Session pooler string instead:',
        '  Supabase dashboard > Connect > Session pooler > copy that URI into DATABASE_URL.',
      ].join('\n')
    );
  } else if (code === 'ECONNREFUSED') {
    console.error('Nothing is listening at that host/port. Check the host and port in DATABASE_URL / SUPABASE_URL.');
  } else if (code === 'PGRST205') {
    console.error(
      [
        'The tables do not exist yet, so there is nothing to seed. Run this first and make sure it finishes',
        'with "Migration complete.":',
        '  npm run db:migrate',
      ].join('\n')
    );
  } else if (emptyApiError) {
    console.error(
      [
        'The API answered with an empty error. The two usual causes:',
        '  1. The tables do not exist yet — run "npm run db:migrate" and confirm it ends with "Migration complete."',
        '  2. SUPABASE_URL is wrong — it should be your Project URL (https://<ref>.supabase.co) with no trailing path.',
      ].join('\n')
    );
  } else if (/fetch failed/i.test(message)) {
    console.error('Could not reach SUPABASE_URL. Check it is your Project URL (https://<ref>.supabase.co) with no trailing path.');
  }

  if (process.env.DATABASE_URL && (code === '28P01' || code === 'ENOTFOUND' || code === 'ETIMEDOUT')) {
    console.error(`\nConnection attempted as: ${describeDatabaseUrl(process.env.DATABASE_URL)}`);
  }

  process.exitCode = 1;
}

module.exports = { fail, describeDatabaseUrl };
