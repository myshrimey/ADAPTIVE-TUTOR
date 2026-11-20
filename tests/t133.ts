// t133: the lesson turn reads its independent data together instead of one query after another (v133 speed work).
import { readFileSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const ls = R('packages/core/learner-model/learner-state.service.ts');
ok(/await Promise\.all\(\[\s*supabase\s*\.from\('students'\)/.test(ls), 'learner state reads start together');
for (const t of ['students', 'learning_goals', 'learning_profiles', 'mastery_states', 'misconceptions', 'question_attempts', 'learning_sessions']) ok(new RegExp(`\\.from\\('${t}'\\)`).test(ls.slice(0, ls.indexOf('student_not_found'))), `${t} is read inside the parallel group`);
ok(/if \(studentErr \|\| !student\) throw new Error\(`student_not_found/.test(ls), 'a missing student still stops the turn');
const o = R('packages/core/orchestrator/tutor.orchestrator.ts');
const head = o.slice(o.indexOf('export async function runOrchestratorTurn'), o.indexOf('const objective = { skillId'));
ok(/await Promise\.all\(\[/.test(head), 'orchestrator pre-turn reads start together');
for (const t of ['learning_sessions', 'question_attempts', 'recovery_events', 'messages']) ok(new RegExp(`\\.from\\('${t}'\\)`).test(head), `${t} read is in the parallel group`);
ok(/getSessionCheckin\(supabase, input\.sessionId\)/.test(head) && /loadLearnerState\(supabase, input\.studentId\)/.test(head), 'state and check-in are in the parallel group');
ok(/if \(sessionErr \|\| !sessionRow\) throw/.test(o), 'a missing session still stops the turn');
// the reads only: no write is inside the parallel group
ok(!/\.(insert|update|upsert|delete)\(/.test(head), 'no write inside the parallel group');
// recovery-event writes still come after the reads
ok(o.indexOf("from('recovery_events').insert") > o.indexOf('eventsRes'), 'recovery writes stay after the reads');
console.log(`t133: ${n - f}/${n} passed`); if (f) process.exit(1);
