import { createClient } from '@supabase/supabase-js';
import { startDiagnostic, answerDiagnosticQuestion } from '../packages/core/diagnostic/engine';
import { loadCurriculum } from '../packages/core/curriculum/curriculum.service';

// A fresh student, so this diagnostic attempt is independent of the earlier test run.
const STUDENT_ID = '44444444-4444-4444-4444-444444444444';

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // The test student is created directly via SQL before this script runs
  // (see local-dev/README.md) — this script only exercises packages/core.

  const curriculum = await loadCurriculum(supabase, 'CBSE', '10');
  const mathsSubject = curriculum.subjects.find((s) => s.name === 'Mathematics')!;

  const { attemptId, firstQuestion } = await startDiagnostic(supabase, STUDENT_ID, mathsSubject.id);

  let currentQuestion = firstQuestion;
  let turnCount = 0;
  let planLengthAfterEachTurn: number[] = [];

  while (true) {
    turnCount++;
    const { data: qRow } = await supabase.from('diagnostic_questions').select('skill_id, expected_answer').eq('id', currentQuestion.id).single();

    // Deliberately answer the Circles chapter's anchor wrong (it's the 10th
    // anchor — "apply-tangent-perpendicular-property" — whose prerequisite
    // "apply-pythagoras-theorem" has its own diagnostic question and is NOT
    // itself an anchor, so this is the one path that should genuinely insert
    // an extra question rather than skip it as already-covered.
    const { data: skillRow } = await supabase.from('skills').select('slug').eq('id', qRow!.skill_id).single();
    const answerWrong = skillRow!.slug === 'apply-tangent-perpendicular-property';
    const answer = answerWrong ? 'wrong-answer' : (qRow!.expected_answer as any).value;

    const result = await answerDiagnosticQuestion(supabase, { attemptId, questionId: currentQuestion.id, answer });

    if (answerWrong) {
      console.log(`Turn ${turnCount}: deliberately missed "${skillRow!.slug}" (Circles anchor) to trigger prerequisite insertion`);
    }

    if ('completed' in result) {
      console.log(`\nDiagnostic completed after ${turnCount} questions (14 anchors + insertions)`);
      console.log(`Prerequisite gaps detected: ${JSON.stringify(result.result.prerequisiteGaps)}`);
      break;
    }
    currentQuestion = result.nextQuestion;
    if (turnCount > 20) { console.log('SAFETY STOP'); break; }
  }

  // Fetch the skill slug of every question actually asked in this attempt, to
  // directly confirm apply-pythagoras-theorem's question was inserted.
  const { data: answers } = await supabase
    .from('diagnostic_answers')
    .select('diagnostic_questions(skill_id)')
    .eq('diagnostic_attempt_id', attemptId);
  const skillIds = (answers ?? []).map((a: any) => a.diagnostic_questions.skill_id);
  const { data: skillRows } = await supabase.from('skills').select('id, slug').in('id', skillIds);
  const slugsAsked = (skillRows ?? []).map((s) => s.slug);

  console.log(`\nTotal questions asked: ${slugsAsked.length} (14 anchors expected + insertions)`);
  console.log(`Was apply-pythagoras-theorem's question inserted? ${slugsAsked.includes('apply-pythagoras-theorem')}`);
  console.log(`\n=== ${slugsAsked.length > 14 && slugsAsked.includes('apply-pythagoras-theorem') ? 'ADAPTIVE INSERTION CONFIRMED WORKING' : 'INSERTION DID NOT FIRE — NEEDS INVESTIGATION'} ===`);
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
