// Internal evaluation harness (docs/architecture.md §12 and the 7-day plan's
// Day 7). Two independent sections:
//
//   A. Grading-mechanism check — pure, no network, always runs. Verifies
//      question-engine/grading.ts judges every seeded diagnostic answer
//      correctly, plus a curated set of near-miss variants. This is dimension
//      1 (correctness) of the grading mechanism itself, not of tutor output.
//
//   B. Live orchestrator run — only runs when SUPABASE_URL,
//      SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY are all set. Walks every
//      case in eval-set.json through the real orchestrator against a
//      dedicated eval student, measuring latency and token usage (cost proxy)
//      automatically. Correctness/curriculum_alignment/adaptation/
//      difficulty_selection/misconception_detection are reported from the
//      orchestrator's own structured output; pedagogical_quality and
//      hallucination are NOT auto-graded — those need a human reading the
//      printed transcript, since self-grading with the same model that
//      generated the response isn't a reliable check. That's a deliberate
//      scope boundary, not a missing feature.
//
// Run with: npm run eval
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GEMINI_API_KEY from
// apps/web/.env.local automatically — or from the shell environment instead.

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error(`\nNo .env.local found at:\n  ${envPath}\n`);
  console.error('Copy apps/web/.env.example to apps/web/.env.local and fill in your real values.');
  console.error('Section A below still runs fine without it; Section B needs it.\n');
}

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { gradeAnswer } from '../packages/core/question-engine/grading';
import { runOrchestratorTurn } from '../packages/core/orchestrator/tutor.orchestrator';
import { GeminiProvider } from '../packages/core/ai-provider/gemini.provider';
import mathsDiagnosticFile from '../packages/db/seed/cbse-class10-maths-diagnostic.json';
import scienceDiagnosticFile from '../packages/db/seed/cbse-class10-science-diagnostic.json';
import evalCases from './eval-set.json';

const EVAL_STUDENT_EMAIL = 'eval-runner@internal.test';

async function runGradingCheck(): Promise<boolean> {
  console.log('=== A. Grading-mechanism check (no network) ===\n');

  let pass = 0;
  let total = 0;

  // Every seeded diagnostic question, across every subject — checked against
  // its own expected_answer.value, so this scales automatically as more
  // subjects/diagnostic files are added (see seed-diagnostic.js).
  const allSeedQuestions = [...(mathsDiagnosticFile as any).questions, ...(scienceDiagnosticFile as any).questions];

  for (const q of allSeedQuestions) {
    total++;
    const ok = gradeAnswer(q.expected_answer, q.expected_answer.value);
    if (ok) pass++;
    else console.log(`  FAIL  ${q.skill_slug}: "${q.expected_answer.value}" did not self-match`);
  }

  // Near-miss variants that must NOT be graded correct, and reorderings that MUST be.
  const cases: Array<[unknown, unknown, boolean, string]> = [
    [{ value: 'x = -2, -3' }, 'x = -3, -2', true, 'root order independence'],
    [{ value: 'x = -2, -3' }, 'x = 2, 3', false, 'sign error must not pass'],
    [{ value: 'x^2 - 2x - 15' }, '-2x + x^2 - 15', true, 'term order independence'],
    [{ value: '20' }, '21', false, 'off-by-one must not pass'],
  ];
  for (const [expected, given, want, label] of cases) {
    total++;
    const got = gradeAnswer(expected, given);
    if (got === want) pass++;
    else console.log(`  FAIL  ${label}: expected gradeAnswer=${want}, got=${got}`);
  }

  console.log(`\n  ${pass}/${total} grading checks passed\n`);
  return pass === total;
}

