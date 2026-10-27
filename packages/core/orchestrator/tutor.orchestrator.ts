import { inputKindOf, type InputKind } from '../answers/input';
import { loadLangPrefs } from '../boards/language-store';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { createDefaultAIProvider } from '../ai-provider/factory';
import { loadLearnerState } from '../learner-model/learner-state.service';
import type { LearnerState } from '../learner-model/types';
import { scaffoldNote } from '../pedagogy/scaffold';
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
import { getSessionCheckin } from '../checkins/checkin.service';
import { planSession, shouldTriggerRecovery } from '../pedagogy/session-plan';

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
  activeQuestion?: { id: string; prompt: string; questionType: string; options?: unknown; figureUrl?: string | null; figureCaption?: string | null; inputKind?: InputKind };
  plan?: { done: number; target: number | null; finalQuestion: boolean; finished: boolean; gentler: boolean };
  diagram?: LearningDiagram; // present when this turn's skill has a teaching diagram (learning-diagrams/mapping.ts) — distinct from a question's own image_url
}

interface SessionPlanInfo { done: number; target: number | null; gentler: boolean; perfRecoveryLogged: boolean; history: { correct: boolean; hints: number }[] }

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

  const { data: skillRow } = await supabase
    .from('skills')
    .select('id, name, slug, topics(chapters(subjects(name)))')
    .eq('id', effectiveSkillId)
    .single();
  const skillName = skillRow?.name ?? 'this skill';
  const skillSlug = skillRow?.slug;
  // Nested Supabase join (skill -> topic -> chapter -> subject) so a
  // question generated for this skill is asked for the right subject
  // ("Mathematics" vs "Science") rather than a hardcoded guess — see
  // question-engine/ai-question-generator.ts.
  const subjectName = (skillRow as any)?.topics?.chapters?.subjects?.name ?? 'Mathematics';
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
  let strategy = selectStrategy(signal);
  let difficulty = selectDifficulty({ masteryScore, trend: state.difficultyResponse.trend });
  if (studentCommand === 'easier') difficulty = Math.max(1, difficulty - 1);
  if (studentCommand === 'challenge') difficulty = Math.min(5, difficulty + 1);

  // Session adaptation (master prompt §18-19). What the student told us before the session
  // (time available, goal) sets how long it runs; a hard day (check-in) or a run of misses
  // (performance) makes the next few questions one step easier. None of this touches stored
  // mastery: it only changes what is asked and how long today's session is.
  const checkin = await getSessionCheckin(supabase, input.sessionId);
  const { data: sessionAttempts } = await supabase
    .from('question_attempts')
    .select('is_correct, hints_used')
    .eq('session_id', input.sessionId)
    .order('created_at', { ascending: true });
  const attemptsDone = (sessionAttempts ?? []).length;
  const history = (sessionAttempts ?? []).map((a: any) => ({ correct: !!a.is_correct, hints: a.hints_used ?? 0 }));

  const { data: events } = await supabase.from('recovery_events').select('trigger, details').eq('session_id', input.sessionId);
  let selfEvent = (events ?? []).find((e: any) => e.trigger === 'self_report');
  let perfEvent = (events ?? []).find((e: any) => e.trigger === 'performance');
  if (checkin?.recoveryMode && !selfEvent) {
    await supabase.from('recovery_events').insert({ student_id: input.studentId, session_id: input.sessionId, trigger: 'self_report', details: { attemptsAtTrigger: attemptsDone } });
    selfEvent = { trigger: 'self_report', details: { attemptsAtTrigger: attemptsDone } };
  }
  if (!perfEvent && attemptsDone >= 2 && shouldTriggerRecovery(history)) {
    await supabase.from('recovery_events').insert({ student_id: input.studentId, session_id: input.sessionId, trigger: 'performance', details: { attemptsAtTrigger: attemptsDone } });
    perfEvent = { trigger: 'performance', details: { attemptsAtTrigger: attemptsDone } };
  }
  const activeSince = (e: any) => attemptsDone - Number(e?.details?.attemptsAtTrigger ?? 0) < 3;
  const gentler = (!!selfEvent && activeSince(selfEvent)) || (!!perfEvent && activeSince(perfEvent));
  if (gentler) difficulty = Math.max(1, difficulty - 1);

  const plan = planSession({ availableMinutes: checkin?.availableMinutes ?? null, goal: checkin?.sessionGoal ?? null, recoveryMode: !!selfEvent || !!perfEvent });
  // Goal shapes the kind of work: revising is gentler, testing yourself is independent.
  if (checkin?.sessionGoal === 'revise') difficulty = Math.max(1, difficulty - 1);
  let strategyOverride: PedagogyStrategy | null = null;
  if (checkin?.sessionGoal === 'test_myself' && strategy === 'GUIDED_PRACTICE' && masteryScore >= 40) strategyOverride = 'INDEPENDENT_TEST';
  if (strategyOverride) strategy = strategyOverride;
  const sessionPlan = { done: attemptsDone, target: plan.targetQuestions, gentler, perfRecoveryLogged: !!perfEvent, history };
  // Maths (Basic): same syllabus, easier questions — never above difficulty 3.
  if (/\(Basic\)/i.test(subjectName)) difficulty = Math.min(3, difficulty);

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
      subjectName,
      learningObjectiveText,
      strategy,
      difficulty,
      masteryBand,
      masteryScore,
      lastMessages,
      trend: state.difficultyResponse.trend,
      sessionPlan,
    });
  }

  return handleMessageTurn(supabase, aiProvider, input, {
    strategy,
    difficulty,
    skillName,
    skillSlug,
    subjectName,
    learningObjectiveText,
    masteryBand,
    masteryScore,
    activeMisconceptionText: activeMisconceptionEntry ? MISCONCEPTION_TAXONOMY[activeMisconceptionEntry.tag].description : undefined,
    lastMessages,
    effectiveSkillId,
    sessionPlan,
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
    subjectName: string;
    learningObjectiveText: string;
    masteryBand: string;
    masteryScore: number;
    activeMisconceptionText?: string;
    lastMessages: TutorTurnContext['lastMessages'];
    effectiveSkillId: string;
    sessionPlan: SessionPlanInfo;
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
      subjectName: ctx.subjectName,
      masteryScore: ctx.masteryScore,
      difficulty: ctx.difficulty,
      learningObjective: ctx.learningObjectiveText,
      recentMisconceptions: [],
      recentQuestionIds: (recentAttempts ?? []).map((a) => a.question_id),
    });
    questionToPose = { prompt: question.prompt, options: question.options };
    activeQuestion = {
      id: question.id,
      prompt: question.prompt,
      questionType: question.questionType,
      options: question.options,
      figureUrl: question.figureUrl,
      figureCaption: question.figureCaption,
      inputKind: inputKindOf(question.questionType, question.expectedAnswer),
    };
    // New question -> hint count resets (it's tracked per active question, not per session).
    await supabase.from('learning_sessions').update({ active_question_id: question.id, hint_count_for_active_question: 0, active_question_posed_at: new Date().toISOString() }).eq('id', input.sessionId);
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

  const replyLanguage = (await loadLangPrefs(supabase, input.studentId)).learning;
  const prompt = buildTutorPrompt({
    replyLanguage,
    skillName: ctx.skillName,
    learningObjective: ctx.learningObjectiveText,
    strategy: ctx.strategy,
    difficulty: ctx.difficulty,
    masteryBand: ctx.masteryBand,
    masteryScore: ctx.masteryScore,
    activeMisconception: ctx.activeMisconceptionText,
    questionToPose,
    diagramCaption: diagram?.caption,
    scaffoldNote: scaffoldNote({ masteryScore: ctx.masteryScore, history: ctx.sessionPlan.history, strategy: ctx.strategy, firstExposure: ctx.masteryScore === 0 && ctx.sessionPlan.history.length === 0 }),
    sessionNote: ctx.sessionPlan.gentler ? 'Keep this turn calm and encouraging; take smaller steps.' : undefined,
    lastMessages: ctx.lastMessages,
    studentMessage: input.studentMessage ?? '(session just started)',
  });

  const completion = await aiProvider.complete({ systemPrompt: prompt.system, userMessage: prompt.user, feature: 'tutor' });

  if (input.studentMessage) {
    await supabase.from('messages').insert({ session_id: input.sessionId, role: 'student', content: input.studentMessage });
  }
  await supabase.from('messages').insert({ session_id: input.sessionId, role: 'tutor', content: completion.text, strategy: ctx.strategy });

  return {
    tutorMessage: completion.text,
    strategyUsed: ctx.strategy,
    nextAction: ctx.strategy,
    activeQuestion,
    diagram,
    plan: { done: ctx.sessionPlan.done, target: ctx.sessionPlan.target, finalQuestion: false, finished: false, gentler: ctx.sessionPlan.gentler },
  };
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
    subjectName: string;
    learningObjectiveText: string;
    strategy: PedagogyStrategy;
    difficulty: number;
    masteryBand: string;
    masteryScore: number;
    lastMessages: TutorTurnContext['lastMessages'];
    trend: LearnerState['difficultyResponse']['trend'];
    sessionPlan: SessionPlanInfo;
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
    const evalCompletion = await aiProvider.complete({ systemPrompt: evalPrompt.system, userMessage: evalPrompt.user, responseFormat: 'json', feature: 'evaluation' });
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
      subjectName: ctx.subjectName,
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

  const { data: sessionRow } = await supabase.from('learning_sessions').select('hint_count_for_active_question, active_question_posed_at').eq('id', input.sessionId).single();
  const hintsUsed = sessionRow?.hint_count_for_active_question ?? 0;
  // Answer time is measured on the server (question shown -> answer received), capped at 30 minutes.
  let timeTaken: number | null = null;
  if (sessionRow?.active_question_posed_at) {
    const secs = Math.round((Date.now() - new Date(sessionRow.active_question_posed_at).getTime()) / 1000);
    if (secs >= 1) timeTaken = Math.min(secs, 1800);
  }

  await supabase.from('question_attempts').insert({
    student_id: input.studentId,
    question_id: question.id,
    session_id: input.sessionId,
    answer: answer.answer,
    is_correct: isCorrect,
    hints_used: hintsUsed,
    time_taken_seconds: timeTaken,
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
  let nextAction = selectStrategy(nextSignal);

  // Where this session stands now. The last planned question is a gentle "success" question;
  // after it the session wraps up instead of posing another.
  const answered = ctx.sessionPlan.done + 1;
  const target = ctx.sessionPlan.target;
  const finished = target !== null && answered >= target;
  const finalQuestion = target !== null && answered === target - 1;
  const historyNow = [...ctx.sessionPlan.history, { correct: isCorrect, hints: hintsUsed }];
  const triggeredNow = !ctx.sessionPlan.perfRecoveryLogged && historyNow.length >= 2 && shouldTriggerRecovery(historyNow);
  if (triggeredNow) {
    await supabase.from('recovery_events').insert({ student_id: input.studentId, session_id: input.sessionId, trigger: 'performance', details: { attemptsAtTrigger: answered } });
  }
  const gentlerNext = ctx.sessionPlan.gentler || triggeredNow;
  if (finished) nextAction = 'REVIEW';

  // If the next strategy calls for a question, pose it in this same turn
  // rather than waiting for a separate free-text round trip — this is what
  // makes difficulty adaptation feel immediate rather than only shifting on
  // the next full state reload. nextDifficulty() blends a one-step-up/down
  // response to this specific answer with the mastery-band baseline.
  let questionToPose: TutorTurnContext['questionToPose'];
  let activeQuestion: OrchestratorTurnResult['activeQuestion'];
  let nextTurnDifficulty = ctx.difficulty;
  if (QUESTION_STRATEGIES.includes(nextAction) && !finished) {
    nextTurnDifficulty = nextDifficulty({ previousDifficulty: question.difficulty, isCorrect, masteryScore: updatedMastery.score, trend: ctx.trend });
    if (/\(Basic\)/i.test(ctx.subjectName)) nextTurnDifficulty = Math.min(3, nextTurnDifficulty);
    if (gentlerNext) nextTurnDifficulty = Math.max(1, nextTurnDifficulty - 1);
    // The closing question should be one the student can succeed at.
    if (finalQuestion) nextTurnDifficulty = Math.max(1, Math.min(nextTurnDifficulty, 3) - 1);
    const { data: recentAttempts } = await supabase
      .from('question_attempts')
      .select('question_id')
      .eq('student_id', input.studentId)
      .order('created_at', { ascending: false })
      .limit(5);
    const nextQuestion = await selectQuestion(supabase, aiProvider, {
      skillId: question.skill_id,
      skillName: ctx.skillName,
      subjectName: ctx.subjectName,
      masteryScore: updatedMastery.score,
      difficulty: nextTurnDifficulty,
      learningObjective: ctx.learningObjectiveText,
      recentMisconceptions: misconceptionTag ? [misconceptionTag] : [],
      recentQuestionIds: (recentAttempts ?? []).map((a) => a.question_id),
    });
    questionToPose = { prompt: nextQuestion.prompt, options: nextQuestion.options };
    activeQuestion = {
      id: nextQuestion.id,
      prompt: nextQuestion.prompt,
      questionType: nextQuestion.questionType,
      options: nextQuestion.options,
      figureUrl: nextQuestion.figureUrl,
      figureCaption: nextQuestion.figureCaption,
      inputKind: inputKindOf(nextQuestion.questionType, nextQuestion.expectedAnswer),
    };
  }

  const diagram = getLearningDiagram(ctx.skillSlug) ?? undefined;
  const replyLanguage = (await loadLangPrefs(supabase, input.studentId)).learning;
  const prompt = buildTutorPrompt({
    replyLanguage,
    skillName: ctx.skillName,
    learningObjective: ctx.learningObjectiveText,
    strategy: nextAction,
    difficulty: nextTurnDifficulty,
    masteryBand: updatedMastery.band,
    masteryScore: updatedMastery.score,
    evaluationFeedback: `${isCorrect ? 'Correct' : 'Incorrect'}. ${feedbackText}`,
    questionToPose,
    diagramCaption: diagram?.caption,
    scaffoldNote: finished ? undefined : scaffoldNote({ masteryScore: updatedMastery.score, history: historyNow, strategy: nextAction }),
    sessionNote: finished
      ? "That was the student's last planned question. Wrap up in 2-3 short sentences: one thing they did well, one thing to practise next. Do NOT ask a new question."
      : finalQuestion
        ? 'The next question is the final one of this session; keep the tone encouraging.'
        : gentlerNext
          ? 'Keep this turn calm and encouraging; take smaller steps.'
          : undefined,
    lastMessages: ctx.lastMessages,
    studentMessage: `(submitted answer: ${JSON.stringify(answer.answer)})`,
  });
  const completion = await aiProvider.complete({ systemPrompt: prompt.system, userMessage: prompt.user, feature: 'tutor' });

  await supabase.from('messages').insert({ session_id: input.sessionId, role: 'student', content: `Answer: ${JSON.stringify(answer.answer)}` });
  await supabase.from('messages').insert({ session_id: input.sessionId, role: 'tutor', content: completion.text, strategy: nextAction });
  await supabase
    .from('learning_sessions')
    .update({ active_question_id: activeQuestion?.id ?? null, hint_count_for_active_question: 0, active_question_posed_at: activeQuestion ? new Date().toISOString() : null })
    .eq('id', input.sessionId);

  return {
    tutorMessage: completion.text,
    strategyUsed: ctx.strategy,
    evaluation: { isCorrect, misconceptionTag },
    updatedMastery: { skillId: question.skill_id, score: updatedMastery.score },
    nextAction,
    activeQuestion,
    diagram,
    plan: { done: answered, target, finalQuestion, finished, gentler: gentlerNext },
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
