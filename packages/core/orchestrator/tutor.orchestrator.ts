import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { createDefaultAIProvider } from '../ai-provider/factory';
import { loadLearnerState } from '../learner-model/learner-state.service';
import type { LearnerState } from '../learner-model/types';
import { selectStrategy, selectDifficulty, nextDifficulty, parseStudentCommand } from '../pedagogy/pedagogy.engine';
import type { PedagogyStrategy, PedagogySignal } from '../pedagogy/strategies';
import { buildTutorPrompt, type TutorTurnContext } from '../prompts/tutor.prompt';
import { buildEvaluationPrompt, type EvaluationResult } from '../prompts/evaluation.prompt';
import { selectQuestion } from '../question-engine/selector';
import { gradeAnswer } from '../question-engine/grading';
import { detectMisconception, recordMisconception, MISCONCEPTION_TAXONOMY } from '../misconceptions/taxonomy';
import { updateMastery } from '../mastery/mastery.service';
import { logEvent } from '../analytics/events';
import { getLearningDiagram, type LearningDiagram } from '../learning-diagrams/mapping';

export interface OrchestratorTurnInput {
  studentId: string;
  sessionId: string;
  studentMessage?: string; // free-text turn
  studentAnswer?: { questionId: string; answer: unknown }; // structured answer turn
}

export interface OrchestratorTurnResult {
  tutorMessage: string;
  strategyUsed: PedagogyStrategy;
  evaluation?: { isCorrect: boolean; misconceptionTag?: string };
  updatedMastery?: { skillId: string; score: number };
  nextAction: PedagogyStrategy;
  activeQuestion?: { id: string; prompt: string; questionType: string; options?: unknown };
  diagram?: LearningDiagram; // present when this turn's skill has a teaching diagram (learning-diagrams/mapping.ts) — distinct from a question's own image_url
}

const QUESTION_STRATEGIES: PedagogyStrategy[] = ['GUIDED_PRACTICE', 'INDEPENDENT_TEST', 'CHALLENGE', 'REVIEW'];
const RECENT_MESSAGE_WINDOW = 3;

/**
 * The 15-step orchestration loop (docs/architecture.md §8). Called by
 * /session/message (free-text turn) and /session/answer (structured answer
 * turn) — the only place in the app that calls AIProvider.complete() for
 * tutoring turns, and the only place question_attempts/mastery/misconceptions
 * get written as a result of real tutoring (vs. the diagnostic's own seeding).
 */