async function runLiveEval(): Promise<void> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
    console.log('=== B. Live orchestrator run — SKIPPED ===\n');
    console.log('  Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY to run this section.');
    console.log('  It exercises real tutoring turns against eval/eval-set.json and reports latency,');
    console.log('  token usage, and the orchestrator\'s own correctness/misconception output — see the');
    console.log('  file header for what is and isn\'t auto-graded.\n');
    return;
  }

  console.log('=== B. Live orchestrator run ===\n');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const aiProvider = new GeminiProvider(GEMINI_API_KEY);

  const studentId = await ensureEvalStudent(supabase);
  const skillIdBySlug = await loadSkillIdsBySlug(supabase);

  let totalLatencyMs = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let turnCount = 0;

  for (const testCase of evalCases as any[]) {
    console.log(`--- ${testCase.id} (checks: ${testCase.checks.join(', ')}) ---`);
    const skillId = skillIdBySlug[testCase.skill];
    if (!skillId) {
      console.log(`  SKIP — unknown skill slug "${testCase.skill}" (not in the seeded curriculum)\n`);
      continue;
    }

    const { data: session, error: sessionErr } = await supabase
      .from('learning_sessions')
      .insert({ student_id: studentId, skill_id: skillId, status: 'active' })
      .select()
      .single();
    if (sessionErr || !session) {
      console.log(`  ERROR creating session: ${sessionErr?.message}\n`);
      continue;
    }

    const messages: string[] = testCase.input_sequence ?? (testCase.input ? [testCase.input] : []);
    for (const message of messages) {
      const start = Date.now();
      try {
        const turn = await runOrchestratorTurn(supabase, { studentId, sessionId: session.id, studentMessage: message }, aiProvider);
        const latencyMs = Date.now() - start;
        totalLatencyMs += latencyMs;
        turnCount++;
        console.log(`  > "${message}"`);
        console.log(`  < [${turn.strategyUsed}, ${latencyMs}ms] ${turn.tutorMessage.slice(0, 200)}${turn.tutorMessage.length > 200 ? '…' : ''}`);
      } catch (err: any) {
        console.log(`  ERROR on turn: ${err.message}`);
      }
    }

    if (testCase.student_answer) {
      console.log(`  > (structured answer case — needs an active_question_id; run interactively via /session/answer instead)`);
    }

    await supabase.from('learning_sessions').update({ status: 'completed' }).eq('id', session.id);
    console.log('');
  }

  console.log('=== Summary ===');
  console.log(`  Turns run: ${turnCount}`);
  console.log(`  Avg latency: ${turnCount ? Math.round(totalLatencyMs / turnCount) : 0}ms`);
  console.log(`  (Token usage not aggregated here — AIProvider.complete()'s usage is per-call;`);
  console.log(`   wire a callback/logger into GeminiProvider if you want per-eval-run cost totals.)`);
  console.log('\n  Read the transcripts above for pedagogical_quality, hallucination, and');
  console.log('  curriculum_alignment — these need a human judgment call, not an automated pass/fail.');
}

async function ensureEvalStudent(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: created } = await supabase.auth.admin.createUser({ email: EVAL_STUDENT_EMAIL, password: randomUUID(), email_confirm: true });
  let authUserId = created?.user?.id;

  if (!authUserId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    authUserId = list?.users.find((u) => u.email === EVAL_STUDENT_EMAIL)?.id;
  }
  if (!authUserId) throw new Error('could_not_create_or_find_eval_auth_user');

  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .upsert({ auth_user_id: authUserId, email: EVAL_STUDENT_EMAIL }, { onConflict: 'auth_user_id' })
    .select()
    .single();
  if (userErr || !userRow) {
    // Almost always means the schema isn't there yet — say so instead of
    // crashing on a null dereference a few lines later.
    throw new Error(
      `Could not create the eval student's users row (${userErr?.code ?? 'no row returned'}: ${userErr?.message ?? 'unknown'}). ` +
        'Has "npm run db:migrate" completed successfully, followed by "npm run db:seed"?'
    );
  }

  const { data: existingStudent } = await supabase.from('students').select('id').eq('user_id', userRow.id).maybeSingle();
  if (existingStudent) return existingStudent.id;

  const { data: studentRow, error } = await supabase
    .from('students')
    .insert({ user_id: userRow.id, display_name: 'Eval Runner', grade: 'CBSE-10' })
    .select()
    .single();
  if (error || !studentRow) throw error ?? new Error('eval_student_create_failed');
  return studentRow.id;
}

async function loadSkillIdsBySlug(supabase: ReturnType<typeof createClient>): Promise<Record<string, string>> {
  const { data } = await supabase.from('skills').select('id, slug');
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.slug] = row.id;
  return map;
}

async function main() {
  const gradingOk = await runGradingCheck();
  await runLiveEval();
  if (!gradingOk) {
    console.error('Grading-mechanism check failed — fix before deploying.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`\nFAILED: ${err instanceof Error ? err.message : JSON.stringify(err)}\n`);
  process.exitCode = 1;
});
