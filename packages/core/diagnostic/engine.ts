import type { SupabaseClient } from '@supabase/supabase-js';
import { logEvent } from '../analytics/events';
import { computeMasteryScore, bandForScore, RETENTION_DEFAULT_SCORE } from '../mastery/types';
import { gradeAnswer } from '../question-engine/grading';

export interface DiagnosticQuestionView {
  id: string;
  skillId: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  options: unknown;
  difficulty: number;
}

export interface DiagnosticResult {
  attemptId: string;
  strengths: string[];
  weakSkills: string[];
  prerequisiteGaps: string[];
  possibleMisconceptions: Array<{ tag: string; skillId: string; confidence: number }>;
  recommendedStartingSkillId: string;
}

interface DiagnosticPlanState {
  plan: string[]; // diagnostic_question ids, in order; adaptive insertions splice into this
  answers: Array<{ questionId: string; skillId: string; correct: boolean }>;
  insertedForSkill: Record<string, boolean>; // anchor skillId -> already inserted a prereq check for it
}

const MAX_QUESTIONS = 15;
const PREFERRED_DIFFICULTY = 3;

/**
 * Builds the anchor question plan — one diagnostic question per topic, walked
 * in curriculum order (docs/architecture.md §4: ~8-15 questions) — and creates
 * the diagnostic_attempts row. This plan is the "happy path" if every anchor is
 * answered correctly; a miss triggers an adaptive prerequisite-check insertion
 * in answerDiagnosticQuestion, not here.
 */
export async function startDiagnostic(
  supabase: SupabaseClient,
  studentId: string,
  subjectId: string
): Promise<{ attemptId: string; firstQuestion: DiagnosticQuestionView }> {
  const { data: test, error: testErr } = await supabase
    .from('diagnostic_tests')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .limit(1)
    .single();
  if (testErr || !test) throw new Error('no_active_diagnostic_test');

  const anchorSkillIds = await getAnchorSkillIds(supabase, subjectId);

  const plan: string[] = [];
  for (const skillId of anchorSkillIds) {
    const q = await pickQuestionForSkill(supabase, test.id, skillId);
    if (q) plan.push(q.id);
    if (plan.length >= MAX_QUESTIONS) break;
  }
  if (plan.length === 0) throw new Error('no_diagnostic_questions_available');

  const state: DiagnosticPlanState = { plan, answers: [], insertedForSkill: {} };

  const { data: attempt, error: attemptErr } = await supabase
    .from('diagnostic_attempts')
    .insert({ student_id: studentId, diagnostic_test_id: test.id, status: 'in_progress', result: state })
    .select()
    .single();
  if (attemptErr || !attempt) throw attemptErr ?? new Error('attempt_create_failed');

  await logEvent({ studentId, eventType: 'diagnostic_started', payload: { attemptId: attempt.id } });

  const firstQuestion = await loadQuestionView(supabase, plan[0]);
  return { attemptId: attempt.id, firstQuestion };
}

/**
 * Records the answer, adaptively inserts a prerequisite-check question when the
 * student misses one (once per anchor skill, capped by MAX_QUESTIONS), and
 * either returns the next question or — once the plan is exhausted — finalizes
 * the diagnostic result and seeds initial mastery_states from it.
 */