export async function runOrchestratorTurn(
  supabase: SupabaseClient,
  input: OrchestratorTurnInput,
  aiProvider: AIProvider = createDefaultAIProvider()
): Promise<OrchestratorTurnResult> {
  const state = await loadLearnerState(supabase, input.studentId);

  // The objective is whatever skill this session was created for — fixed for
  // the session's lifetime, not re-derived from learner state on every turn.
  // Re-deriving it here would let the "current objective" silently drift
  // mid-session if mastery updates changed which skill looks weakest, while
  // learning_sessions.skill_id (which session-summary.service.ts computes
  // before/after mastery against) stayed pointed at the original skill —
  // corrupting the session summary. resolveCurrentObjective() is for
  // /session/start to pick a skill for a NEW session, not for turns within
  // an existing one.
  const { data: sessionRow, error: sessionErr } = await supabase.from('learning_sessions').select('skill_id').eq('id', input.sessionId).single();
  if (sessionErr || !sessionRow) throw sessionErr ?? new Error('session_not_found');
  const objective = { skillId: sessionRow.skill_id };

  // Prerequisite check: a direct prerequisite with mastery < 40 overrides the
  // objective entirely — teaching the current skill on a missing foundation
  // wastes the turn (docs/architecture.md §8, step 4).
  const { data: directPrereqs } = await supabase.from('prerequisites').select('requires_skill_id').eq('skill_id', objective.skillId);
  let hasPrerequisiteGap = false;
  let effectiveSkillId = objective.skillId;
  for (const p of directPrereqs ?? []) {
    const prereqMastery = state.masteryBySkill[p.requires_skill_id];
    if (!prereqMastery || prereqMastery.score < 40) {
      hasPrerequisiteGap = true;
      effectiveSkillId = p.requires_skill_id;
      break;
    }
  }

  const { data: skillRow } = await supabase.from('skills').select('id, name, slug').eq('id', effectiveSkillId).single();
  const skillName = skillRow?.name ?? 'this skill';
  const skillSlug = skillRow?.slug;
  const learningObjectiveText = `Student can ${skillName.toLowerCase()} unaided.`;
  const mastery = state.masteryBySkill[effectiveSkillId];
  const masteryScore = mastery?.score ?? 0;
  const masteryBand = mastery?.band ?? 'needs_foundation';

  const recentMistakesForSkill = state.recentPerformance.last10Attempts.filter((a) => a.skillId === effectiveSkillId && !a.correct);
  const activeMisconceptionEntry = state.misconceptions.find((m) => m.skillId === effectiveSkillId && !m.resolved);
  const consecutiveMissesSameMisconception = activeMisconceptionEntry ? recentMistakesForSkill.length : 0;

  const studentCommand = input.studentMessage ? parseStudentCommand(input.studentMessage) : null;

  const signal: PedagogySignal = {
    hasPrerequisiteGap,
    consecutiveMissesSameMisconception,
    isFirstExposure: !mastery,
    currentMasteryScore: masteryScore,
    studentCommand,
    sessionObjectiveReached: masteryScore >= 90,
    masteredAndDueForReview: masteryScore >= 90 && state.difficultyResponse.trend === 'comfortable',
  };
  const strategy = selectStrategy(signal);
  let difficulty = selectDifficulty({ masteryScore, trend: state.difficultyResponse.trend });
  if (studentCommand === 'easier') difficulty = Math.max(1, difficulty - 1);
  if (studentCommand === 'challenge') difficulty = Math.min(5, difficulty + 1);

  const { data: recentMessages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('session_id', input.sessionId)
    .order('created_at', { ascending: false })
    .limit(RECENT_MESSAGE_WINDOW * 2);
  const lastMessages = (recentMessages ?? [])
    .slice(0, RECENT_MESSAGE_WINDOW)
    .reverse()
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'tutor' | 'student', content: m.content }));

  if (input.studentAnswer) {
    return handleAnswerTurn(supabase, aiProvider, input, {
      state,
      effectiveSkillId,
      skillName,
      skillSlug,
      learningObjectiveText,
      strategy,
      difficulty,
      masteryBand,
      masteryScore,
      lastMessages,
      trend: state.difficultyResponse.trend,
    });
  }

  return handleMessageTurn(supabase, aiProvider, input, {
    strategy,
    difficulty,
    skillName,
    skillSlug,
    learningObjectiveText,
    masteryBand,
    masteryScore,
    activeMisconceptionText: activeMisconceptionEntry ? MISCONCEPTION_TAXONOMY[activeMisconceptionEntry.tag].description : undefined,
    lastMessages,
    effectiveSkillId,
  });
}

async function handleMessageTurn(
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  input: OrchestratorTurnInput,
  ctx: {
    strategy: PedagogyStrategy;
    difficulty: number;
    skillName: string;
    skillSlug?: string;
    learningObjectiveText: string;
    masteryBand: string;
    masteryScore: number;
    activeMisconceptionText?: string;
    lastMessages: TutorTurnContext['lastMessages'];
    effectiveSkillId: string;
  }
): Promise<OrchestratorTurnResult> {
  let questionToPose: TutorTurnContext['questionToPose'];
  let activeQuestion: OrchestratorTurnResult['activeQuestion'];
  const diagram = getLearningDiagram(ctx.skillSlug) ?? undefined;

  if (QUESTION_STRATEGIES.includes(ctx.strategy)) {
    const { data: recentAttempts } = await supabase
      .from('question_attempts')
      .select('question_id')
      .eq('student_id', input.studentId)
      .order('created_at', { ascending: false })
      .limit(5);

    const question = await selectQuestion(supabase, aiProvider, {
      skillId: ctx.effectiveSkillId,
      skillName: ctx.skillName,
      masteryScore: ctx.masteryScore,
      difficulty: ctx.difficulty,
      learningObjective: ctx.learningObjectiveText,
      recentMisconceptions: [],
      recentQuestionIds: (recentAttempts ?? []).map((a) => a.question_id),
    });
    questionToPose = { prompt: question.prompt, options: question.options };
    activeQuestion = { id: question.id, prompt: question.prompt, questionType: question.questionType, options: question.options };
    // New question -> hint count resets (it's tracked per active question, not per session).
    await supabase.from('learning_sessions').update({ active_question_id: question.id, hint_count_for_active_question: 0 }).eq('id', input.sessionId);
  }

  if (ctx.strategy === 'HINT') {
    // Bump the hint counter for whichever question is currently active, so
    // it feeds into question_attempts.hints_used when the student eventually
    // answers — that's what mastery.service.ts's "independent performance"
    // component depends on.
    const { data: session } = await supabase.from('learning_sessions').select('hint_count_for_active_question').eq('id', input.sessionId).single();
    await supabase
      .from('learning_sessions')
      .update({ hint_count_for_active_question: (session?.hint_count_for_active_question ?? 0) + 1 })
      .eq('id', input.sessionId);
  }

  const prompt = buildTutorPrompt({
    skillName: ctx.skillName,
    learningObjective: ctx.learningObjectiveText,
    strategy: ctx.strategy,
    difficulty: ctx.difficulty,
    masteryBand: ctx.masteryBand,
    masteryScore: ctx.masteryScore,
    activeMisconception: ctx.activeMisconceptionText,
    questionToPose,
    diagramCaption: diagram?.caption,
    lastMessages: ctx.lastMessages,
    studentMessage: input.studentMessage ?? '(session just started)',
  });

  const completion = await aiProvider.complete({ systemPrompt: prompt.system, userMessage: prompt.user });

  if (input.studentMessage) {
    await supabase.from('messages').insert({ session_id: input.sessionId, role: 'student', content: input.studentMessage });
  }
  await supabase.from('messages').insert({ session_id: input.sessionId, role: 'tutor', content: completion.text, strategy: ctx.strategy });

  return { tutorMessage: completion.text, strategyUsed: ctx.strategy, nextAction: ctx.strategy, activeQuestion, diagram };
}

