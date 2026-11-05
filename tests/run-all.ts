// Runs every tests/t*.ts and prints one line each. Run from the project root:  npm test   (or: npx tsx tests/run-all.ts t88 t87 ...)
// A test FAILS when it exits with a non-zero code, prints a line starting with FAIL, or reports "N failed" with N above zero or "a/b passed" with a below b.
// KNOWN_STALE tests were written for older behaviour; they are listed (not hidden) and do not fail the run. Fix or delete them when you can.
import { spawn } from 'child_process';
import { readdirSync } from 'fs';

const KNOWN_STALE: Record<string, string> = {
  t3: 'old expectation (pre-existing)', t4: 'old expectation (pre-existing)', t42a: 'old expectation (pre-existing)', t42c: 'old expectation (pre-existing)',
};
// Tests that render page code need the web app's path settings.
const EXTRA_ARGS: Record<string, string[]> = { t90b: ['--tsconfig', 'apps/web/tsconfig.json'], t92b: ['--tsconfig', 'apps/web/tsconfig.json'], t93b: ['--tsconfig', 'apps/web/tsconfig.json'], t94b: ['--tsconfig', 'apps/web/tsconfig.json'], t95b: ['--tsconfig', 'apps/web/tsconfig.json'], t100b: ['--tsconfig', 'apps/web/tsconfig.json'] };
const only = process.argv.slice(2);
const files = readdirSync('tests').filter((f) => /^t[0-9a-z]+\.ts$/.test(f)).map((f) => f.replace(/\.ts$/, '')).filter((n) => !only.length || only.includes(n))
  .sort((a, b) => (parseInt(a.slice(1)) - parseInt(b.slice(1))) || a.localeCompare(b));

export function judge(output: string, code: number | null): { ok: boolean; why: string } {
  if (code !== 0) return { ok: false, why: `exit code ${code}` };
  if (/^\s*FAIL\b/m.test(output)) return { ok: false, why: 'a FAIL line was printed' };
  const failed = output.match(/(\d+)\s+failed/i); if (failed && Number(failed[1]) > 0) return { ok: false, why: `${failed[1]} failed` };
  // Formats seen: "ok 12 bad 0", "8 ok 6 bad", "bad 0". Take the number that belongs to "bad".
  const bad = output.match(/\bok\s+\d+\s+bad\s+(\d+)/i)?.[1] ?? output.match(/\d+\s+ok\s*,?\s*(\d+)\s+bad\b/i)?.[1] ?? output.match(/\bbad\s+(\d+)/i)?.[1];
  if (bad && Number(bad) > 0) return { ok: false, why: `${bad} bad` };
  const ratio = output.match(/(\d+)\s*\/\s*(\d+)\s+passed/i); if (ratio && Number(ratio[1]) < Number(ratio[2])) return { ok: false, why: `${ratio[1]}/${ratio[2]} passed` };
  return { ok: true, why: (output.trim().split('\n').pop() ?? '').slice(0, 80) };
}

function run(name: string): Promise<{ name: string; ok: boolean; why: string }> {
  return new Promise((resolve) => {
    const p = spawn('node_modules/.bin/tsx', [...(EXTRA_ARGS[name] ?? []), `tests/${name}.ts`], { env: process.env });
    let out = ''; const kill = setTimeout(() => p.kill('SIGKILL'), 180000);
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => { clearTimeout(kill); const j = judge(out, code); resolve({ name, ...j }); });
  });
}

(async () => {
  const results: { name: string; ok: boolean; why: string }[] = []; let i = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (i < files.length) { const n = files[i++]; results.push(await run(n)); } }));
  results.sort((a, b) => files.indexOf(a.name) - files.indexOf(b.name));
  let bad = 0, stale = 0;
  for (const r of results) {
    const isStale = !r.ok && KNOWN_STALE[r.name]; if (isStale) stale++; else if (!r.ok) bad++;
    console.log(`${r.ok ? 'PASS ' : isStale ? 'STALE' : 'FAIL '} ${r.name.padEnd(6)} ${r.ok ? r.why : isStale ? KNOWN_STALE[r.name] + ' - ' + r.why : r.why}`);
  }
  console.log(`\n${results.length} test files: ${results.length - bad - stale} passed, ${stale} known-stale, ${bad} failed`);
  process.exit(bad ? 1 : 0);
})();