export async function answerDiagnosticQuestion(
  supabase: SupabaseClient,
  params: { attemptId: string; questionId: string; answer: unknown }
): Promise<{ nextQuestion: DiagnosticQuestionView } | { completed: true; result: DiagnosticResult }> {
  const { data: attempt, error: attemptErr } = await supabase
    .from('diagnostic_attempts')
    .select('id, student_id, diagnostic_test_id, status, result')
    .eq('id', params.attemptId)
    .single();
  if (attemptErr || !attempt) throw attemptErr ?? new Error('attempt_not_found');
  if (attempt.status !== 'in_progress') throw new Error('attempt_not_in_progress');

  const { data: question, error: qErr } = await supabase
    .from('diagnostic_questions')
    .select('id, skill_id, expected_answer')
    .eq('id', params.questionId)
    .single();
  if (qErr || !question) throw qErr ?? new Error('question_not_found');

  const isCorrect = gradeAnswer(question.expected_answer, params.answer);

  await supabase.from('diagnostic_answers').insert({
    diagnostic_attempt_id: attempt.id,
    diagnostic_question_id: question.id,
    answer: params.answer,
    is_correct: isCorrect,
  });

  const state = attempt.result as DiagnosticPlanState;
  state.answers.push({ questionId: question.id, skillId: question.skill_id, correct: isCorrect });

  if (!isCorrect && !state.insertedForSkill[question.skill_id] && state.plan.length < MAX_QUESTIONS) {
    const prereqQuestion = await pickPrerequisiteCheckQuestion(supabase, attempt.diagnostic_test_id, question.skill_id, state.plan);
    if (prereqQuestion) {
      const currentIndex = state.plan.indexOf(question.id);
      state.plan.splice(currentIndex + 1, 0, prereqQuestion.id);
      state.insertedForSkill[question.skill_id] = true;
    }
  }

  const currentIndex = state.plan.indexOf(question.id);
  const nextQuestionId = state.plan[currentIndex + 1];

  if (nextQuestionId) {
    await supabase.from('diagnostic_attempts').update({ result: state }).eq('id', attempt.id);
    const nextQuestion = await loadQuestionView(supabase, nextQuestionId);
    return { nextQuestion };
  }

  const result = await finalizeDiagnostic(supabase, attempt.id, attempt.student_id, state);
  return { completed: true, result };
}

/**
 * One anchor question per CHAPTER (the first skill of the chapter's first
 * topic), not per topic. This was a deliberate change from the original
 * 4-chapter pilot, which anchored one question per topic — that scaled fine
 * at 12 topics but would blow well past the "~8-15 questions" target
 * (docs/architecture.md §4) as more chapters and subjects get added, since
 * topic count grows faster than chapter count. Chapter-level anchoring keeps
 * the diagnostic's length roughly proportional to how many chapters exist,
 * which is what stays true as content scales — topic-level granularity
 * within a chapter still gets assessed properly during real tutoring
 * sessions via the question bank, just not during the initial triage.
 */