async function handleAnswerTurn(
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  input: OrchestratorTurnInput,
  ctx: {
    state: LearnerState;
    effectiveSkillId: string;
    skillName: string;
    skillSlug?: string;
    learningObjectiveText: string;
    strategy: PedagogyStrategy;
    difficulty: number;
    masteryBand: string;
    masteryScore: number;
    lastMessages: TutorTurnContext['lastMessages'];
    trend: LearnerState['difficultyResponse']['trend'];
  }
): Promise<OrchestratorTurnResult> {
  const answer = input.studentAnswer!;
  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('id, skill_id, prompt, question_type, expected_answer, difficulty')
    .eq('id', answer.questionId)
    .single();
  if (qErr || !question) throw qErr ?? new Error('question_not_found');

  let isCorrect: boolean;
  let misconceptionTag: string | undefined;
  let feedbackText: string;

  if (question.question_type === 'step') {
    // Free-text reasoning — deterministic comparison can't grade this, so the
    // evaluation prompt does (docs/architecture.md §11).
    const evalPrompt = buildEvaluationPrompt({ question: question.prompt, expectedAnswer: question.expected_answer, studentAnswer: String(answer.answer) });
    const evalCompletion = await aiProvider.complete({ systemPrompt: evalPrompt.system, userMessage: evalPrompt.user, responseFormat: 'json' });
    let parsed: EvaluationResult;
    try {
      parsed = JSON.parse(evalCompletion.text);
    } catch {
      parsed = { correct: false, misconceptionTag: null, confidence: 0, feedback: 'Could not evaluate automatically — a tutor will follow up.' };
    }
    isCorrect = parsed.correct;
    misconceptionTag = parsed.misconceptionTag ?? undefined;
    feedbackText = parsed.feedback;
  } else {
    isCorrect = gradeAnswer(question.expected_answer, answer.answer);
    feedbackText = isCorrect ? 'Correct.' : 'Not quite — needs another look.';
  }

  let detectedMisconceptionId: string | undefined;
  if (!isCorrect && !misconceptionTag) {
    const detected = await detectMisconception(supabase, aiProvider, {
      questionId: question.id,
      expectedAnswer: question.expected_answer,
      studentAnswer: answer.answer,
      isCorrect,
    });
    if (detected) {
      misconceptionTag = detected.tag;
      detectedMisconceptionId = await recordMisconception(supabase, input.studentId, question.skill_id, detected.tag, detected.confidence);
    }
  } else if (!isCorrect && misconceptionTag && Object.prototype.hasOwnProperty.call(MISCONCEPTION_TAXONOMY, misconceptionTag)) {
    detectedMisconceptionId = await recordMisconception(supabase, input.studentId, question.skill_id, misconceptionTag as any, 0.6);
  } else if (!isCorrect && misconceptionTag) {
    // The evaluation-prompt LLM call returned a tag outside the fixed taxonomy
    // (docs/architecture.md §9) — drop it rather than let an invalid value hit
    // the misconceptions.tag CHECK constraint.
    misconceptionTag = undefined;
  }

  const { data: sessionRow } = await supabase.from('learning_sessions').select('hint_count_for_active_question').eq('id', input.sessionId).single();
  const hintsUsed = sessionRow?.hint_count_for_active_question ?? 0;

  await supabase.from('question_attempts').insert({
    student_id: input.studentId,
    question_id: question.id,
    session_id: input.sessionId,
    answer: answer.answer,
    is_correct: isCorrect,
    hints_used: hintsUsed,
    detected_misconception_id: detectedMisconceptionId ?? null,
  });

  const updatedMastery = await updateMastery(supabase, input.studentId, question.skill_id);

  await logEvent({
    studentId: input.studentId,
    sessionId: input.sessionId,
    eventType: 'question_answered',
    payload: { questionId: question.id, skillId: question.skill_id, isCorrect, misconceptionTag },
  });

  // Recompute the next strategy now that mastery/consecutive-miss state moved.
  const nextSignal: PedagogySignal = {
    hasPrerequisiteGap: false,
    consecutiveMissesSameMisconception: isCorrect ? 0 : 1,
    isFirstExposure: false,
    currentMasteryScore: updatedMastery.score,
    studentCommand: null,
    sessionObjectiveReached: updatedMastery.score >= 90,
    masteredAndDueForReview: false,
  };
  const nextAction = selectStrategy(nextSignal);

  // If the next strategy calls for a question, pose it in this same turn
  // rather than waiting for a separate free-text round trip — this is what
  // makes difficulty adaptation feel immediate rather than only shifting on
  // the next full state reload. nextDifficulty() blends a one-step-up/down
  // response to this specific answer with the mastery-band baseline.
  let questionToPose: TutorTurnContext['questionToPose'];
  let activeQuestion: OrchestratorTurnResult['activeQuestion'];
  let nextTurnDifficulty = ctx.difficulty;
  if (QUESTION_STRATEGIES.includes(nextAction)) {
    nextTurnDifficulty = nextDifficulty({ previousDifficulty: question.difficulty, isCorrect, masteryScore: updatedMastery.score, trend: ctx.trend });
    const { data: recentAttempts } = await supabase
      .from('question_attempts')
      .select('question_id')
      .eq('student_id', input.studentId)
      .order('created_at', { ascending: false })
      .limit(5);
    const nextQuestion = await selectQuestion(supabase, aiProvider, {
      skillId: question.skill_id,
      skillName: ctx.skillName,
      masteryScore: updatedMastery.score,
      difficulty: nextTurnDifficulty,
      learningObjective: ctx.learningObjectiveText,
      recentMisconceptions: misconceptionTag ? [misconceptionTag] : [],
      recentQuestionIds: (recentAttempts ?? []).map((a) => a.question_id),
    });
    questionToPose = { prompt: nextQuestion.prompt, options: nextQuestion.options };
    activeQuestion = { id: nextQuestion.id, prompt: nextQuestion.prompt, questionType: nextQuestion.questionType, options: nextQuestion.options };
  }

  const diagram = getLearningDiagram(ctx.skillSlug) ?? undefined;
  const prompt = buildTutorPrompt({
    skillName: ctx.skillName,
    learningObjective: ctx.learningObjectiveText,
    strategy: nextAction,
    difficulty: nextTurnDifficulty,
    masteryBand: updatedMastery.band,
    masteryScore: updatedMastery.score,
    evaluationFeedback: `${isCorrect ? 'Correct' : 'Incorrect'}. ${feedbackText}`,
    questionToPose,
    diagramCaption: diagram?.caption,
    lastMessages: ctx.lastMessages,
    studentMessage: `(submitted answer: ${JSON.stringify(answer.answer)})`,
  });
  const completion = await aiProvider.complete({ systemPrompt: prompt.system, userMessage: prompt.user });

  await supabase.from('messages').insert({ session_id: input.sessionId, role: 'student', content: `Answer: ${JSON.stringify(answer.answer)}` });
  await supabase.from('messages').insert({ session_id: input.sessionId, role: 'tutor', content: completion.text, strategy: nextAction });
  await supabase
    .from('learning_sessions')
    .update({ active_question_id: activeQuestion?.id ?? null, hint_count_for_active_question: 0 })
    .eq('id', input.sessionId);

  return {
    tutorMessage: completion.text,
    strategyUsed: ctx.strategy,
    evaluation: { isCorrect, misconceptionTag },
    updatedMastery: { skillId: question.skill_id, score: updatedMastery.score },
    nextAction,
    activeQuestion,
    diagram,
  };
}

/**
 * MVP objective resolution: trusts learner-state.service's own resolution
 * (diagnostic-driven or weakest-touched-skill). Kept as a separate exported
 * function so a future override — e.g. explicit student_choice from a
 * "let's work on X instead" request — has a single seam to hook into.
 */
export function resolveCurrentObjective(state: LearnerState): LearnerState['currentObjective'] {
  return state.currentObjective;
}