async function getAnchorSkillIds(supabase: SupabaseClient, subjectId: string): Promise<string[]> {
  const { data: chapters, error: chErr } = await supabase
    .from('chapters')
    .select('id, sequence, topics(id, sequence, skills(id))')
    .eq('subject_id', subjectId);
  if (chErr) throw chErr;

  const anchors: string[] = [];
  const sortedChapters = [...(chapters ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
  for (const chapter of sortedChapters as any[]) {
    const topics = [...(chapter.topics ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
    const firstTopic = topics[0];
    const firstSkill = firstTopic?.skills?.[0];
    if (firstSkill) anchors.push(firstSkill.id);
  }
  return anchors;
}

async function pickQuestionForSkill(supabase: SupabaseClient, testId: string, skillId: string) {
  const { data } = await supabase
    .from('diagnostic_questions')
    .select('id, difficulty')
    .eq('diagnostic_test_id', testId)
    .eq('skill_id', skillId)
    .order('difficulty', { ascending: true });
  if (!data || data.length === 0) return null;
  return data.find((q) => q.difficulty === PREFERRED_DIFFICULTY) ?? data[0];
}

async function pickPrerequisiteCheckQuestion(supabase: SupabaseClient, testId: string, skillId: string, existingPlan: string[]) {
  const { data: prereqs } = await supabase.from('prerequisites').select('requires_skill_id').eq('skill_id', skillId);
  for (const p of prereqs ?? []) {
    const q = await pickQuestionForSkill(supabase, testId, p.requires_skill_id);
    // Skip if this prerequisite's question is already in the plan — its own
    // anchor slot already covers it, no need to test it twice.
    if (q && !existingPlan.includes(q.id)) return q;
  }
  return null;
}

async function loadQuestionView(supabase: SupabaseClient, questionId: string): Promise<DiagnosticQuestionView> {
  const { data, error } = await supabase
    .from('diagnostic_questions')
    .select('id, skill_id, prompt, question_type, options, difficulty')
    .eq('id', questionId)
    .single();
  if (error || !data) throw error ?? new Error('question_not_found');
  return { id: data.id, skillId: data.skill_id, prompt: data.prompt, questionType: data.question_type, options: data.options, difficulty: data.difficulty };
}

// (grading now shared via ../question-engine/grading.ts)

async function finalizeDiagnostic(
  supabase: SupabaseClient,
  attemptId: string,
  studentId: string,
  state: DiagnosticPlanState
): Promise<DiagnosticResult> {
  const strengths = [...new Set(state.answers.filter((a) => a.correct).map((a) => a.skillId))];
  const missedSkillIds = [...new Set(state.answers.filter((a) => !a.correct).map((a) => a.skillId))];

  // A missed skill counts as a prerequisite gap if something else that was
  // also missed depends on it — i.e. it looks like the root cause, not just
  // a symptom of the same underlying gap.
  const prerequisiteGaps: string[] = [];
  for (const skillId of missedSkillIds) {
    const { data: dependents } = await supabase.from('prerequisites').select('skill_id').eq('requires_skill_id', skillId);
    const dependentAlsoMissed = (dependents ?? []).some((d) => missedSkillIds.includes(d.skill_id));
    if (dependentAlsoMissed) prerequisiteGaps.push(skillId);
  }
  const weakSkills = missedSkillIds.filter((s) => !prerequisiteGaps.includes(s));

  const recommendedStartingSkillId = prerequisiteGaps[0] ?? weakSkills[0] ?? strengths[strengths.length - 1] ?? state.answers[0]?.skillId ?? '';

  const result: DiagnosticResult = {
    attemptId,
    strengths,
    weakSkills,
    prerequisiteGaps,
    possibleMisconceptions: [], // pattern-based detection is Day 5 (misconceptions/taxonomy.ts)
    recommendedStartingSkillId,
  };

  await supabase.from('diagnostic_attempts').update({ status: 'completed', completed_at: new Date().toISOString(), result }).eq('id', attemptId);

  await seedMasteryFromDiagnostic(supabase, studentId, state.answers);

  await logEvent({ studentId, eventType: 'diagnostic_completed', payload: { attemptId } });

  return result;
}

/**
 * Seeds a coarse initial mastery_states row per skill the diagnostic touched
 * (correct -> ~developing, incorrect -> ~needs_foundation), so the learner
 * model has something to work with immediately. mastery.service.ts's
 * updateMastery() refines these as soon as real question_attempts exist —
 * these are deliberately not treated as authoritative history.
 */
async function seedMasteryFromDiagnostic(supabase: SupabaseClient, studentId: string, answers: DiagnosticPlanState['answers']): Promise<void> {
  const bySkill = new Map<string, boolean[]>();
  for (const a of answers) {
    if (!bySkill.has(a.skillId)) bySkill.set(a.skillId, []);
    bySkill.get(a.skillId)!.push(a.correct);
  }

  for (const [skillId, results] of bySkill) {
    const accuracy = (results.filter(Boolean).length / results.length) * 100;
    const components = {
      recentAccuracy: accuracy,
      applicationPerformance: accuracy,
      consistency: 100,
      independentPerformance: accuracy,
      retention: RETENTION_DEFAULT_SCORE,
    };
    const score = computeMasteryScore(components);
    await supabase.from('mastery_states').upsert(
      { student_id: studentId, skill_id: skillId, score, band: bandForScore(score), component_scores: components, updated_at: new Date().toISOString() },
      { onConflict: 'student_id,skill_id' }
    );
  }
}
